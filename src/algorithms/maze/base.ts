import { RunnableAlgorithm } from '@common/engine/search-runner'
import {
    GridCoord,
    MazeMetrics,
    MazeSearchOptions,
    MazeStepEvent,
    TransitionOperator,
    addCoords,
    coordKey,
    isCoordInGrid,
} from './types'

export abstract class BaseMazeSearch implements RunnableAlgorithm<MazeStepEvent> {
    protected options: MazeSearchOptions
    protected generator: Generator<MazeStepEvent, void, unknown> | null = null
    protected metrics: MazeMetrics | null = null
    protected isDone: boolean = false
    protected benchmarkCache = new Map<string, number>()

    constructor(options: MazeSearchOptions) {
        this.options = {
            ...options,
            grid: options.grid.map((row) => [...row]),
        }
    }

    public step(): MazeStepEvent | null {
        if (this.isDone) {
            return null
        }

        if (!this.generator) {
            this.generator = this.generateSteps()
        }

        const next = this.generator.next()
        if (next.done) {
            this.isDone = true
            return null
        }

        const stepEvent = next.value
        if (stepEvent.status === 'found' || stepEvent.status === 'not-found') {
            this.isDone = true
        }

        return stepEvent
    }

    public reset(): void {
        this.generator = null
        this.metrics = null
        this.isDone = false
    }

    public isFinished(): boolean {
        return this.isDone
    }

    public getMetrics(): MazeMetrics | null {
        return this.metrics
    }

    public clearBenchmarkCache(): void {
        this.benchmarkCache.clear()
    }

    public getOptions(): MazeSearchOptions {
        return {
            ...this.options,
            grid: this.options.grid.map((row) => [...row]),
        }
    }

    public setOptions(options: Partial<MazeSearchOptions>): void {
        this.benchmarkCache.clear()
        if (options.grid) {
            this.options.grid = options.grid.map((row) => [...row])
        }
        if (options.start) this.options.start = { ...options.start }
        if (options.goal) this.options.goal = { ...options.goal }
        if (options.operator) this.options.operator = options.operator
        this.reset()
    }

    public getNeighbors(
        cell: GridCoord,
        operator: TransitionOperator
    ): GridCoord[] {
        const { grid } = this.options
        const rows = grid.length
        if (rows === 0) return []
        const cols = grid[0].length

        let deltas: [number, number][] = []
        switch (operator) {
            case 'orthogonal':
                deltas = [
                    [-1, 0], // Up
                    [1, 0], // Down
                    [0, -1], // Left
                    [0, 1], // Right
                ]
                break
            case 'diagonal':
                deltas = [
                    [-1, -1], // Top-Left
                    [-1, 1], // Top-Right
                    [1, -1], // Bottom-Left
                    [1, 1], // Bottom-Right
                ]
                break
            case 'all':
                deltas = [
                    [-1, 0], // Up
                    [0, 1], // Right
                    [1, 0], // Down
                    [0, -1], // Left
                    [-1, -1], // Top-Left
                    [-1, 1], // Top-Right
                    [1, 1], // Bottom-Right
                    [1, -1], // Bottom-Left
                ]
                break
            default:
                let _exhaustiveCheck: never = operator
                break
        }

        const neighbors: GridCoord[] = []
        for (const [dr, dc] of deltas) {
            const newCoord = addCoords(cell, { r: dr, c: dc })
            if (!isCoordInGrid(newCoord, rows, cols)) {
                continue
            }

            // Must be passable (0)
            if (grid[newCoord.r][newCoord.c] === 0) {
                neighbors.push(newCoord)
            }
        }
        return neighbors
    }

    public reconstructPath(
        goal: GridCoord,
        parentMap: Map<string, GridCoord>
    ): GridCoord[] {
        const path: GridCoord[] = []
        let curr: GridCoord | undefined = goal
        while (curr !== undefined) {
            path.unshift(curr)
            curr = parentMap.get(coordKey(curr))
        }
        return path
    }

    public abstract runPure(): {
        foundPath: GridCoord[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
        meetingPoint?: GridCoord | null
    }

    public benchmark(iterations: number = 200): number {
        const { grid, start, goal, operator } = this.options
        const rows = grid.length
        const cols = grid[0]?.length ?? 0
        const key = `${rows}x${cols}_${start.r},${start.c}_${goal.r},${goal.c}_${operator}`

        const cached = this.benchmarkCache.get(key)
        if (cached !== undefined) {
            return cached
        }

        // JIT warm-up
        for (let i = 0; i < 15; i++) {
            this.runPure()
        }

        const t0 = performance.now()
        for (let i = 0; i < iterations; i++) {
            this.runPure()
        }
        const totalMs = performance.now() - t0
        const avgDurationMs = totalMs / iterations

        this.benchmarkCache.set(key, avgDurationMs)
        return avgDurationMs
    }

    protected abstract generateSteps(): Generator<MazeStepEvent, void, unknown>
}
