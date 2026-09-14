export interface StatCardOptions {
    valueEl: HTMLElement
    unitEl?: HTMLElement | null
    defaultValue?: string | number
    defaultUnit?: string
}

export class StatCard {
    private valueEl: HTMLElement
    private unitEl?: HTMLElement | null
    private defaultValue: string | number
    private defaultUnit: string

    constructor(options: StatCardOptions) {
        this.valueEl = options.valueEl
        this.unitEl = options.unitEl
        this.defaultValue = options.defaultValue ?? '0'
        this.defaultUnit = options.defaultUnit ?? ''
        this.reset()
    }

    public setValue(value: string | number, unit?: string): void {
        this.valueEl.textContent = `${value}`
        if (this.unitEl && unit !== undefined) {
            this.unitEl.textContent = unit
        }
    }

    public reset(): void {
        this.valueEl.textContent = `${this.defaultValue}`
        if (this.unitEl && this.defaultUnit !== undefined) {
            this.unitEl.textContent = this.defaultUnit
        }
    }
}
