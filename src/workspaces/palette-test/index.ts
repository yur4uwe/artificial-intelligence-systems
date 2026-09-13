import { WorkspaceModule, WorkspaceContext } from '@/types'
import {
    ThemePalette,
    getActiveTheme,
    setActiveTheme,
    onThemeChange,
    PRESET_THEMES,
} from '@common/theme/palette'
import { CALM_MINIMAL_DARK_THEME } from '@common/theme/available/calm_minimal_dark'
import { PaletteSpecimensRenderer } from './specimen-renderer'
import templateHtml from './palette-test.html?raw'

export default class PaletteTest implements WorkspaceModule {
    public id = 'palette-test-workspace'

    private container!: HTMLElement
    private unsubscribeTheme?: () => void

    // Canvases
    private nodeCanvas!: HTMLCanvasElement
    private edgeCanvas!: HTMLCanvasElement
    private miniGraphCanvas!: HTMLCanvasElement

    // Dynamic containers
    private presetSelect!: HTMLSelectElement
    private infoPill!: HTMLElement
    private surfacesGrid!: HTMLElement
    private typographySpecimen!: HTMLElement
    private toastEl!: HTMLElement
    private toastTimer: any = null

    public async mount(context: WorkspaceContext): Promise<void> {
        context.setSidebarVisible(false)
        this.container = context.canvasContainer
        this.container.innerHTML = templateHtml

        this.cacheElements()
        this.populatePresetSelect()
        this.attachEvents()
        this.renderAllSpecimens()

        // Subscribe to theme updates
        this.unsubscribeTheme = onThemeChange(() => {
            this.renderAllSpecimens()
        })
    }

    public onResize(): void {
        this.renderAllCanvases()
    }

    public async unmount(): Promise<void> {
        if (this.unsubscribeTheme) {
            this.unsubscribeTheme()
        }
    }

    public exportScreenshot(): HTMLCanvasElement | null {
        return this.miniGraphCanvas || null
    }

    public exportData(): {
        filename: string
        content: string
        mimeType: string
    } {
        const theme = getActiveTheme()
        return {
            filename: `theme-${theme.id}-${Date.now()}.json`,
            content: JSON.stringify(theme, null, 2),
            mimeType: 'application/json',
        }
    }

    // --- DOM Elements Caching ---

    private cacheElements(): void {
        this.nodeCanvas = this.container.querySelector('#pt-canvas-nodes')!
        this.edgeCanvas = this.container.querySelector('#pt-canvas-edges')!
        this.miniGraphCanvas = this.container.querySelector(
            '#pt-canvas-minigraph'
        )!
        this.presetSelect = this.container.querySelector('#pt-preset-select')!
        this.infoPill = this.container.querySelector('#pt-theme-info-pill')!
        this.surfacesGrid = this.container.querySelector('#pt-surfaces-grid')!
        this.typographySpecimen = this.container.querySelector(
            '#pt-typography-specimen'
        )!
        this.toastEl = this.container.querySelector('#pt-toast')!
    }

    private populatePresetSelect(): void {
        const currentTheme = getActiveTheme()
        this.presetSelect.innerHTML = PRESET_THEMES.map(
            (p) => `
            <option value="${p.id}" ${p.id === currentTheme.id ? 'selected' : ''}>${p.name}</option>
        `
        ).join('')
    }

    private attachEvents(): void {
        // 1. Preset Selector change
        this.presetSelect.addEventListener('change', () => {
            const found = PRESET_THEMES.find(
                (p) => p.id === this.presetSelect.value
            )
            if (found) {
                setActiveTheme(found)
                this.showToast(`Застосовано UI палітру: ${found.name}`)
            }
        })

        // 2. Copy JSON
        this.container
            .querySelector('#pt-btn-copy-json')
            ?.addEventListener('click', () => {
                const json = JSON.stringify(getActiveTheme(), null, 2)
                navigator.clipboard.writeText(json).then(() => {
                    this.showToast(
                        'JSON поточної палітри скопійовано в буфер обміну!'
                    )
                })
            })

        // 3. Reset Theme
        this.container
            .querySelector('#pt-btn-reset-theme')
            ?.addEventListener('click', () => {
                setActiveTheme(CALM_MINIMAL_DARK_THEME)
                this.presetSelect.value = 'calm-dark'
                this.showToast('Палітру скинуто до Calm Minimal Dark')
            })
    }

