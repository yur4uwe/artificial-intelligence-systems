import roadsParamsHtml from './params-tab.html?raw'
import { UKRAINE_CITIES } from '../presets'

export interface RoadsUIOptions {
    container: HTMLElement
    onFitView: () => void
    onToggleMap: (show: boolean) => void
    onStartChange: (startCity: string) => void
    onGoalChange: (goalCity: string) => void
    onSwapStartGoal: () => void
}

export class RoadsParamsTab {
    private container: HTMLElement
    private options: RoadsUIOptions

    private btnFitView!: HTMLButtonElement
    private checkShowMap!: HTMLInputElement
    private startSelect!: HTMLSelectElement
    private goalSelect!: HTMLSelectElement
    private btnSwap!: HTMLButtonElement

    constructor(options: RoadsUIOptions) {
        this.container = options.container
        this.options = options

        this.render()
        this.populateCityDropdowns()
        this.attachEvents()
    }

    private render(): void {
        this.container.innerHTML = roadsParamsHtml

        this.btnFitView = this.container.querySelector('#roads-btn-fit-view')!
        this.checkShowMap = this.container.querySelector(
            '#roads-check-show-map'
        )!
        this.startSelect = this.container.querySelector('#roads-start-select')!
        this.goalSelect = this.container.querySelector('#roads-goal-select')!
        this.btnSwap = this.container.querySelector('#roads-btn-swap')!
    }

    private populateCityDropdowns(): void {
        const sortedCities = [...UKRAINE_CITIES].sort((a, b) =>
            a.localeCompare(b, 'uk')
        )

        const cityOptions = sortedCities
            .map((c) => `<option value="${c}">${c}</option>`)
            .join('')

        this.startSelect.innerHTML = cityOptions
        this.goalSelect.innerHTML = cityOptions

        // Default: Kyiv to Lviv
        this.startSelect.value = 'Київ'
        this.goalSelect.value = 'Львів'
    }

    private attachEvents(): void {
        this.btnFitView.addEventListener('click', () => {
            this.options.onFitView()
        })

        this.checkShowMap.addEventListener('change', () => {
            this.options.onToggleMap(this.checkShowMap.checked)
        })

        this.startSelect.addEventListener('change', () => {
            this.options.onStartChange(this.startSelect.value)
        })

        this.goalSelect.addEventListener('change', () => {
            this.options.onGoalChange(this.goalSelect.value)
        })

        this.btnSwap.addEventListener('click', () => {
            this.options.onSwapStartGoal()
        })
    }

    public syncStart(cityName: string): void {
        if (cityName) {
            this.startSelect.value = cityName
        }
    }

    public syncGoal(cityName: string): void {
        if (cityName) {
            this.goalSelect.value = cityName
        }
    }

    public updateCityList(
        cities: string[],
        currentStart?: string,
        currentGoal?: string
    ): void {
        const sortedCities = ['-- Не вибрано --', ...cities].sort((a, b) =>
            a.localeCompare(b, 'uk')
        )
        const cityOptions = sortedCities
            .map((c) => `<option value="${c}">${c}</option>`)
            .join('')
        this.startSelect.innerHTML = cityOptions
        this.goalSelect.innerHTML = cityOptions
        if (currentStart) this.startSelect.value = currentStart
        if (currentGoal) this.goalSelect.value = currentGoal
    }

    public getStartCity(): string {
        return this.startSelect.value
    }

    public getGoalCity(): string {
        return this.goalSelect.value
    }
}
