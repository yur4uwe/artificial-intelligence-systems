import '@/style.css'
import { WRKSPC_REGISTRY } from '@wrkspc/registry'
import { WorkspaceModule, WorkspaceContext } from '@/types'
import { downloadFile, exportCanvasToPNG } from '@wrkspc/graph/export-utils'
import { applyThemeToCss, onThemeChange } from '@common/theme/palette'

class App {
    private activeWorkspaceId: string | null = null
    private activeWorkspaceModule: WorkspaceModule | null = null

    private tabsNav: HTMLElement
    private loadingOverlay: HTMLElement
    private canvasContainer: HTMLElement
    private playbackContainer: HTMLElement
    private appSidebar: HTMLElement
    private tabBtnParams: HTMLElement
    private tabBtnMetrics: HTMLElement
    private paramsPanel: HTMLElement
    private metricsPanel: HTMLElement

    constructor() {
        // Initialize CSS variables from theme
        applyThemeToCss()

        this.tabsNav = document.querySelector('#lab-tabs-nav')!
        this.loadingOverlay = document.querySelector('#loading-overlay')!
        this.canvasContainer = document.querySelector('#canvas-container')!
        this.playbackContainer = document.querySelector('#playback-container')!
        this.appSidebar = document.querySelector('#app-sidebar')!
        this.tabBtnParams = document.querySelector('#tab-btn-params')!
        this.tabBtnMetrics = document.querySelector('#tab-btn-metrics')!
        this.paramsPanel = document.querySelector('#sidebar-params-panel')!
        this.metricsPanel = document.querySelector('#sidebar-metrics-panel')!

        this.renderTabs()
        this.attachHeaderEvents()
        this.attachSidebarTabEvents()

        const resizeObserver = new ResizeObserver(() => {
            this.activeWorkspaceModule?.onResize?.()
        })
        resizeObserver.observe(this.canvasContainer)

        // Listen to theme changes to keep header and tabs synchronized
        onThemeChange(() => {
            this.updateTabStyles()
        })

        // Default load first lab
        if (WRKSPC_REGISTRY.length > 0) {
            this.switchLab(WRKSPC_REGISTRY[0].id)
        } else {
            alert('No labs available')
        }
    }

