import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    MazeCellUpdate,
    areCoordsEqual,
    coordKey,
    isCoordInGrid as isCoordOnGrid,
} from './types'

export default class WaveUniBatchAlgorithm extends BaseMazeSearch {
    private frontier: GridCoord[] = []
    private parentMap: Map<string, GridCoord> = new Map()
    private visitedOrder: GridCoord[] = []

    // Flat 1D typed array for distances: -1 = unvisited/wall, >= 0 = distance
    private distGrid: Int16Array

    // Scalar counters
    private stepCounter: number = 0
    private cycleCounter: number = 0
    private openedCounter: number = 0

    private foundPath: GridCoord[] | null = null
    private isInitialized: boolean = false

    constructor(options: any) {
        super(options)
        this.distGrid = new Int16Array(this.rows * this.cols).fill(-1)
    }

    public runPure(): {
        foundPath: GridCoord[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
    } {
        const { grid, start, goal, operator } = this.options
        const rows = this.rows
        const cols = this.cols

        if (
            !isCoordOnGrid(start, rows, cols) ||
            !isCoordOnGrid(goal, rows, cols) ||
            grid[start.r][start.c] === -1 ||
            grid[goal.r][goal.c] === -1
        ) {
            return {
                foundPath: null,
                openedCount: 0,
                cyclesCount: 0,
                isSuccess: false,
            }
        }

        if (areCoordsEqual(start, goal)) {
            return {
                foundPath: [start],
                openedCount: 1,
                cyclesCount: 1,
                isSuccess: true,
            }
        }

        let frontier: GridCoord[] = [start]
        const visited = new Set<string>([coordKey(start)])
        const parentMap = new Map<string, GridCoord>()
        let cyclesCount = 0
        let openedCount = 0

        while (frontier.length > 0) {
            cyclesCount++
            const nextFrontier: GridCoord[] = []

            for (const current of frontier) {
                openedCount++
                const neighbors = this.getNeighbors(current, operator)
                for (const neighbor of neighbors) {
                    const key = coordKey(neighbor)
                    if (visited.has(key)) continue

                    visited.add(key)
                    parentMap.set(key, current)
                    nextFrontier.push(neighbor)

                    if (areCoordsEqual(neighbor, goal)) {
                        return {
                            foundPath: this.reconstructPath(goal, parentMap),
                            openedCount,
                            cyclesCount,
                            isSuccess: true,
                        }
                    }
                }
            }

            frontier = nextFrontier
        }

        return {
            foundPath: null,
            openedCount,
            cyclesCount,
            isSuccess: false,
        }
    }

    public step(): MazeStepEvent | null {
        if (this.isDone) {
            return null
        }

        // 1. Initial Step: validate boundaries and initialize start cell
        if (!this.isInitialized) {
            return this.initSearch()
        }

        // 2. Batch process current frontier
        if (this.frontier.length === 0) {
            return this.finalizeNotFound()
        }

        this.cycleCounter++
        const currentFrontier = this.frontier
        const nextFrontier: GridCoord[] = []
        const updatedCells: MazeCellUpdate[] = []
        let goalReached: GridCoord | null = null

        for (const current of currentFrontier) {
            this.openedCounter++
            const currentDist = this.getDist(current.r, current.c)
            const nextDist = currentDist + 1
            const neighbors = this.getNeighbors(current, this.options.operator)

            for (const neighbor of neighbors) {
                if (this.getDist(neighbor.r, neighbor.c) === -1) {
                    this.setDist(neighbor.r, neighbor.c, nextDist)
                    this.parentMap.set(coordKey(neighbor), current)
                    this.visitedOrder.push(neighbor)
                    nextFrontier.push(neighbor)
                    updatedCells.push({
                        coord: neighbor,
                        dist: nextDist,
                        wave: 'forward',
                    })

                    if (areCoordsEqual(neighbor, this.options.goal)) {
                        goalReached = neighbor
                        break
                    }
                }
            }

            if (goalReached) {
                break
            }
        }

        this.frontier = nextFrontier
        this.stepCounter++

        if (goalReached) {
            return this.finalizeFound(goalReached, updatedCells)
        }

        if (nextFrontier.length === 0) {
            return this.finalizeNotFound()
        }

        const nextDist =
            currentFrontier.length > 0
                ? this.getDist(currentFrontier[0].r, currentFrontier[0].c) + 1
                : this.cycleCounter

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [...nextFrontier],
            updatedCells,
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Хвильовий фронт d=${nextDist}: пакетно розкрито ${currentFrontier.length} клітинок, утворено новий фронт (${nextFrontier.length} клітинок).`,
            status: 'running',
        }
    }

    public reset(): void {
        this.isInitialized = false
        this.frontier = []
        this.parentMap.clear()
        this.visitedOrder = []
        this.distGrid.fill(-1)
        this.stepCounter = 0
        this.cycleCounter = 0
        this.openedCounter = 0
        this.metrics = null
        this.foundPath = null
        this.isDone = false
    }

    public getDist(r: number, c: number): number {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return -1
        return this.distGrid[r * this.cols + c]
    }

    public getFrontier(): ReadonlyArray<GridCoord> {
        return this.frontier
    }

    public getFoundPath(): GridCoord[] | null {
        return this.foundPath
    }

    private setDist(r: number, c: number, dist: number): void {
        this.distGrid[r * this.cols + c] = dist
    }

    private initSearch(): MazeStepEvent {
        this.isInitialized = true
        const { grid, start, goal, operator } = this.options
        const isStartInvalid =
            !isCoordOnGrid(start, this.rows, this.cols) ||
            grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordOnGrid(goal, this.rows, this.cols) ||
            grid[goal.r][goal.c] === -1

        if (isStartInvalid || isGoalInvalid) {
            this.isDone = true
            const reason = isStartInvalid
                ? `Початкова точка (${start.r}, ${start.c}) є перешкодою або поза межами`
                : `Цільова точка (${goal.r}, ${goal.c}) є перешкодою або поза межами`

            this.metrics = {
                foundPath: null,
                pathLength: 0,
                openedCellsCount: 0,
                cyclesCount: 0,
                executionTimeMs: 0,
                visitedOrder: [],
                isSuccess: false,
                statusText: `Помилка: ${reason}`,
            }

            return {
                stepIndex: 0,
                currentCell: null,
                frontier: [],
                openedCount: 0,
                cycleCount: 0,
                actionDescription: this.metrics.statusText,
                status: 'not-found',
            }
        }

        if (areCoordsEqual(start, goal)) {
            this.isDone = true
            const duration = this.benchmark()
            this.setDist(start.r, start.c, 0)
            this.foundPath = [start]

            this.metrics = {
                foundPath: [start],
                pathLength: 0,
                openedCellsCount: 1,
                cyclesCount: 1,
                executionTimeMs: duration,
                visitedOrder: [start],
                isSuccess: true,
                statusText: `Ціль (${goal.r}, ${goal.c}) співпадає з початковою точкою!`,
            }

            return {
                stepIndex: 0,
                currentCell: start,
                frontier: [],
                updatedCell: { coord: start, dist: 0, wave: 'forward' },
                openedCount: 1,
                cycleCount: 1,
                foundPath: [start],
                actionDescription: this.metrics.statusText,
                status: 'found',
            }
        }

        // Standard initialization: wavefront d=0
        this.setDist(start.r, start.c, 0)
        this.frontier = [start]
        this.visitedOrder.push(start)
        this.stepCounter = 1

        const opName =
            operator === 'orthogonal'
                ? '4-напрямковий'
                : operator === 'diagonal'
                  ? 'діагональний'
                  : '8-напрямковий'

        return {
            stepIndex: 1,
            currentCell: start,
            frontier: [...this.frontier],
            updatedCell: { coord: start, dist: 0, wave: 'forward' },
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Канонічний хвильовий пошук (${opName}). Ініціалізація стартового фронту d=0 у (${start.r}, ${start.c}).`,
            status: 'running',
        }
    }

