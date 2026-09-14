export interface PathDisplayOptions<T> {
    container: HTMLElement
    itemFormatter?: (item: T, index: number, total: number) => string
    separator?: string
    emptyText?: string
    notFoundText?: string
    pathColorVar?: string
}

export class PathDisplay<T> {
    private container: HTMLElement
    private itemFormatter: (item: T, index: number, total: number) => string
    private separator: string
    private emptyText: string
    private notFoundText: string
    private pathColorVar: string

    constructor(options: PathDisplayOptions<T>) {
        this.container = options.container
        this.itemFormatter = options.itemFormatter ?? ((item) => `${item}`)
        this.separator =
            options.separator ??
            ' <span style="color: var(--color-text-muted);">-></span> '
        this.emptyText = options.emptyText ?? '—'
        this.notFoundText =
            options.notFoundText ??
            '<span style="color: #f43f5e;">Шлях не знайдено</span>'
        this.pathColorVar = options.pathColorVar ?? 'var(--color-node-path)'
        this.reset()
    }

    public setPath(path: T[]): void {
        if (!path || path.length === 0) {
            this.container.innerHTML = this.emptyText
            return
        }

        this.container.innerHTML = path
            .map(
                (item, i) =>
                    `<span class="font-bold" style="color: ${this.pathColorVar};">${this.itemFormatter(
                        item,
                        i,
                        path.length
                    )}</span>`
            )
            .join(this.separator)
    }

    public setNotFound(): void {
        this.container.innerHTML = this.notFoundText
    }

    public reset(): void {
        this.container.innerHTML = this.emptyText
    }
}
