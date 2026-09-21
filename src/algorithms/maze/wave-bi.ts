import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    areCoordsEqual,
    coordKey,
    isCoordInGrid,
} from './types'
import WaveUniAlgorithm from './wave-uni'

enum RunnerPhase {
    UNINITIALIZED,
    NEXT_CYCLE,
    EXPAND_NEIGHBOR,
    FINISHED,
}

export default class WaveBiAlgorithm extends BaseMazeSearch {
    // State machine
    private phase: RunnerPhase = RunnerPhase.UNINITIALIZED
    private queueF: GridCoord[] = []
    private queueB: GridCoord[] = []
    private parentMapF: Map<string, GridCoord> = new Map()
    private parentMapB: Map<string, GridCoord> = new Map()
    private visitedOrder: GridCoord[] = []

    // Flat 1D typed arrays for forward & backward distances (-1 = unreached)
    private distGridF: Int16Array
    private distGridB: Int16Array

    // Current cell expansion tracking
    private activeWave: 'forward' | 'backward' = 'forward'
    private currentCell: GridCoord | null = null
    private currentNeighbors: GridCoord[] = []
    private neighborIdx: number = 0

    // Scalar counters
    private stepCounter: number = 0
    private cycleCounter: number = 0
    private openedCounter: number = 0

    private foundPath: GridCoord[] | null = null
    private meetingPoint: GridCoord | null = null

    constructor(options: any) {
        super(options)
        this.distGridF = new Int16Array(this.rows * this.cols).fill(-1)
        this.distGridB = new Int16Array(this.rows * this.cols).fill(-1)
    }