    private finalizeFound(
        goal: GridCoord,
        updatedCells: MazeCellUpdate[]
    ): MazeStepEvent {
        this.isDone = true
        const path = this.reconstructPath(goal, this.parentMap)
        this.foundPath = path
        const duration = this.benchmark()

        this.metrics = {
            foundPath: path,
            pathLength: path.length - 1,
            openedCellsCount: this.openedCounter,
            cyclesCount: this.cycleCounter,
            executionTimeMs: duration,
            visitedOrder: this.visitedOrder,
            isSuccess: true,
            statusText: `Ціль (${goal.r}, ${goal.c}) знайдено! Довжина шляху: ${path.length - 1} кроків.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: goal,
            frontier: [...this.frontier],
            updatedCells,
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            foundPath: path,
            actionDescription: `Цільову клітинку досягнуто хвильовим фронтом! Побудовано найкоротший шлях довжиною ${path.length - 1} кроків.`,
            status: 'found',
        }
    }

    private finalizeNotFound(): MazeStepEvent {
        this.isDone = true
        const duration = this.benchmark()

        this.metrics = {
            foundPath: null,
            pathLength: 0,
            openedCellsCount: this.openedCounter,
            cyclesCount: this.cycleCounter,
            executionTimeMs: duration,
            visitedOrder: this.visitedOrder,
            isSuccess: false,
            statusText: `Шлях між (${this.options.start.r}, ${this.options.start.c}) та (${this.options.goal.r}, ${this.options.goal.c}) не існує. Хвильовий фронт вичерпано.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Пошук завершено безрезультатно. Хвильовий фронт згаснув, ціль недосяжна.`,
            status: 'not-found',
        }
    }
}