    // --- Dynamic Rendering of All UI & Canvas Specimens ---

    private renderAllSpecimens(): void {
        const theme = getActiveTheme()

        // 1. Update preset selector and info pill
        if (this.presetSelect && this.presetSelect.value !== theme.id) {
            this.presetSelect.value = theme.id
        }
        if (this.infoPill) {
            this.infoPill.innerHTML = `Active UI Palette: <span class="font-bold" style="color: var(--color-accent-primary);">${theme.name}</span>`
        }

        const viewportLabel = this.container.querySelector('#pt-viewport-label')
        if (viewportLabel) {
            viewportLabel.textContent = `Canvas Viewport Area (bgApp: ${theme.ui.bgApp})`
        }

        // 2. Render Artboard 02: Surfaces Grid
        this.renderSurfacesGrid(theme)

        // 3. Render Artboard 03: Typography Specimen
        this.renderTypographySpecimen(theme)

        // 4. Render Canvases
        this.renderAllCanvases()

        // 5. Render Swatches
        this.syncTokenSwatchesUI()
    }

    private renderSurfacesGrid(theme: ThemePalette): void {
        if (!this.surfacesGrid) return
        this.surfacesGrid.innerHTML = `
          <!-- Level 0 -->
          <div class="rounded-xl border p-4 flex flex-col justify-between h-40 shadow-sm" style="background-color: var(--color-bg-app); border-color: var(--color-border-subtle);">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider" style="color: var(--color-text-muted);">Level 0</span>
                <span class="w-3 h-3 rounded-full" style="background-color: var(--color-bg-app); border: 1px solid var(--color-border-muted);"></span>
              </div>
              <h4 class="text-xs font-bold" style="color: var(--color-text-primary);">App Background</h4>
              <p class="text-[11px] mt-1" style="color: var(--color-text-muted);">Базовий бекграунд додатку та робочого простору</p>
            </div>
            <code class="text-[11px] font-mono px-2 py-1 rounded" style="background-color: var(--color-bg-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle);">
              bgApp: ${theme.ui.bgApp}
            </code>
          </div>

          <!-- Level 1 -->
          <div class="rounded-xl border p-4 flex flex-col justify-between h-40 shadow-md" style="background-color: var(--color-bg-surface); border-color: var(--color-border-subtle);">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider" style="color: var(--color-text-muted);">Level 1</span>
                <span class="w-3 h-3 rounded-full" style="background-color: var(--color-bg-surface); border: 1px solid var(--color-border-muted);"></span>
              </div>
              <h4 class="text-xs font-bold" style="color: var(--color-text-primary);">Surface Card</h4>
              <p class="text-[11px] mt-1" style="color: var(--color-text-muted);">Панелі параметрів, сайдбари та контейнери</p>
            </div>
            <code class="text-[11px] font-mono px-2 py-1 rounded" style="background-color: var(--color-bg-elevated); color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle);">
              bgSurface: ${theme.ui.bgSurface}
            </code>
          </div>

          <!-- Level 2 -->
          <div class="rounded-xl border p-4 flex flex-col justify-between h-40 shadow-lg" style="background-color: var(--color-bg-elevated); border-color: var(--color-border-muted);">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider" style="color: var(--color-accent-primary);">Level 2</span>
                <span class="w-3 h-3 rounded-full" style="background-color: var(--color-bg-elevated); border: 1px solid var(--color-border-muted);"></span>
              </div>
              <h4 class="text-xs font-bold" style="color: var(--color-text-primary);">Elevated Surface</h4>
              <p class="text-[11px] mt-1" style="color: var(--color-text-muted);">Картки метрик, поля вводу, акцентні блоки</p>
            </div>
            <code class="text-[11px] font-mono px-2 py-1 rounded" style="background-color: var(--color-bg-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border-muted);">
              bgElevated: ${theme.ui.bgSurfaceElevated}
            </code>
          </div>

          <!-- Level 3 -->
          <div class="rounded-xl border p-4 flex flex-col justify-between h-40 shadow-xl backdrop-blur-md" style="background-color: var(--color-bg-header); border-color: var(--color-border-subtle);">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider" style="color: var(--color-accent-primary);">Level 3</span>
                <span class="w-3 h-3 rounded-full" style="background-color: var(--color-bg-header); border: 1px solid var(--color-border-muted);"></span>
              </div>
              <h4 class="text-xs font-bold" style="color: var(--color-text-primary);">Header & Overlay</h4>
              <p class="text-[11px] mt-1" style="color: var(--color-text-muted);">Навігаційні шапки, модальні вікна з блюром</p>
            </div>
            <code class="text-[11px] font-mono px-2 py-1 rounded" style="background-color: var(--color-bg-app); color: var(--color-text-secondary); border: 1px solid var(--color-border-subtle);">
              bgHeader: ${theme.ui.bgHeader}
            </code>
          </div>
        `
    }

