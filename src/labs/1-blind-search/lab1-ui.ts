import { NeighborSortingStrategy } from '../../common/graph/graph-model';
import { CanvasInteractionMode } from '../../common/graph/canvas-renderer';

export interface Lab1UIOptions {
    container: HTMLElement;
    onPresetChange: (presetKey: 'tree' | 'undirected' | 'directed') => void;
    onStartChange: (startId: number) => void;
    onGoalChange: (goalId: number) => void;
    onSwapStartGoal: () => void;
    onSortingChange: (strategy: NeighborSortingStrategy) => void;
    onInteractionModeChange: (mode: CanvasInteractionMode) => void;
    onFitView: () => void;
    onResetView: () => void;
}

export class Lab1UI {
    private container: HTMLElement;
    private options: Lab1UIOptions;

    private presetSelect!: HTMLSelectElement;
    private startSelect!: HTMLSelectElement;
    private goalSelect!: HTMLSelectElement;
    private btnSwap!: HTMLButtonElement;
    private modeRadios!: NodeListOf<HTMLInputElement>;
    private orderRadios!: NodeListOf<HTMLInputElement>;

    constructor(options: Lab1UIOptions) {
        this.container = options.container;
        this.options = options;

        this.render();
        this.attachEvents();
    }

    private render(): void {
        this.container.innerHTML = `
      <div class="flex flex-col gap-4 text-xs">
        <!-- Preset Selector -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <label class="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
            <span>Вихідний граф (≥30 вершин):</span>
          </label>
          <select id="l1-preset-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:ring-1 focus:ring-blue-500 outline-none">
            <option value="tree">1. Дерево (32 вершини, 5 рівнів гілок)</option>
            <option value="undirected">2. Звичайний граф (32 вершини, цикли)</option>
            <option value="directed">3. Орієнтований граф (32 вершини, дуги)</option>
          </select>
        </div>

        <!-- Start & Goal Selection -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <div class="flex items-center justify-between mb-2">
            <span class="text-slate-300 font-semibold">Початкова та Цільова вершини</span>
            <button id="l1-btn-swap" title="Дзеркальна заміна Start <-> Goal" class="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-medium transition active:scale-95">
              <span>Поміняти</span>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-[11px] text-emerald-400 block mb-1 font-medium">● Початкова (S):</span>
              <select id="l1-start-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono outline-none">
                <!-- Populated dynamically -->
              </select>
            </div>

            <div>
              <span class="text-[11px] text-rose-400 block mb-1 font-medium">● Цільова (G):</span>
              <select id="l1-goal-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono outline-none">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>
        </div>

        <!-- Traversal Order Strategy (Lab Requirement) -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
          <span class="text-slate-300 font-semibold block mb-2">Порядок обходу суміжних вершин:</span>
          <div class="flex flex-col gap-1.5 text-[11px] text-slate-300">
            <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <input type="radio" name="neighbor-order" value="ascending-id" checked class="accent-blue-500">
              <span>За зростанням ID (<code class="text-blue-400 font-mono">1 → 2 → 3...</code>)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <input type="radio" name="neighbor-order" value="descending-id" class="accent-blue-500">
              <span>За спаданням ID (<code class="text-blue-400 font-mono">...3 → 2 → 1</code>)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-8 00/50">
              <input type="radio" name="neighbor-order" value="clockwise" class="accent-blue-500">
              <span>За годинниковою стрілкою (Геометрично)</span>
            </label>
          </div>
        </div>
      </div>
    `;

        this.presetSelect = this.container.querySelector('#l1-preset-select')!;
        this.startSelect = this.container.querySelector('#l1-start-select')!;
        this.goalSelect = this.container.querySelector('#l1-goal-select')!;
        this.btnSwap = this.container.querySelector('#l1-btn-swap')!;
        this.modeRadios = this.container.querySelectorAll('input[name="canvas-mode"]');
        this.orderRadios = this.container.querySelectorAll('input[name="neighbor-order"]');
    }

    private attachEvents(): void {
        this.presetSelect.addEventListener('change', () => {
            this.options.onPresetChange(this.presetSelect.value as 'tree' | 'undirected' | 'directed');
        });

        this.startSelect.addEventListener('change', () => {
            this.options.onStartChange(parseInt(this.startSelect.value, 10));
        });

        this.goalSelect.addEventListener('change', () => {
            this.options.onGoalChange(parseInt(this.goalSelect.value, 10));
        });

        this.btnSwap.addEventListener('click', () => {
            this.options.onSwapStartGoal();
        });

        this.orderRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.options.onSortingChange(radio.value as NeighborSortingStrategy);
                }
            });
        });

        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.options.onInteractionModeChange(radio.value as CanvasInteractionMode);
                }
            });
        });

        this.container.querySelector('#l1-btn-fit')?.addEventListener('click', () => {
            this.options.onFitView();
        });

        this.container.querySelector('#l1-btn-reset-view')?.addEventListener('click', () => {
            this.options.onResetView();
        });
    }

    public updateNodeSelects(nodeIds: number[], currentStart: number, currentGoal: number): void {
        this.startSelect.innerHTML = nodeIds
            .map(id => `<option value="${id}" ${id === currentStart ? 'selected' : ''}>Вершина v${id}</option>`)
            .join('');

        this.goalSelect.innerHTML = nodeIds
            .map(id => `<option value="${id}" ${id === currentGoal ? 'selected' : ''}>Вершина v${id}</option>`)
            .join('');
    }

    public setStart(id: number): void {
        this.startSelect.value = `${id}`;
    }

    public setGoal(id: number): void {
        this.goalSelect.value = `${id}`;
    }

    public setInteractionMode(mode: CanvasInteractionMode): void {
        this.modeRadios.forEach(radio => {
            radio.checked = radio.value === mode;
        });
    }
}
