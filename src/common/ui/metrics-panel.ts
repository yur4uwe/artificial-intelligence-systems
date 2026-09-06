import { LabMetrics, StepEvent } from '../../types';
import metricsPanelHtml from './metrics_panel.html?raw';

export class MetricsPanel {
    private container: HTMLElement;

    private statusBadge!: HTMLElement;
    private pathDisplay!: HTMLElement;
    private pathLengthVal!: HTMLElement;
    private openedNodesVal!: HTMLElement;
    private cyclesVal!: HTMLElement;
    private timeVal!: HTMLElement;
    private queueContainer!: HTMLElement;
    private logList!: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    private render(): void {
        this.container.innerHTML = metricsPanelHtml;

        this.statusBadge = this.container.querySelector('#mp-status-badge')!;
        this.pathDisplay = this.container.querySelector('#mp-path-display')!;
        this.pathLengthVal = this.container.querySelector('#mp-path-length')!;
        this.openedNodesVal = this.container.querySelector('#mp-opened-nodes')!;
        this.cyclesVal = this.container.querySelector('#mp-cycles')!;
        this.timeVal = this.container.querySelector('#mp-exec-time')!;
        this.queueContainer = this.container.querySelector('#mp-queue-chips')!;
        this.logList = this.container.querySelector('#mp-log-list')!;
    }

    public updateStep(event: StepEvent): void {
        switch (event.status) {
            case 'running':
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border';
                this.statusBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
                this.statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                this.statusBadge.style.color = '#f59e0b';
                this.statusBadge.textContent = 'Виконується...';
                break;

            case 'found':
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border';
                this.statusBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                this.statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                this.statusBadge.style.color = '#10b981';
                this.statusBadge.textContent = 'Ціль досягнуто';
                break;

            case 'not-found':
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border';
                this.statusBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.15)';
                this.statusBadge.style.borderColor = 'rgba(244, 63, 94, 0.35)';
                this.statusBadge.style.color = '#f43f5e';
                this.statusBadge.textContent = 'Шлях не існує';
                break;

            default:
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border';
                this.statusBadge.style.backgroundColor = 'var(--color-bg-elevated)';
                this.statusBadge.style.borderColor = 'var(--color-border-subtle)';
                this.statusBadge.style.color = 'var(--color-text-secondary)';
                this.statusBadge.textContent = 'Очікування запуску';
                break;
        }

        // Update numbers
        this.openedNodesVal.textContent = `${event.openedCount}`;
        this.cyclesVal.textContent = `${event.cycleCount}`;

        // Update Path if found
        if (event.foundPath && event.foundPath.length > 0) {
            this.pathDisplay.innerHTML = event.foundPath
                .map((id, i) => `<span class="font-bold" style="color: var(--color-node-path);">${id}</span>${i < event.foundPath!.length - 1 ? ' <span style="color: var(--color-text-muted);">-></span> ' : ''}`)
                .join('');
            this.pathLengthVal.textContent = `${event.foundPath.length - 1}`;
        } else if (event.status === 'not-found') {
            this.pathDisplay.innerHTML = '<span style="color: #f43f5e;">Шлях не знайдено</span>';
            this.pathLengthVal.textContent = '0';
        }

        // Update Live Queue Chips
        const countEl = this.container.querySelector('#mp-queue-count');
        if (countEl) countEl.textContent = `${event.queue.length} елементів`;

        if (event.queue.length === 0) {
            this.queueContainer.innerHTML = '<span class="text-xs italic" style="color: var(--color-text-muted);">Черга порожня</span>';
        } else {
            this.queueContainer.innerHTML = event.queue
                .map(id => `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border shadow-sm" style="background-color: var(--color-bg-elevated); border-color: var(--color-border-muted); color: var(--color-node-queue);">
            v${id}
          </span>
        `).join('');
        }

        // Append to Log List
        if (event.actionDescription) {
            const logItem = document.createElement('div');
            logItem.className = 'p-1.5 rounded border flex items-start gap-1.5';
            logItem.style.backgroundColor = 'var(--color-bg-surface)';
            logItem.style.borderColor = 'var(--color-border-subtle)';
            logItem.style.color = 'var(--color-text-primary)';
            logItem.innerHTML = `
        <span class="font-bold shrink-0 font-mono text-[10px]" style="color: var(--color-accent-primary);">#${event.stepIndex}</span>
        <span class="flex-1">${event.actionDescription}</span>
      `;
            this.logList.appendChild(logItem);
            this.logList.scrollTop = this.logList.scrollHeight;
        }
    }

    public setFinalMetrics(metrics: LabMetrics): void {
        this.timeVal.textContent = metrics.executionTimeMs.toFixed(2);
        if (metrics.foundPath) {
            this.pathLengthVal.textContent = `${metrics.pathLength}`;
        }
    }

    public reset(): void {
        this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border';
        this.statusBadge.style.backgroundColor = 'var(--color-bg-elevated)';
        this.statusBadge.style.borderColor = 'var(--color-border-subtle)';
        this.statusBadge.style.color = 'var(--color-text-secondary)';
        this.statusBadge.textContent = 'Очікування запуску';
        this.pathDisplay.textContent = '—';
        this.pathLengthVal.textContent = '0';
        this.openedNodesVal.textContent = '0';
        this.cyclesVal.textContent = '0';
        this.timeVal.textContent = '0.00';
        this.queueContainer.innerHTML = '<span class="text-xs italic" style="color: var(--color-text-muted);">Черга порожня</span>';
        this.logList.innerHTML = '<div class="italic" style="color: var(--color-text-muted);">Журнал пошуку з\'явиться після запуску...</div>';
    }
}
