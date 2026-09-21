import { GridCoord, coordKey } from '@/algorithms/maze/types'
import { CellVisualInfo, MazePreset } from './types'

export type ModelChangeListener = () => void

export class MazeModel {
    private rows: number
    private cols: number
    private grid: number[][] // 0: passable, -1: wall
    private start: GridCoord
    private goal: GridCoord
    private visualInfo = new Map<string, CellVisualInfo>()
    private version: number = 0
    private listeners: ModelChangeListener[] = []

    constructor(
        rows: number = 15,
        cols: number = 15,
        start: GridCoord = { r: 1, c: 1 },
        goal: GridCoord = { r: 13, c: 13 }
    ) {
        this.rows = rows
        this.cols = cols
        this.start = { ...start }
        this.goal = { ...goal }
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

    public getStart(): GridCoord {
        return { ...this.start }
    }

    public getGoal(): GridCoord {
        return { ...this.goal }
    }

    public isWall(r: number, c: number): boolean {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true
        return this.grid[r][c] === -1
    }

    public setStart(r: number, c: number): void {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
        this.start = { r, c }
        this.grid[r][c] = 0 // ensure start is passable
        this.resetVisualInfo()
        this.notifyChange()
    }

    public setGoal(r: number, c: number): void {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
        this.goal = { r, c }
        this.grid[r][c] = 0 // ensure goal is passable
        this.resetVisualInfo()
        this.notifyChange()
    }

    public swapStartGoal(): void {
        const tmp = { ...this.start }
        this.start = { ...this.goal }
        this.goal = tmp
        this.resetVisualInfo()
        this.notifyChange()
    }

    public toggleWall(r: number, c: number): void {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return
        if (
            (r === this.start.r && c === this.start.c) ||
            (r === this.goal.r && c === this.goal.c)
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
            (r === this.start.r && c === this.start.c) ||
            (r === this.goal.r && c === this.goal.c)
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

        // Ensure start and goal within bounds
        this.start = {
            r: Math.min(this.start.r, this.rows - 1),
            c: Math.min(this.start.c, this.cols - 1),
        }
        this.goal = {
            r: Math.min(this.goal.r, this.rows - 1),
            c: Math.min(this.goal.c, this.cols - 1),
        }
        this.grid[this.start.r][this.start.c] = 0
        this.grid[this.goal.r][this.goal.c] = 0

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

    public randomizeWalls(density: number = 0.25): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (
                    (r === this.start.r && c === this.start.c) ||
                    (r === this.goal.r && c === this.goal.c)
                ) {
                    this.grid[r][c] = 0
                } else {
                    this.grid[r][c] = Math.random() < density ? -1 : 0
                }
            }
        }
        this.resetVisualInfo()
        this.notifyChange()
    }

    public invertWalls(): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (
                    (r === this.start.r && c === this.start.c) ||
                    (r === this.goal.r && c === this.goal.c)
                ) {
                    this.grid[r][c] = 0
                } else {
                    this.grid[r][c] = this.grid[r][c] === 0 ? -1 : 0
                }
            }
        }
        this.resetVisualInfo()
        this.notifyChange()
    }

    public loadPreset(preset: MazePreset): void {
        this.rows = preset.rows
        this.cols = preset.cols
        this.start = { ...preset.start }
        this.goal = { ...preset.goal }
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

    public setVisualInfo(r: number, c: number, info: Partial<CellVisualInfo>): void {
        const key = `${r},${c}`
        const existing = this.visualInfo.get(key) || {}
        this.visualInfo.set(key, { ...existing, ...info })
    }

    public resetVisualInfo(): void {
        this.visualInfo.clear()
        // Initialize start and goal indicators
        this.setVisualInfo(this.start.r, this.start.c, { isStart: true })
        this.setVisualInfo(this.goal.r, this.goal.c, { isGoal: true })
    }
}
