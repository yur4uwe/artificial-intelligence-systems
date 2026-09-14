export interface FrontierCardOptions<T> {
    chipsEl: HTMLElement
    titleEl?: HTMLElement | null
    countEl?: HTMLElement | null
    defaultTitle?: string
    emptyText?: string
    itemFormatter?: (item: T, index: number) => string
    countFormatter?: (count: number) => string
}

export class FrontierCard<T> {
    private chipsEl: HTMLElement
    private titleEl?: HTMLElement | null
    private countEl?: HTMLElement | null
    private emptyText: string
    private itemFormatter: (item: T, index: number) => string
    private countFormatter: (count: number) => string

    constructor(options: FrontierCardOptions<T>) {
        this.chipsEl = options.chipsEl
        this.titleEl = options.titleEl
        this.countEl = options.countEl
        this.emptyText = options.emptyText ?? 'Колекція порожня'
        this.itemFormatter = options.itemFormatter ?? ((item) => `${item}`)
        this.countFormatter =
            options.countFormatter ?? ((count) => `${count} елементів`)

        if (options.defaultTitle && this.titleEl) {
            this.titleEl.textContent = options.defaultTitle
        }
        this.reset()
    }

    public setTitle(title: string): void {
        if (this.titleEl) {
            this.titleEl.textContent = title
        }
    }

    public setItems(items: T[]): void {
        if (this.countEl) {
            this.countEl.textContent = this.countFormatter(items.length)
        }

        if (!items || items.length === 0) {
            this.chipsEl.innerHTML = `<span class="text-xs italic" style="color: var(--color-text-muted);">${this.emptyText}</span>`
            return
        }

        this.chipsEl.innerHTML = items
            .map(
                (item, index) => `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border shadow-sm" style="background-color: var(--color-bg-elevated); border-color: var(--color-border-muted); color: var(--color-node-queue);">
            ${this.itemFormatter(item, index)}
          </span>
        `
            )
            .join('')
    }

    public reset(): void {
        if (this.countEl) {
            this.countEl.textContent = this.countFormatter(0)
        }
        this.chipsEl.innerHTML = `<span class="text-xs italic" style="color: var(--color-text-muted);">${this.emptyText}</span>`
    }
}
