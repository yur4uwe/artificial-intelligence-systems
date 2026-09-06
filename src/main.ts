import './style.css';
import { LABS_REGISTRY } from './labs/registry';
import { LabModule } from './types';
import { downloadFile, exportCanvasToPNG } from './common/graph/export-utils';
import { applyThemeToCss, onThemeChange } from './common/theme/palette';

class App {
    private activeLabId: string | null = null;
    private activeLabModule: LabModule | null = null;
    private container: HTMLElement;
    private tabsNav: HTMLElement;
    private loadingOverlay: HTMLElement;

    constructor() {
        // Initialize CSS variables from theme
        applyThemeToCss();

        this.container = document.querySelector('#lab-container')!;
        this.tabsNav = document.querySelector('#lab-tabs-nav')!;
        this.loadingOverlay = document.querySelector('#loading-overlay')!;

        this.renderTabs();
        this.attachHeaderEvents();

        // Listen to theme changes to keep header and tabs synchronized
        onThemeChange(() => {
            this.updateTabStyles();
        });

        // Default load first lab
        if (LABS_REGISTRY.length > 0) {
            this.switchLab(LABS_REGISTRY[0].id);
        } else {
            alert('No labs available');
        }
    }

    private renderTabs(): void {
        this.tabsNav.innerHTML = LABS_REGISTRY.map(lab => `
      <button 
        data-lab-id="${lab.id}" 
        class="lab-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2"
      >
        <span>${lab.shortTitle}</span>
      </button>
    `).join('');

        this.updateTabStyles();

        this.tabsNav.querySelectorAll('.lab-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = (e.currentTarget as HTMLElement).getAttribute('data-lab-id');
                if (target && target !== this.activeLabId) {
                    this.switchLab(target);
                }
            });
        });
    }

    private async switchLab(labId: string): Promise<void> {
        const manifest = LABS_REGISTRY.find(l => l.id === labId);
        if (!manifest) return;

        // 1. Unmount existing lab
        if (this.activeLabModule) {
            this.activeLabModule.unmount();
            this.activeLabModule = null;
            this.container.innerHTML = '';
        }

        this.activeLabId = labId;
        this.updateTabStyles();

        // 2. Show loading overlay during lazy dynamic import
        this.loadingOverlay.classList.remove('hidden');

        try {
            // 3. Lazyload the lab module dynamically
            const labModule = await manifest.loader();
            this.activeLabModule = labModule;

            // 4. Mount lab
            await labModule.mount(this.container);
        } catch (err) {
            console.error(`Failed to load lab ${labId}:`, err);
            this.container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-rose-400">
          <p class="font-semibold mb-2">Помилка завантаження модуля лабораторної</p>
          <p class="text-xs font-mono" style="color: var(--color-text-muted);">${String(err)}</p>
        </div>
      `;
        } finally {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    private updateTabStyles(): void {
        this.tabsNav.querySelectorAll<HTMLElement>('.lab-tab-btn').forEach(btn => {
            const id = btn.getAttribute('data-lab-id');
            if (id === this.activeLabId) {
                btn.style.backgroundColor = 'var(--color-accent-primary)';
                btn.style.color = '#ffffff';
                btn.style.boxShadow = '0 0 16px var(--color-accent-primary-glow)';
                btn.style.fontWeight = '600';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--color-text-secondary)';
                btn.style.boxShadow = 'none';
                btn.style.fontWeight = '500';
            }
        });
    }

    private attachHeaderEvents(): void {
        const screenShotBtn = document.querySelector('#btn-export-screenshot');
        if (screenShotBtn) {
            screenShotBtn.addEventListener('click', () => {
                if (!this.activeLabModule) {
                    console.warn('No active lab module');
                    return;
                }
                if (!this.activeLabModule.exportScreenshot) {
                    console.warn('Lab does not support screenshot export');
                    return;
                }
                const canvas = this.activeLabModule.exportScreenshot();
                if (!canvas) {
                    console.warn('Failed to export screenshot');
                    return;
                }
                exportCanvasToPNG(canvas, `${this.activeLabId}-screenshot-${Date.now()}.png`);
            });
        }

        const exportDataBtn = document.querySelector('#btn-export-data');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                if (!this.activeLabModule) {
                    console.warn('No active lab module');
                    return;
                }
                if (!this.activeLabModule.exportData) {
                    console.warn('Lab does not support data export');
                    return;
                }
                const data = this.activeLabModule.exportData();
                if (data) {
                    downloadFile(data.content, data.filename, data.mimeType);
                }
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});