    public runPure(): {
        foundPath: GridCoord[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
        meetingPoint?: GridCoord | null
    } {
        const { grid, start, goal, operator } = this.options
        const rows = this.rows
        const cols = this.cols

        if (
            !isCoordInGrid(start, rows, cols) ||
            !isCoordInGrid(goal, rows, cols) ||
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
                meetingPoint: start,
            }
        }

        const queueF: GridCoord[] = [start]
        const queueB: GridCoord[] = [goal]

        const visitedF = new Set<string>([coordKey(start)])
        const visitedB = new Set<string>([coordKey(goal)])

        const parentMapF = new Map<string, GridCoord>()
        const parentMapB = new Map<string, GridCoord>()

        let cyclesCount = 0
        let openedCount = 0

        while (queueF.length > 0 && queueB.length > 0) {
            cyclesCount++

            // Expand from smaller frontier for optimal balance
            const isForward = queueF.length <= queueB.length
            const activeQueue = isForward ? queueF : queueB
            const activeVisited = isForward ? visitedF : visitedB
            const oppositeVisited = isForward ? visitedB : visitedF
            const activeParentMap = isForward ? parentMapF : parentMapB

            const current = activeQueue.shift()!
            openedCount++

            const neighbors = this.getNeighbors(current, operator)
            for (const neighbor of neighbors) {
                const nKey = coordKey(neighbor)
                if (activeVisited.has(nKey)) continue

                activeVisited.add(nKey)
                activeParentMap.set(nKey, current)
                activeQueue.push(neighbor)

                // Check meeting
                if (oppositeVisited.has(nKey)) {
                    const path = this.mergePaths(
                        neighbor,
                        parentMapF,
                        parentMapB
                    )
                    return {
                        foundPath: path,
                        openedCount,
                        cyclesCount,
                        isSuccess: true,
                        meetingPoint: neighbor,
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

        // 1. Initial Step
        if (this.phase === RunnerPhase.UNINITIALIZED) {
            return this.initSearch()
        }

        // 2. Drive the state machine
        while (true) {
            if (this.phase === RunnerPhase.NEXT_CYCLE) {
                if (this.queueF.length === 0 || this.queueB.length === 0) {
                    return this.finalizeNotFound()
                }

                this.cycleCounter++

                // Select smaller frontier for balance
                const isForward = this.queueF.length <= this.queueB.length
                this.activeWave = isForward ? 'forward' : 'backward'
                const activeQueue = isForward ? this.queueF : this.queueB
                const activeDistGrid = isForward ? this.distGridF : this.distGridB

                this.currentCell = activeQueue.shift()!
                this.openedCounter++

                const allNeighbors = this.getNeighbors(
                    this.currentCell,
                    this.options.operator
                )
                // Filter unvisited from the active wave perspective
                this.currentNeighbors = allNeighbors.filter(
                    (n) => activeDistGrid[n.r * this.cols + n.c] === -1
                )
                this.neighborIdx = 0

                const waveLabel = isForward ? 'Пряма (Start)' : 'Зворотна (Goal)'

                if (this.currentNeighbors.length === 0) {
                    this.stepCounter++
                    return {
                        stepIndex: this.stepCounter,
                        currentCell: this.currentCell,
                        frontier: [...this.queueF, ...this.queueB],
                        openedCount: this.openedCounter,
                        cycleCount: this.cycleCounter,
                        actionDescription: `Цикл #${this.cycleCounter} (${waveLabel}): клітинка (${this.currentCell.r}, ${this.currentCell.c}) не має нових доступних сусідів.`,
                        status: 'running',
                    }
                }

                this.phase = RunnerPhase.EXPAND_NEIGHBOR
            }

            if (this.phase === RunnerPhase.EXPAND_NEIGHBOR) {
                const neighbor = this.currentNeighbors[this.neighborIdx++]
                const isForward = this.activeWave === 'forward'
                const activeDistGrid = isForward ? this.distGridF : this.distGridB
                const oppositeDistGrid = isForward ? this.distGridB : this.distGridF
                const activeParentMap = isForward ? this.parentMapF : this.parentMapB
                const activeQueue = isForward ? this.queueF : this.queueB

                const currentDist = activeDistGrid[this.currentCell!.r * this.cols + this.currentCell!.c]
                const nextDist = currentDist + 1

                activeDistGrid[neighbor.r * this.cols + neighbor.c] = nextDist
                activeParentMap.set(coordKey(neighbor), this.currentCell!)
                activeQueue.push(neighbor)
                this.visitedOrder.push(neighbor)

                if (this.neighborIdx >= this.currentNeighbors.length) {
                    this.phase = RunnerPhase.NEXT_CYCLE
                }

                this.stepCounter++

                // Check meeting point: opposite wave has already reached this cell
                const oppositeDist = oppositeDistGrid[neighbor.r * this.cols + neighbor.c]
                if (oppositeDist !== -1) {
                    return this.finalizeFound(neighbor)
                }

                const waveLabel = isForward ? 'Пряма' : 'Зворотна'
                return {
                    stepIndex: this.stepCounter,
                    currentCell: this.currentCell,
                    activeEdge: { from: this.currentCell!, to: neighbor },
                    frontier: [...this.queueF, ...this.queueB],
                    updatedCell: {
                        coord: neighbor,
                        dist: nextDist,
                        wave: this.activeWave,
                    },
                    openedCount: this.openedCounter,
                    cycleCount: this.cycleCounter,
                    actionDescription: `Цикл #${this.cycleCounter} (${waveLabel} хвиля): фронт досяг (${neighbor.r}, ${neighbor.c}), d=${nextDist}.`,
                    status: 'running',
                }
            }
        }
    }

    public reset(): void {
        this.phase = RunnerPhase.UNINITIALIZED
        this.queueF = []
        this.queueB = []
        this.parentMapF.clear()
        this.parentMapB.clear()
        this.visitedOrder = []
        this.distGridF.fill(-1)
        this.distGridB.fill(-1)
        this.currentCell = null
        this.currentNeighbors = []
        this.neighborIdx = 0
        this.stepCounter = 0
        this.cycleCounter = 0
        this.openedCounter = 0
        this.metrics = null
        this.foundPath = null
        this.meetingPoint = null
        this.isDone = false
    }

    public getDistF(r: number, c: number): number {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return -1
        return this.distGridF[r * this.cols + c]
    }

    public getDistB(r: number, c: number): number {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return -1
        return this.distGridB[r * this.cols + c]
    }

    public getFrontierF(): ReadonlyArray<GridCoord> {
        return this.queueF
    }

    public getFrontierB(): ReadonlyArray<GridCoord> {
        return this.queueB
    }

    public getFoundPath(): GridCoord[] | null {
        return this.foundPath
    }

    public getMeetingPoint(): GridCoord | null {
        return this.meetingPoint
    }

    private mergePaths(
        meeting: GridCoord,
        parentMapF: Map<string, GridCoord>,
        parentMapB: Map<string, GridCoord>
    ): GridCoord[] {
        // Path from start to meeting
        const pathF = this.reconstructPath(meeting, parentMapF)

        // Path from goal to meeting (using parentMapB where parent goes toward goal)
        const pathB: GridCoord[] = []
        let curr: GridCoord | undefined = parentMapB.get(coordKey(meeting))
        while (curr !== undefined) {
            pathB.push(curr)
            curr = parentMapB.get(coordKey(curr))
        }

        return [...pathF, ...pathB]
    }

    private initSearch(): MazeStepEvent {
        const { grid, start, goal, operator } = this.options
        const isStartInvalid =
            !isCoordInGrid(start, this.rows, this.cols) ||
            grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordInGrid(goal, this.rows, this.cols) ||
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
            this.distGridF[start.r * this.cols + start.c] = 0
            this.distGridB[goal.r * this.cols + goal.c] = 0
            this.foundPath = [start]
            this.meetingPoint = start

            this.metrics = {
                foundPath: [start],
                pathLength: 0,
                openedCellsCount: 1,
                cyclesCount: 1,
                executionTimeMs: duration,
                visitedOrder: [start],
                meetingPoint: start,
                searchSpaceReductionPct: 0,
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
                meetingPoint: start,
                foundPath: [start],
                actionDescription: this.metrics.statusText,
                status: 'found',
            }
        }

        // Standard initialization
        this.distGridF[start.r * this.cols + start.c] = 0
        this.distGridB[goal.r * this.cols + goal.c] = 0
        this.queueF.push(start)
        this.queueB.push(goal)
        this.visitedOrder.push(start, goal)
        this.phase = RunnerPhase.NEXT_CYCLE
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
            frontier: [...this.queueF, ...this.queueB],
            updatedCell: { coord: start, dist: 0, wave: 'forward' },
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Ініціалізація зустрічного пошуку (${opName}). Хвиля 1 з (${start.r}, ${start.c}), хвиля 2 з (${goal.r}, ${goal.c}).`,
            status: 'running',
        }
    }

    private finalizeFound(meeting: GridCoord): MazeStepEvent {
        this.phase = RunnerPhase.FINISHED
        this.isDone = true
        const path = this.mergePaths(meeting, this.parentMapF, this.parentMapB)
        this.foundPath = path
        this.meetingPoint = meeting
        const duration = this.benchmark()

        // Unidirectional comparison for search space reduction %
        const uniSearch = new WaveUniAlgorithm(this.options)
        const uniRes = uniSearch.runPure()
        const reductionPct =
            uniRes.openedCount > 0
                ? Math.max(
                      0,
                      Math.round(
                          (1 - this.openedCounter / uniRes.openedCount) * 100
                      )
                  )
                : 0

        this.metrics = {
            foundPath: path,
            pathLength: path.length - 1,
            openedCellsCount: this.openedCounter,
            cyclesCount: this.cycleCounter,
            executionTimeMs: duration,
            visitedOrder: this.visitedOrder,
            meetingPoint: meeting,
            searchSpaceReductionPct: reductionPct,
            isSuccess: true,
            statusText: `Зустріч хвиль у точці (${meeting.r}, ${meeting.c})! Довжина шляху: ${path.length - 1} кроків. Скорочення пошуку: ${reductionPct}%.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: meeting,
            frontier: [...this.queueF, ...this.queueB],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            meetingPoint: meeting,
            foundPath: path,
            actionDescription: `Зустріч хвиль у (${meeting.r}, ${meeting.c})! Побудовано найкоротший шлях довжиною ${path.length - 1} кроків. Скорочення простору: ${reductionPct}%.`,
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
            statusText: `Шлях між (${this.options.start.r}, ${this.options.start.c}) та (${this.options.goal.r}, ${this.options.goal.c}) не існує. Обидва фронти вичерпано.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Зустрічний пошук завершено безрезультатно. Шлях не існує.`,
            status: 'not-found',
        }
    }
}