    private renderTypographySpecimen(theme: ThemePalette): void {
        if (!this.typographySpecimen) return
        this.typographySpecimen.innerHTML = `
          <div>
            <span class="text-[10px] font-mono block" style="color: var(--color-text-muted);">textPrimary (${theme.ui.textPrimary})</span>
            <span class="text-sm font-bold" style="color: var(--color-text-primary);">Головний заголовок</span>
          </div>
          <div>
            <span class="text-[10px] font-mono block" style="color: var(--color-text-muted);">textSecondary (${theme.ui.textSecondary})</span>
            <span class="text-xs font-medium" style="color: var(--color-text-secondary);">Допоміжний текст та мітки</span>
          </div>
          <div>
            <span class="text-[10px] font-mono block" style="color: var(--color-text-muted);">textMuted (${theme.ui.textMuted})</span>
            <span class="text-xs" style="color: var(--color-text-muted);">Приглушений опис і таймштампи</span>
          </div>
          <div>
            <span class="text-[10px] font-mono block" style="color: var(--color-text-muted);">accentPrimary (${theme.ui.accentPrimary})</span>
            <span class="text-xs font-semibold" style="color: var(--color-accent-primary);">Акцентне виділення</span>
          </div>
        `
    }

    private renderAllCanvases(): void {
        const theme = getActiveTheme()
        if (this.nodeCanvas) {
            PaletteSpecimensRenderer.renderNodeSpecimens(this.nodeCanvas, theme)
        }
        if (this.edgeCanvas) {
            PaletteSpecimensRenderer.renderEdgeSpecimens(this.edgeCanvas, theme)
        }
        if (this.miniGraphCanvas) {
            PaletteSpecimensRenderer.renderMiniGraph(
                this.miniGraphCanvas,
                theme
            )
        }
    }

    // --- Swatch Matrix Display ---

