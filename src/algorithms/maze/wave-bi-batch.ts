import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    MazeCellUpdate,
    areCoordsEqual,
    coordKey,
    isCoordInGrid,
} from './types'
import WaveUniBatchAlgorithm from './wave-uni-batch'

export default class WaveBiBatchAlgorithm extends BaseMazeSearch {
    private frontierF: GridCoord[] = []
    private frontierB: GridCoord[] = []
    private parentMapF: Map<string, GridCoord> = new Map()
    private parentMapB: Map<string, GridCoord> = new Map()
    private visitedOrder: GridCoord[] = []

    // Flat 1D typed arrays for forward & backward distances (-1 = unreached)
    private distGridF: Int16Array
    private distGridB: Int16Array

    // Scalar counters
    private stepCounter: number = 0
    private cycleCounter: number = 0
    private openedCounter: number = 0

    private foundPath: GridCoord[] | null = null
    private meetingPoint: GridCoord | null = null
    private isInitialized: boolean = false

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

        let frontierF: GridCoord[] = [start]
        let frontierB: GridCoord[] = [goal]

        const visitedF = new Set<string>([coordKey(start)])
        const visitedB = new Set<string>([coordKey(goal)])

        const parentMapF = new Map<string, GridCoord>()
        const parentMapB = new Map<string, GridCoord>()

        let cyclesCount = 0
        let openedCount = 0

