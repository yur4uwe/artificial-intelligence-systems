import { LabMetrics, StepEvent } from '../../types';

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
        this.container.innerHTML = `
      <div class="flex flex-col gap-4 text-xs">
        <!-- Status Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <div class="flex items-center justify-between mb-2">
            <span class="text-slate-400 font-medium">Статус пошуку:</span>
            <span id="mp-status-badge" class="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-slate-800 text-slate-300">
              Очікування запуску
            </span>
          </div>
          
          <div class="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80">
            <span class="text-slate-400 block mb-1">Знайдений шлях:</span>
            <div id="mp-path-display" class="font-mono text-xs text-sky-300 break-words font-medium min-h-[1.5rem]">
              —
            </div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span class="text-slate-400 block text-[11px]">Довжина шляху:</span>
            <span id="mp-path-length" class="text-lg font-bold text-slate-100 font-mono">0</span>
            <span class="text-[10px] text-slate-400 ml-1">ребер</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span class="text-slate-400 block text-[11px]">Розкрито вершин:</span>
            <span id="mp-opened-nodes" class="text-lg font-bold text-emerald-400 font-mono">0</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span class="text-slate-400 block text-[11px]">Кількість циклів:</span>
            <span id="mp-cycles" class="text-lg font-bold text-amber-400 font-mono">0</span>
          </div>

          <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span class="text-slate-400 block text-[11px]">Час виконання:</span>
            <span id="mp-exec-time" class="text-lg font-bold text-blue-400 font-mono">0.00</span>
            <span class="text-[10px] text-slate-400 ml-1">мс</span>
          </div>
        </div>

        <!-- Live Queue / Frontier Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <div class="flex items-center justify-between mb-2">
            <span class="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>Черга вершин (FIFO)</span>
            </span>
            <span id="mp-queue-count" class="text-[11px] text-slate-400">0 елементів</span>
          </div>
          <div id="mp-queue-chips" class="flex flex-wrap gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 min-h-[2.5rem] max-h-24 overflow-y-auto items-center">
            <span class="text-slate-400 text-xs italic">Черга порожня</span>
          </div>
        </div>

        <!-- Step Trace Log -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex-1 flex flex-col min-h-[160px] max-h-[220px]">
          <div class="flex items-center justify-between mb-2">
            <span class="text-slate-300 font-semibold">Протокол кроків (Trace Log)</span>
          </div>
          <div id="mp-log-list" class="flex-1 overflow-y-auto font-mono text-[11px] flex flex-col gap-1 pr-1">
            <div class="text-slate-400 italic">Журнал пошуку з'явиться після запуску...</div>
          </div>
        </div>
      </div>
    `;

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
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30';
                this.statusBadge.textContent = 'Виконується...';
                break;

            case 'found':
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                this.statusBadge.textContent = 'Ціль досягнуто';
                break;

            case 'not-found':
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/30';
                this.statusBadge.textContent = 'Шлях не існує';
                break;

            default:
                this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-slate-800 text-slate-300';
                this.statusBadge.textContent = 'Очікування запуску';
                break;
        }

        // Update numbers
        this.openedNodesVal.textContent = `${event.openedCount}`;
        this.cyclesVal.textContent = `${event.cycleCount}`;

        // Update Path if found
        if (event.foundPath && event.foundPath.length > 0) {
            this.pathDisplay.innerHTML = event.foundPath
                .map((id, i) => `<span class="text-sky-300 font-bold">${id}</span>${i < event.foundPath!.length - 1 ? ' <span class="text-slate-400">→</span> ' : ''}`)
                .join('');
            this.pathLengthVal.textContent = `${event.foundPath.length - 1}`;
        } else if (event.status === 'not-found') {
            this.pathDisplay.innerHTML = '<span class="text-rose-400">Шлях не знайдено</span>';
            this.pathLengthVal.textContent = '0';
        }

        // Update Live Queue Chips
        const countEl = this.container.querySelector('#mp-queue-count');
        if (countEl) countEl.textContent = `${event.queue.length} елементів`;

        if (event.queue.length === 0) {
            this.queueContainer.innerHTML = '<span class="text-slate-400 text-xs italic">Черга порожня</span>';
        } else {
            this.queueContainer.innerHTML = event.queue
                .map(id => `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-800 text-sky-300 border border-slate-700 shadow-sm">
            v${id}
          </span>
        `).join('');
        }

        // Append to Log List
        if (event.actionDescription) {
            const logItem = document.createElement('div');
            logItem.className = 'p-1 rounded bg-slate-950/60 border border-slate-800/60 flex items-start gap-1.5 text-slate-300';
            logItem.innerHTML = `
        <span class="text-blue-400 font-bold shrink-0">#${event.stepIndex}</span>
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
        this.statusBadge.className = 'px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-slate-800 text-slate-300';
        this.statusBadge.textContent = 'Очікування запуску';
        this.pathDisplay.textContent = '—';
        this.pathLengthVal.textContent = '0';
        this.openedNodesVal.textContent = '0';
        this.cyclesVal.textContent = '0';
        this.timeVal.textContent = '0.00';
        this.queueContainer.innerHTML = '<span class="text-slate-400 text-xs italic">Черга порожня</span>';
        this.logList.innerHTML = '<div class="text-slate-400 italic">Журнал пошуку з\'явиться після запуску...</div>';
    }
}
