export interface StepLogListOptions {
    container: HTMLElement
    placeholderText?: string
}

export class StepLogList {
    private container: HTMLElement
    private placeholderText: string
    private isEmpty: boolean = true

    constructor(options: StepLogListOptions | HTMLElement) {
        if (options instanceof HTMLElement) {
            this.container = options
            this.placeholderText = "Журнал пошуку з'явиться після запуску..."
        } else {
            this.container = options.container
            this.placeholderText =
                options.placeholderText ??
                "Журнал пошуку з'явиться після запуску..."
        }
        this.reset()
    }

    private createItemElement(
        stepIndex: number,
        actionDescription: string
    ): HTMLElement {
        const logItem = document.createElement('div')
        logItem.className =
            'p-1.5 rounded border flex items-start gap-1.5 shrink-0'
        logItem.style.backgroundColor = 'var(--color-bg-surface)'
        logItem.style.borderColor = 'var(--color-border-subtle)'
        logItem.style.color = 'var(--color-text-primary)'
        logItem.innerHTML = `
        <span class="font-bold shrink-0 font-mono text-[10px]" style="color: var(--color-accent-primary);">#${stepIndex}</span>
        <span class="flex-1 leading-snug">${actionDescription}</span>
      `
        return logItem
    }

    public append(stepIndex: number, actionDescription: string): void {
        if (this.isEmpty) {
            this.container.innerHTML = ''
            this.isEmpty = false
        }

        const logItem = this.createItemElement(stepIndex, actionDescription)
        this.container.appendChild(logItem)
        this.scrollToBottom()
    }

    public setItems(
        items: Array<{ stepIndex: number; actionDescription: string }>
    ): void {
        this.container.innerHTML = ''
        if (items.length === 0) {
            this.reset()
            return
        }
        this.isEmpty = false
        const fragment = document.createDocumentFragment()
        for (const item of items) {
            fragment.appendChild(
                this.createItemElement(item.stepIndex, item.actionDescription)
            )
        }
        this.container.appendChild(fragment)
        this.scrollToBottom()
    }

    public scrollToBottom(): void {
        this.container.scrollTop = this.container.scrollHeight
        requestAnimationFrame(() => {
            this.container.scrollTop = this.container.scrollHeight
        })
    }

    public reset(): void {
        this.isEmpty = true
        this.container.innerHTML = `<div class="italic placeholder-log py-1" style="color: var(--color-text-muted);">${this.placeholderText}</div>`
    }
}