        while (frontierF.length > 0 && frontierB.length > 0) {
            cyclesCount++

            // 1. Expand forward frontier
            const nextFrontierF: GridCoord[] = []
            let meeting: GridCoord | null = null

            for (const current of frontierF) {
                openedCount++
                const neighbors = this.getNeighbors(current, operator)
                for (const neighbor of neighbors) {
                    const nKey = coordKey(neighbor)
                    if (visitedF.has(nKey)) continue

                    visitedF.add(nKey)
                    parentMapF.set(nKey, current)
                    nextFrontierF.push(neighbor)

                    if (visitedB.has(nKey)) {
                        meeting = neighbor
                        break
                    }
                }

                if (meeting) {
                    break
                }
            }

            frontierF = nextFrontierF

            if (meeting) {
                const path = this.mergePaths(meeting, parentMapF, parentMapB)
                return {
                    foundPath: path,
                    openedCount,
                    cyclesCount,
                    isSuccess: true,
                    meetingPoint: meeting,
                }
            }

            // 2. Expand backward frontier
            const nextFrontierB: GridCoord[] = []
            for (const current of frontierB) {
                openedCount++
                const neighbors = this.getNeighbors(current, operator)
                for (const neighbor of neighbors) {
                    const nKey = coordKey(neighbor)
                    if (visitedB.has(nKey)) continue

                    visitedB.add(nKey)
                    parentMapB.set(nKey, current)
                    nextFrontierB.push(neighbor)

                    if (visitedF.has(nKey)) {
                        meeting = neighbor
                        break
                    }
                }

                if (meeting) {
                    break
                }
            }

            frontierB = nextFrontierB

            if (meeting) {
                const path = this.mergePaths(meeting, parentMapF, parentMapB)
                return {
                    foundPath: path,
                    openedCount,
                    cyclesCount,
                    isSuccess: true,
                    meetingPoint: meeting,
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
        if (this.isDone) {
            return null
        }

        // 1. Initial Step
        if (!this.isInitialized) {
            return this.initSearch()
        }

        // 2. Drive batch frontier expansion
        if (this.frontierF.length === 0 || this.frontierB.length === 0) {
            return this.finalizeNotFound()
        }

        this.cycleCounter++

        const nextFrontierF: GridCoord[] = []
        const nextFrontierB: GridCoord[] = []
        const updatedCells: MazeCellUpdate[] = []
        let meetingPoint: GridCoord | null = null

        // 1. Expand forward frontier
        for (const current of this.frontierF) {
            this.openedCounter++
            const currentDist =
                this.distGridF[current.r * this.cols + current.c]
            const nextDist = currentDist + 1
            const neighbors = this.getNeighbors(current, this.options.operator)

            for (const neighbor of neighbors) {
                const nIdx = neighbor.r * this.cols + neighbor.c
                if (this.distGridF[nIdx] === -1) {
                    this.distGridF[nIdx] = nextDist
                    this.parentMapF.set(coordKey(neighbor), current)
                    nextFrontierF.push(neighbor)
                    this.visitedOrder.push(neighbor)
                    updatedCells.push({
                        coord: neighbor,
                        dist: nextDist,
                        wave: 'forward',
                    })

                    // Meeting point condition: opposite wave has already reached this cell
                    if (this.distGridB[nIdx] !== -1) {
                        meetingPoint = neighbor
                        break
                    }
                }
            }

            if (meetingPoint) {
                break
            }
        }

        this.frontierF = nextFrontierF

        if (meetingPoint) {
            this.stepCounter++
            return this.finalizeFound(meetingPoint, updatedCells)
        }

        // 2. Expand backward frontier
        for (const current of this.frontierB) {
            this.openedCounter++
            const currentDist =
                this.distGridB[current.r * this.cols + current.c]
            const nextDist = currentDist + 1
            const neighbors = this.getNeighbors(current, this.options.operator)

            for (const neighbor of neighbors) {
                const nIdx = neighbor.r * this.cols + neighbor.c
                if (this.distGridB[nIdx] === -1) {
                    this.distGridB[nIdx] = nextDist
                    this.parentMapB.set(coordKey(neighbor), current)
                    nextFrontierB.push(neighbor)
                    this.visitedOrder.push(neighbor)
                    updatedCells.push({
                        coord: neighbor,
                        dist: nextDist,
                        wave: 'backward',
                    })

                    // Meeting point condition: opposite wave has already reached this cell
                    if (this.distGridF[nIdx] !== -1) {
                        meetingPoint = neighbor
                        break
                    }
                }
            }

            if (meetingPoint) {
                break
            }
        }

        this.frontierB = nextFrontierB
        this.stepCounter++

        if (meetingPoint) {
            return this.finalizeFound(meetingPoint, updatedCells)
        }

        if (this.frontierF.length === 0 || this.frontierB.length === 0) {
            return this.finalizeNotFound()
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [...this.frontierF, ...this.frontierB],
            backwardFrontier: [...this.frontierB],
            updatedCells,
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Цикл #${this.cycleCounter}: пакетно розкрито обидва фронти (прямий: ${nextFrontierF.length} клітинок, зворотний: ${nextFrontierB.length} клітинок).`,
            status: 'running',
        }
    }

    public reset(): void {
        this.isInitialized = false
        this.frontierF = []
        this.frontierB = []
        this.parentMapF.clear()
        this.parentMapB.clear()
        this.visitedOrder = []
        this.distGridF.fill(-1)
        this.distGridB.fill(-1)
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
        return this.frontierF
    }

    public getFrontierB(): ReadonlyArray<GridCoord> {
        return this.frontierB
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
        this.isInitialized = true
        const { grid, start, goal, operator } = this.options
        const isStartInvalid =
            !isCoordInGrid(start, this.rows, this.cols) ||
            grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordInGrid(goal, this.rows, this.cols) ||
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

        // Standard initialization: start and goal wavefronts
        this.distGridF[start.r * this.cols + start.c] = 0
        this.distGridB[goal.r * this.cols + goal.c] = 0
        this.frontierF = [start]
        this.frontierB = [goal]
        this.visitedOrder.push(start, goal)
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
            frontier: [...this.frontierF, ...this.frontierB],
            backwardFrontier: [...this.frontierB],
            updatedCells: [
                { coord: start, dist: 0, wave: 'forward' },
                { coord: goal, dist: 0, wave: 'backward' },
            ],
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Канонічний зустрічний пошук (${opName}). Ініціалізація фронтів: пряма (${start.r}, ${start.c}) та зворотна (${goal.r}, ${goal.c}).`,
            status: 'running',
        }
    }

    private finalizeFound(
        meeting: GridCoord,
        updatedCells: MazeCellUpdate[]
    ): MazeStepEvent {
        this.isDone = true
        const path = this.mergePaths(meeting, this.parentMapF, this.parentMapB)
        this.foundPath = path
        this.meetingPoint = meeting
        const duration = this.benchmark()

        // Unidirectional comparison for search space reduction %
        const uniSearch = new WaveUniBatchAlgorithm(this.options)
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

        const distF = this.distGridF[meeting.r * this.cols + meeting.c]
        const distB = this.distGridB[meeting.r * this.cols + meeting.c]
        const meetingDist = distF !== -1 ? distF : distB

        return {
            stepIndex: this.stepCounter,
            currentCell: meeting,
            frontier: [...this.frontierF, ...this.frontierB],
            backwardFrontier: [...this.frontierB],
            updatedCells,
            updatedCell: {
                coord: meeting,
                dist: meetingDist,
            },
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            meetingPoint: meeting,
            foundPath: path,
            actionDescription: `Зустріч хвиль у (${meeting.r}, ${meeting.c})! Побудовано найкоротший шлях довжиною ${path.length - 1} кроків. Скорочення простору: ${reductionPct}%.`,
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
            statusText: `Шлях між (${this.options.start.r}, ${this.options.start.c}) та (${this.options.goal.r}, ${this.options.goal.c}) не існує. Обидва хвильові фронти вичерпано.`,
        }

        return {
            stepIndex: this.stepCounter,
            currentCell: null,
            frontier: [],
            openedCount: this.openedCounter,
            cycleCount: this.cycleCounter,
            actionDescription: `Зустрічний хвильовий пошук завершено безрезультатно. Шлях не існує.`,
            status: 'not-found',
        }
    }
}