    private renderTabs(): void {
        this.tabsNav.innerHTML = WRKSPC_REGISTRY.map(
            (wrkspc) => `
      <button 
        data-lab-id="${wrkspc.id}" 
        class="lab-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2"
      >
        <span>${wrkspc.shortTitle}</span>
      </button>
    `
        ).join('')

        this.updateTabStyles()

        this.tabsNav.querySelectorAll('.lab-tab-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = (e.currentTarget as HTMLElement).getAttribute(
                    'data-lab-id'
                )
                if (target && target !== this.activeWorkspaceId) {
                    this.switchLab(target)
                }
            })
        })
    }

    private attachSidebarTabEvents(): void {
        this.tabBtnParams.addEventListener('click', () => {
            this.switchSidebarTab('params')
        })
        this.tabBtnMetrics.addEventListener('click', () => {
            this.switchSidebarTab('metrics')
        })
    }

    public switchSidebarTab(tab: 'params' | 'metrics'): void {
        if (tab === 'params') {
            this.tabBtnParams.style.backgroundColor = 'var(--color-bg-surface)'
            this.tabBtnParams.style.color = 'var(--color-text-primary)'
            this.tabBtnParams.style.borderColor = 'var(--color-border-muted)'
            this.tabBtnParams.classList.add('font-semibold')
            this.tabBtnParams.classList.remove('font-medium')

            this.tabBtnMetrics.style.backgroundColor = 'transparent'
            this.tabBtnMetrics.style.color = 'var(--color-text-secondary)'
            this.tabBtnMetrics.style.borderColor = 'transparent'
            this.tabBtnMetrics.classList.add('font-medium')
            this.tabBtnMetrics.classList.remove('font-semibold')

            this.paramsPanel.classList.remove('hidden')
            this.metricsPanel.classList.add('hidden')
        } else {
            this.tabBtnMetrics.style.backgroundColor = 'var(--color-bg-surface)'
            this.tabBtnMetrics.style.color = 'var(--color-text-primary)'
            this.tabBtnMetrics.style.borderColor = 'var(--color-border-muted)'
            this.tabBtnMetrics.classList.add('font-semibold')
            this.tabBtnMetrics.classList.remove('font-medium')

            this.tabBtnParams.style.backgroundColor = 'transparent'
            this.tabBtnParams.style.color = 'var(--color-text-secondary)'
            this.tabBtnParams.style.borderColor = 'transparent'
            this.tabBtnParams.classList.add('font-medium')
            this.tabBtnParams.classList.remove('font-semibold')

            this.metricsPanel.classList.remove('hidden')
            this.paramsPanel.classList.add('hidden')
        }
    }

    public setSidebarVisible(visible: boolean): void {
        if (visible) {
            this.appSidebar.classList.remove('hidden')
        } else {
            this.appSidebar.classList.add('hidden')
        }
    }

    private async switchLab(labId: string): Promise<void> {
        const manifest = WRKSPC_REGISTRY.find((l) => l.id === labId)
        if (!manifest) return

        // 1. Unmount existing workspace cleanly
        if (this.activeWorkspaceModule) {
            try {
                this.activeWorkspaceModule.unmount()
            } catch (e) {
                console.error('Error during workspace unmount:', e)
            }
            this.activeWorkspaceModule = null
        }

        this.activeWorkspaceId = labId
        this.updateTabStyles()

        // 2. Recreate canvas element to guarantee zero context/listener leaks
        this.canvasContainer.innerHTML =
            '<canvas id="app-canvas" class="w-full h-full block touch-none cursor-crosshair"></canvas>'
        const canvas = this.canvasContainer.querySelector(
            '#app-canvas'
        ) as HTMLCanvasElement

        // 3. Clear container contents and reset sidebar state
        this.playbackContainer.innerHTML = ''
        this.paramsPanel.innerHTML = ''
        this.metricsPanel.innerHTML = ''
        this.setSidebarVisible(true)
        this.switchSidebarTab('params')

        // 4. Show loading overlay during lazy dynamic import
        this.loadingOverlay.classList.remove('hidden')

        try {
            // 5. Lazy-load the workspace module dynamically
            const labModule = await manifest.loader()
            this.activeWorkspaceModule = labModule

            const context: WorkspaceContext = {
                canvas,
                canvasContainer: this.canvasContainer,
                playbackContainer: this.playbackContainer,
                paramsContainer: this.paramsPanel,
                metricsContainer: this.metricsPanel,
                sidebar: this.appSidebar,
                switchSidebarTab: (tab) => this.switchSidebarTab(tab),
                setSidebarVisible: (visible) => this.setSidebarVisible(visible),
            }

            // 6. Mount workspace with context
            await labModule.mount(context)
        } catch (err) {
            console.error(`Failed to load workspace ${labId}:`, err)
            this.canvasContainer.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-rose-400">
          <p class="font-semibold mb-2">Помилка завантаження модуля лабораторної</p>
          <p class="text-xs font-mono" style="color: var(--color-text-muted);">${String(err)}</p>
        </div>
      `
        } finally {
            this.loadingOverlay.classList.add('hidden')
        }
    }

    private updateTabStyles(): void {
        this.tabsNav
            .querySelectorAll<HTMLElement>('.lab-tab-btn')
            .forEach((btn) => {
                const id = btn.getAttribute('data-lab-id')
                if (id === this.activeWorkspaceId) {
                    btn.style.backgroundColor = 'var(--color-accent-primary)'
                    btn.style.color = '#ffffff'
                    btn.style.boxShadow =
                        '0 0 16px var(--color-accent-primary-glow)'
                    btn.style.fontWeight = '600'
                } else {
                    btn.style.backgroundColor = 'transparent'
                    btn.style.color = 'var(--color-text-secondary)'
                    btn.style.boxShadow = 'none'
                    btn.style.fontWeight = '500'
                }
            })
    }

    private attachHeaderEvents(): void {
        const screenShotBtn = document.querySelector('#btn-export-screenshot')
        if (screenShotBtn) {
            screenShotBtn.addEventListener('click', () => {
                if (!this.activeWorkspaceModule) {
                    console.warn('No active lab module')
                    return
                }
                const canvas = this.activeWorkspaceModule.exportScreenshot
                    ? this.activeWorkspaceModule.exportScreenshot()
                    : (this.canvasContainer.querySelector(
                          '#app-canvas'
                      ) as HTMLCanvasElement)

                if (!canvas) {
                    console.warn('Failed to export screenshot: no canvas found')
                    return
                }
                exportCanvasToPNG(
                    canvas,
                    `${this.activeWorkspaceId}-screenshot-${Date.now()}.png`
                )
            })
        }

        const exportDataBtn = document.querySelector('#btn-export-data')
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                if (!this.activeWorkspaceModule) {
                    console.warn('No active lab module')
                    return
                }
                if (!this.activeWorkspaceModule.exportData) {
                    console.warn('Lab does not support data export')
                    return
                }
                const data = this.activeWorkspaceModule.exportData()
                if (data) {
                    downloadFile(data.content, data.filename, data.mimeType)
                }
            })
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App()
})
