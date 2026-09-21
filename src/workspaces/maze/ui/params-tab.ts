import { TransitionOperator, GridCoord } from '@/algorithms/maze/types'
import { MazePreset } from '../types'
import paramsTabHtml from './params-tab.html?raw'

export type MazeAlgorithmType = 'wave-uni' | 'wave-bi'

export interface MazeParamsTabOptions {
    container: HTMLElement
    presets: MazePreset[]
    onAlgorithmChange: (algo: MazeAlgorithmType) => void
    onOperatorChange: (op: TransitionOperator) => void
    onPresetChange: (presetId: string) => void
    onDimensionsChange: (rows: number, cols: number) => void
    onSwapStartGoal: () => void
}

export class MazeParamsTab {
    private container: HTMLElement
    private options: MazeParamsTabOptions

    private algoSelect!: HTMLSelectElement
    private operatorRadios!: NodeListOf<HTMLInputElement>
    private presetSelect!: HTMLSelectElement
    private dimensionsLabel!: HTMLElement
    private inputRows!: HTMLInputElement
    private inputCols!: HTMLInputElement
    private startCoordEl!: HTMLElement
    private goalCoordEl!: HTMLElement

    constructor(options: MazeParamsTabOptions) {
        this.container = options.container
        this.options = options

        this.render()
        this.attachEvents()
    }

    private render(): void {
        this.container.innerHTML = paramsTabHtml

        this.algoSelect = this.container.querySelector(
            '#maze-algorithm-select'
        )!
        this.operatorRadios = this.container.querySelectorAll(
            'input[name="maze-operator"]'
        )
        this.presetSelect = this.container.querySelector('#maze-preset-select')!
        this.dimensionsLabel = this.container.querySelector(
            '#maze-grid-dimensions-label'
        )!
        this.inputRows = this.container.querySelector('#maze-input-rows')!
        this.inputCols = this.container.querySelector('#maze-input-cols')!
        this.startCoordEl = this.container.querySelector('#maze-start-coord')!
        this.goalCoordEl = this.container.querySelector('#maze-goal-coord')!

        // Populate Presets
        this.presetSelect.innerHTML = this.options.presets
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join('')
    }

    private attachEvents(): void {
        this.algoSelect.addEventListener('change', () => {
            this.options.onAlgorithmChange(
                this.algoSelect.value as MazeAlgorithmType
            )
        })

        this.operatorRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.options.onOperatorChange(
                        radio.value as TransitionOperator
                    )
                }
            })
        })

        this.presetSelect.addEventListener('change', () => {
            this.options.onPresetChange(this.presetSelect.value)
        })

        const handleDimChange = () => {
            const rows = parseInt(this.inputRows.value, 10) || 15
            const cols = parseInt(this.inputCols.value, 10) || 15
            this.options.onDimensionsChange(rows, cols)
        }

        this.inputRows.addEventListener('change', handleDimChange)
        this.inputCols.addEventListener('change', handleDimChange)

        this.container
            .querySelector('#maze-btn-order-10')
            ?.addEventListener('click', () => {
                this.inputRows.value = '10'
                this.inputCols.value = '10'
                this.options.onDimensionsChange(10, 10)
            })

        this.container
            .querySelector('#maze-btn-order-15')
            ?.addEventListener('click', () => {
                this.inputRows.value = '15'
                this.inputCols.value = '15'
                this.options.onDimensionsChange(15, 15)
            })

        this.container
            .querySelector('#maze-btn-order-20')
            ?.addEventListener('click', () => {
                this.inputRows.value = '20'
                this.inputCols.value = '20'
                this.options.onDimensionsChange(20, 20)
            })

        this.container
            .querySelector('#maze-btn-swap')
            ?.addEventListener('click', () => {
                this.options.onSwapStartGoal()
            })
    }

    public updateStartGoalDisplay(
        start: GridCoord | null,
        goal: GridCoord | null
    ): void {
        this.startCoordEl.textContent = start
            ? `(${start.r}, ${start.c})`
            : '— Не вибрано —'
        this.goalCoordEl.textContent = goal
            ? `(${goal.r}, ${goal.c})`
            : '— Не вибрано —'
    }

    public updateDimensionsDisplay(rows: number, cols: number): void {
        this.dimensionsLabel.textContent = `${rows} × ${cols}`
        this.inputRows.value = `${rows}`
        this.inputCols.value = `${cols}`
    }

    public setAlgorithm(algo: MazeAlgorithmType): void {
        this.algoSelect.value = algo
    }
}
