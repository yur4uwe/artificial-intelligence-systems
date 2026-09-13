import { NeighborSortingStrategy } from './graph-model'
import { CanvasInteractionMode } from './drawing/canvas-renderer'
import graphParamsHtml from './params-tab.html?raw'

export type GraphAlgorithmType = 'bfs' | 'dfs'

export interface GraphWorkspaceUIOptions {
    container: HTMLElement
    onAlgorithmChange: (algorithm: GraphAlgorithmType) => void
    onPresetChange: (presetKey: 'tree' | 'undirected' | 'directed') => void
    onStartChange: (startId: number) => void
    onGoalChange: (goalId: number) => void
    onSwapStartGoal: () => void
    onSortingChange: (strategy: NeighborSortingStrategy) => void
    onInteractionModeChange: (mode: CanvasInteractionMode) => void
    onFitView: () => void
    onResetView: () => void
}

export class GraphParamsTab {
    private container: HTMLElement
    private options: GraphWorkspaceUIOptions

    private algorithmSelect!: HTMLSelectElement
    private presetSelect!: HTMLSelectElement
    private startSelect!: HTMLSelectElement
    private goalSelect!: HTMLSelectElement
    private btnSwap!: HTMLButtonElement
    private modeRadios!: NodeListOf<HTMLInputElement>
    private orderRadios!: NodeListOf<HTMLInputElement>

    constructor(options: GraphWorkspaceUIOptions) {
        this.container = options.container
        this.options = options

        this.render()
        this.attachEvents()
    }

    private render(): void {
        this.container.innerHTML = graphParamsHtml

        this.algorithmSelect = this.container.querySelector('#l1-algorithm-select')!
        this.presetSelect = this.container.querySelector('#l1-preset-select')!
        this.startSelect = this.container.querySelector('#l1-start-select')!
        this.goalSelect = this.container.querySelector('#l1-goal-select')!
        this.btnSwap = this.container.querySelector('#l1-btn-swap')!
        this.modeRadios = this.container.querySelectorAll(
            'input[name="canvas-mode"]'
        )
        this.orderRadios = this.container.querySelectorAll(
            'input[name="neighbor-order"]'
        )
    }

    private attachEvents(): void {
        this.algorithmSelect?.addEventListener('change', () => {
            this.options.onAlgorithmChange(
                this.algorithmSelect.value as GraphAlgorithmType
            )
        })

        this.presetSelect.addEventListener('change', () => {
            this.options.onPresetChange(
                this.presetSelect.value as 'tree' | 'undirected' | 'directed'
            )
        })

        this.startSelect.addEventListener('change', () => {
            this.options.onStartChange(parseInt(this.startSelect.value, 10))
        })

        this.goalSelect.addEventListener('change', () => {
            this.options.onGoalChange(parseInt(this.goalSelect.value, 10))
        })

        this.btnSwap.addEventListener('click', () => {
            this.options.onSwapStartGoal()
        })

        this.orderRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.options.onSortingChange(
                        radio.value as NeighborSortingStrategy
                    )
                }
            })
        })

        this.modeRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.options.onInteractionModeChange(
                        radio.value as CanvasInteractionMode
                    )
                }
            })
        })

        this.container
            .querySelector('#l1-btn-fit')
            ?.addEventListener('click', () => {
                this.options.onFitView()
            })

        this.container
            .querySelector('#l1-btn-reset-view')
            ?.addEventListener('click', () => {
                this.options.onResetView()
            })
    }

    public updateNodeSelects(
        nodeIds: number[],
        currentStart: number,
        currentGoal: number
    ): void {
        this.startSelect.innerHTML = nodeIds
            .map(
                (id) =>
                    `<option value="${id}" ${id === currentStart ? 'selected' : ''}>Вершина v${id}</option>`
            )
            .join('')

        this.goalSelect.innerHTML = nodeIds
            .map(
                (id) =>
                    `<option value="${id}" ${id === currentGoal ? 'selected' : ''}>Вершина v${id}</option>`
            )
            .join('')
    }

    public setStart(id: number): void {
        this.startSelect.value = `${id}`
    }

    public setGoal(id: number): void {
        this.goalSelect.value = `${id}`
    }

    public setInteractionMode(mode: CanvasInteractionMode): void {
        this.modeRadios.forEach((radio) => {
            radio.checked = radio.value === mode
        })
    }

    public setAlgorithm(algo: GraphAlgorithmType): void {
        if (this.algorithmSelect) {
            this.algorithmSelect.value = algo
        }
    }
}