    private syncTokenSwatchesUI(): void {
        const theme = getActiveTheme()

        // 1. UI Tokens
        const uiTokens = [
            { key: 'ui.bgApp', label: 'bgApp', color: theme.ui.bgApp },
            { key: 'ui.bgHeader', label: 'bgHeader', color: theme.ui.bgHeader },
            {
                key: 'ui.bgSurface',
                label: 'bgSurface',
                color: theme.ui.bgSurface,
            },
            {
                key: 'ui.bgSurfaceElevated',
                label: 'bgElevated',
                color: theme.ui.bgSurfaceElevated,
            },
            {
                key: 'ui.borderSubtle',
                label: 'borderSubtle',
                color: theme.ui.borderSubtle,
            },
            {
                key: 'ui.borderMuted',
                label: 'borderMuted',
                color: theme.ui.borderMuted,
            },
            {
                key: 'ui.textPrimary',
                label: 'textPrimary',
                color: theme.ui.textPrimary,
            },
            {
                key: 'ui.textSecondary',
                label: 'textSecondary',
                color: theme.ui.textSecondary,
            },
            {
                key: 'ui.textMuted',
                label: 'textMuted',
                color: theme.ui.textMuted,
            },
            {
                key: 'ui.accentPrimary',
                label: 'accentPrimary',
                color: theme.ui.accentPrimary,
            },
            {
                key: 'ui.accentPrimaryHover',
                label: 'accentHover',
                color: theme.ui.accentPrimaryHover,
            },
            {
                key: 'ui.accentPrimaryGlow',
                label: 'accentGlow',
                color: theme.ui.accentPrimaryGlow,
            },
        ]

        // 2. Graph Canvas & Edges
        const graphTokens = [
            {
                key: 'graph.background',
                label: 'Canvas Bg',
                color: theme.graph.background,
            },
            {
                key: 'graph.grid',
                label: 'Canvas Grid',
                color: theme.graph.grid,
            },
            {
                key: 'graph.selectionOutline',
                label: 'Selection Ring',
                color: theme.graph.selectionOutline,
            },
            {
                key: 'graph.tempEdgeLine',
                label: 'Temp Line',
                color: theme.graph.tempEdgeLine,
            },
            {
                key: 'graph.edges.idle',
                label: 'Edge Idle',
                color: theme.graph.edges.idle,
            },
            {
                key: 'graph.edges.active',
                label: 'Edge Active',
                color: theme.graph.edges.active,
            },
            {
                key: 'graph.edges.traversed',
                label: 'Edge Traversed',
                color: theme.graph.edges.traversed,
            },
            {
                key: 'graph.edges.path',
                label: 'Edge Path',
                color: theme.graph.edges.path,
            },
        ]

        // 3. Graph Node States
        const nodeTokens = [
            {
                key: 'nodes.idle.stroke',
                label: 'Node Idle',
                color: theme.graph.nodes.idle.stroke,
            },
            {
                key: 'nodes.start.stroke',
                label: 'Node Start',
                color: theme.graph.nodes.start.stroke,
            },
            {
                key: 'nodes.goal.stroke',
                label: 'Node Goal',
                color: theme.graph.nodes.goal.stroke,
            },
            {
                key: 'nodes.current.stroke',
                label: 'Node Current',
                color: theme.graph.nodes.current.stroke,
            },
            {
                key: 'nodes.inQueue.stroke',
                label: 'Node inQueue',
                color: theme.graph.nodes.inQueue.stroke,
            },
            {
                key: 'nodes.visited.stroke',
                label: 'Node Visited',
                color: theme.graph.nodes.visited.stroke,
            },
            {
                key: 'nodes.path.stroke',
                label: 'Node Path',
                color: theme.graph.nodes.path.stroke,
            },
        ]

        this.renderSwatchGrid('#pt-swatches-ui', uiTokens)
        this.renderSwatchGrid('#pt-swatches-graph', graphTokens)
        this.renderSwatchGrid('#pt-swatches-nodes', nodeTokens)
    }

    private renderSwatchGrid(
        selector: string,
        tokens: Array<{ key: string; label: string; color: string }>
    ): void {
        const container = this.container.querySelector(selector)
        if (!container) return

        container.innerHTML = tokens
            .map(
                (t) => `
          <div class="border rounded-xl p-2.5 flex flex-col gap-2 transition group relative" style="background-color: var(--color-bg-app); border-color: var(--color-border-muted);">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold truncate" style="color: var(--color-text-primary);" title="${t.key}">${t.label}</span>
              <button data-copy-hex="${t.color}" title="Копіювати значення" class="text-[10px] opacity-60 group-hover:opacity-100 transition" style="color: var(--color-text-muted);">
                📋
              </button>
            </div>

            <div class="w-full h-8 rounded-lg border shadow-inner" style="background-color: ${t.color}; border-color: var(--color-border-subtle);"></div>

            <span class="text-[10px] font-mono truncate" style="color: var(--color-text-muted);" title="${t.color}">
              ${t.color}
            </span>
          </div>
        `
            )
            .join('')

        // Attach copy button handlers
        container.querySelectorAll('button[data-copy-hex]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-copy-hex')
                if (val) {
                    navigator.clipboard.writeText(val).then(() => {
                        this.showToast(`Скопійовано: ${val}`)
                    })
                }
            })
        })
    }

    private showToast(message: string): void {
        if (!this.toastEl) return
        const msgEl = this.toastEl.querySelector('#pt-toast-msg')
        if (msgEl) msgEl.textContent = message

        this.toastEl.classList.remove('hidden')
        if (this.toastTimer) clearTimeout(this.toastTimer)
        this.toastTimer = setTimeout(() => {
            this.toastEl.classList.add('hidden')
        }, 2400)
    }
}
