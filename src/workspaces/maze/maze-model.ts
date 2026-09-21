import { GridCoord } from '@/algorithms/maze/types'
import { CellVisualInfo, MazePreset } from './types'

export type ModelChangeListener = () => void

export class MazeModel {
    private rows: number
    private cols: number
    private grid: number[][] // 0: passable, -1: wall
    private start: GridCoord | null = null
    private goal: GridCoord | null = null
    private visualInfo = new Map<string, CellVisualInfo>()
    private version: number = 0
    private listeners: ModelChangeListener[] = []
    private currentPath: GridCoord[] | null = null

    constructor(
        rows: number = 15,
        cols: number = 15,
        start: GridCoord | null = null,
        goal: GridCoord | null = null
    ) {
        this.rows = rows
        this.cols = cols
        this.start = start ? { ...start } : null
        this.goal = goal ? { ...goal } : null
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(0))
    }

    public addChangeListener(listener: ModelChangeListener): () => void {
        this.listeners.push(listener)
        return () => {
            const idx = this.listeners.indexOf(listener)
            if (idx !== -1) this.listeners.splice(idx, 1)
        }
    }

    private notifyChange(): void {
        this.version++
        for (const l of this.listeners) {
            l()
        }
    }

    public getVersion(): number {
        return this.version
    }

    public getRows(): number {
        return this.rows
    }

    public getCols(): number {
        return this.cols
    }

    public getGrid(): number[][] {
        return this.grid.map((row) => [...row])
    }

    public getStart(): GridCoord | null {
        return this.start ? { ...this.start } : null
    }

    public getGoal(): GridCoord | null {
        return this.goal ? { ...this.goal } : null
    }

    public isWall(r: number, c: number): boolean {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true
        return this.grid[r][c] === -1
    }

    public setStart(r: number | null, c: number | null): void {
        if (r === null || c === null) {
            this.start = null
        } else {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
            this.start = { r, c }
            this.grid[r][c] = 0 // ensure start is passable
        }
        this.resetVisualInfo()
        this.notifyChange()
    }

    public setGoal(r: number | null, c: number | null): void {
        if (r === null || c === null) {
            this.goal = null
        } else {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
            this.goal = { r, c }
            this.grid[r][c] = 0 // ensure goal is passable
        }
        this.resetVisualInfo()
        this.notifyChange()
    }

    public swapStartGoal(): void {
        const tmp = this.start
        this.start = this.goal
        this.goal = tmp
        this.resetVisualInfo()
        this.notifyChange()
    }

    public toggleWall(r: number, c: number): void {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
        if (
            (this.start && r === this.start.r && c === this.start.c) ||
            (this.goal && r === this.goal.r && c === this.goal.c)
        ) {
            return
        }

        this.grid[r][c] = this.grid[r][c] === 0 ? -1 : 0
        this.resetVisualInfo()
        this.notifyChange()
    }

    public setWallState(r: number, c: number, isWall: boolean): void {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
        if (
            (this.start && r === this.start.r && c === this.start.c) ||
            (this.goal && r === this.goal.r && c === this.goal.c)
        ) {
            return
        }

        this.grid[r][c] = isWall ? -1 : 0
        this.resetVisualInfo()
        this.notifyChange()
    }

    public resize(newRows: number, newCols: number): void {
        const clampedRows = Math.max(5, Math.min(30, newRows))
        const clampedCols = Math.max(5, Math.min(30, newCols))

        if (clampedRows === this.rows && clampedCols === this.cols) return

        const newGrid = Array.from({ length: clampedRows }, (_, r) =>
            Array.from({ length: clampedCols }, (_, c) => {
                if (r < this.rows && c < this.cols) {
                    return this.grid[r][c]
                }
                return 0
            })
        )

        this.rows = clampedRows
        this.cols = clampedCols
        this.grid = newGrid

        // Bounds check start and goal
        if (
            this.start &&
            (this.start.r >= this.rows || this.start.c >= this.cols)
        ) {
            this.start = null
        }
        if (
            this.goal &&
            (this.goal.r >= this.rows || this.goal.c >= this.cols)
        ) {
            this.goal = null
        }
        if (this.start) this.grid[this.start.r][this.start.c] = 0
        if (this.goal) this.grid[this.goal.r][this.goal.c] = 0

        this.resetVisualInfo()
        this.notifyChange()
    }

    public clearWalls(): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = 0
            }
        }
        this.resetVisualInfo()
        this.notifyChange()
    }

    public loadPreset(preset: MazePreset): void {
        this.rows = preset.rows
        this.cols = preset.cols
        this.start = null
        this.goal = null
        this.grid = preset.grid.map((row) => [...row])
        this.resetVisualInfo()
        this.notifyChange()
    }

    public getObstacleRatio(): number {
        let walls = 0
        const total = this.rows * this.cols
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) walls++
            }
        }
        return total > 0 ? walls / total : 0
    }

    // --- Visual Information ---

    public getVisualInfo(r: number, c: number): CellVisualInfo | undefined {
        return this.visualInfo.get(`${r},${c}`)
    }

    public setVisualInfo(
        r: number,
        c: number,
        info: Partial<CellVisualInfo>
    ): void {
        const key = `${r},${c}`
        const existing = this.visualInfo.get(key) || {}
        this.visualInfo.set(key, { ...existing, ...info })
    }

    public setPath(path: GridCoord[] | null): void {
        this.currentPath = path ? [...path] : null
    }

    public getPath(): GridCoord[] | null {
        return this.currentPath
    }

    public resetVisualInfo(): void {
        this.visualInfo.clear()
        this.currentPath = null
        // Initialize start and goal indicators if set
        if (this.start) {
            this.setVisualInfo(this.start.r, this.start.c, { isStart: true })
        }
        if (this.goal) {
            this.setVisualInfo(this.goal.r, this.goal.c, { isGoal: true })
        }
    }
}
