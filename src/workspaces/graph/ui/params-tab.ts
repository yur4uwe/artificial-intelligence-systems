import { NeighborSortingStrategy } from '../graph-model'
import { CanvasInteractionMode } from '../drawing/canvas-renderer'
import graphParamsHtml from './params-tab.html?raw'

export type GraphAlgorithmType = 'bfs' | 'dfs'

export interface GraphWorkspaceUIOptions {
    container: HTMLElement
    onAlgorithmChange: (algorithm: GraphAlgorithmType) => void
    onPresetChange: (presetKey: 'tree' | 'undirected' | 'directed') => void
    onStartChange: (startId: number | null) => void
    onGoalChange: (goalId: number | null) => void
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
            const val = this.startSelect.value
            this.options.onStartChange(val ? parseInt(val, 10) : null)
        })

        this.goalSelect.addEventListener('change', () => {
            const val = this.goalSelect.value
            this.options.onGoalChange(val ? parseInt(val, 10) : null)
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
        currentStart: number | null,
        currentGoal: number | null
    ): void {
        const placeholderStart = `<option value="" ${currentStart === null ? 'selected' : ''}>— Не вибрано —</option>`
        const placeholderGoal = `<option value="" ${currentGoal === null ? 'selected' : ''}>— Не вибрано —</option>`

        this.startSelect.innerHTML =
            placeholderStart +
            nodeIds
                .map(
                    (id) =>
                        `<option value="${id}" ${id === currentStart ? 'selected' : ''}>Вершина v${id}</option>`
                )
                .join('')

        this.goalSelect.innerHTML =
            placeholderGoal +
            nodeIds
                .map(
                    (id) =>
                        `<option value="${id}" ${id === currentGoal ? 'selected' : ''}>Вершина v${id}</option>`
                )
                .join('')
    }

    public setStart(id: number | null): void {
        this.startSelect.value = id !== null ? `${id}` : ''
    }

    public setGoal(id: number | null): void {
        this.goalSelect.value = id !== null ? `${id}` : ''
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
