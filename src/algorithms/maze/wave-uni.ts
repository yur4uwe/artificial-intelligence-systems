import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    areCoordsEqual,
    coordKey,
    isCoordInGrid as isCoordOnGrid,
} from './types'

enum RunnerPhase {
    UNINITIALIZED,
    NEXT_CELL,
    EXPAND_NEIGHBOR,
    FINISHED,
}

export default class WaveUniAlgorithm extends BaseMazeSearch {
    // State machine
    private phase: RunnerPhase = RunnerPhase.UNINITIALIZED
    private queue: GridCoord[] = []
    private parentMap: Map<string, GridCoord> = new Map()
    private visitedOrder: GridCoord[] = []

    // Flat 1D typed array for distances: -1 = unvisited/wall, >= 0 = distance
    private distGrid: Int16Array

    // Current cell expansion tracking
    private currentCell: GridCoord | null = null
    private currentNeighbors: GridCoord[] = []
    private neighborIdx: number = 0

    // Scalar counters
    private stepCounter: number = 0
    private cycleCounter: number = 0
    private openedCounter: number = 0

    private foundPath: GridCoord[] | null = null

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

        const queue: GridCoord[] = [start]
        const visited = new Set<string>([coordKey(start)])
        const parentMap = new Map<string, GridCoord>()
        let cyclesCount = 0
        let openedCount = 0

        while (queue.length > 0) {
            cyclesCount++
            const current = queue.shift()!
            openedCount++

            const neighbors = this.getNeighbors(current, operator)
            for (const neighbor of neighbors) {
                const key = coordKey(neighbor)
                if (visited.has(key)) continue

                visited.add(key)
                parentMap.set(key, current)
                queue.push(neighbor)

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

        return {
            foundPath: null,
            openedCount,
            cyclesCount,
            isSuccess: false,
        }
    }

    public step(): MazeStepEvent | null {
        if (this.isDone || this.phase === RunnerPhase.FINISHED) {
            return null
        }

        // 1. Initial Step: validate boundaries and initialize start cell
        if (this.phase === RunnerPhase.UNINITIALIZED) {
            return this.initSearch()
        }

        // 2. Drive the state machine forward by one step
        while (true) {
            if (this.phase === RunnerPhase.NEXT_CELL) {
                if (this.queue.length === 0) {
                    return this.finalizeNotFound()
                }

                this.cycleCounter++
                this.currentCell = this.queue.shift()!
                this.openedCounter++

                const allNeighbors = this.getNeighbors(
                    this.currentCell,
                    this.options.operator
                )
                // Filter to only unvisited neighbors (distGrid === -1)
                this.currentNeighbors = allNeighbors.filter(
                    (n) => this.getDist(n.r, n.c) === -1
                )
                this.neighborIdx = 0

                if (this.currentNeighbors.length === 0) {
                    this.stepCounter++
                    return {
                        stepIndex: this.stepCounter,
                        currentCell: this.currentCell,
                        frontier: [...this.queue],
                        openedCount: this.openedCounter,
                        cycleCount: this.cycleCounter,
                        actionDescription: `Цикл #${this.cycleCounter}: клітинка (${this.currentCell.r}, ${this.currentCell.c}) не має нових доступних сусідів.`,
                        status: 'running',
                    }
                }

                this.phase = RunnerPhase.EXPAND_NEIGHBOR
            }

            if (this.phase === RunnerPhase.EXPAND_NEIGHBOR) {
                const neighbor = this.currentNeighbors[this.neighborIdx++]
                const currentDist = this.getDist(
                    this.currentCell!.r,
                    this.currentCell!.c
                )
                const nextDist = currentDist + 1

                this.setDist(neighbor.r, neighbor.c, nextDist)
                this.parentMap.set(coordKey(neighbor), this.currentCell!)
                this.visitedOrder.push(neighbor)
                this.queue.push(neighbor)

                if (this.neighborIdx >= this.currentNeighbors.length) {
                    this.phase = RunnerPhase.NEXT_CELL
                }

                this.stepCounter++

                // Check if goal reached
                if (areCoordsEqual(neighbor, this.options.goal)) {
                    return this.finalizeFound(neighbor)
                }

                return {
                    stepIndex: this.stepCounter,
                    currentCell: this.currentCell,
                    activeEdge: { from: this.currentCell!, to: neighbor },
                    frontier: [...this.queue],
                    updatedCell: {
                        coord: neighbor,
                        dist: nextDist,
                        wave: 'forward',
                    },
                    openedCount: this.openedCounter,
                    cycleCount: this.cycleCounter,
                    actionDescription: `Цикл #${this.cycleCounter}: поширення хвилі (${this.currentCell!.r}, ${this.currentCell!.c}) -> (${neighbor.r}, ${neighbor.c}), фронт d=${nextDist}.`,
                    status: 'running',
                }
            }
        }
    }

    public reset(): void {
        this.phase = RunnerPhase.UNINITIALIZED
        this.queue = []
        this.parentMap.clear()
        this.visitedOrder = []
        this.distGrid.fill(-1)
        this.currentCell = null
        this.currentNeighbors = []
        this.neighborIdx = 0
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
        return this.queue
    }

    public getFoundPath(): GridCoord[] | null {
        return this.foundPath
    }

    private setDist(r: number, c: number, dist: number): void {
        this.distGrid[r * this.cols + c] = dist
    }

    private initSearch(): MazeStepEvent {
        const { grid, start, goal, operator } = this.options
        const isStartInvalid =
            !isCoordOnGrid(start, this.rows, this.cols) ||
            grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordOnGrid(goal, this.rows, this.cols) ||
            grid[goal.r][goal.c] === -1

        if (isStartInvalid || isGoalInvalid) {
            this.phase = RunnerPhase.FINISHED
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
            this.phase = RunnerPhase.FINISHED
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

        // Standard initialization
        this.setDist(start.r, start.c, 0)
        this.queue.push(start)
        this.visitedOrder.push(start)
        this.phase = RunnerPhase.NEXT_CELL
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
            frontier: [...this.queue],
            updatedCell: { coord: start, dist: 0, wave: 'forward' },
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Ініціалізація хвильового пошуку (${opName}). Старт у (${start.r}, ${start.c}), хвиля d=0.`,
            status: 'running',
        }
    }

    private finalizeFound(goal: GridCoord): MazeStepEvent {
        this.phase = RunnerPhase.FINISHED
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
            frontier: [...this.queue],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            foundPath: path,
            actionDescription: `Цільову клітинку успішно досягнуто! Побудовано найкоротший шлях довжиною ${path.length - 1} кроків.`,
            status: 'found',
        }
    }

    private finalizeNotFound(): MazeStepEvent {
        this.phase = RunnerPhase.FINISHED
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
            statusText: `Шлях між (${this.options.start.r}, ${this.options.start.c}) та (${this.options.goal.r}, ${this.options.goal.c}) не існує. Усі доступні клітинки вичерпано.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Пошук завершено безрезультатно. Ціль недосяжна.`,
            status: 'not-found',
        }
    }
}
