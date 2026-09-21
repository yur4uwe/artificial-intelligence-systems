import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    areCoordsEqual,
    coordKey,
    isCoordInGrid,
} from './types'
import WaveUniAlgorithm from './wave-uni'

export default class WaveBiAlgorithm extends BaseMazeSearch {
    public runPure(): {
        foundPath: GridCoord[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
        meetingPoint?: GridCoord | null
    } {
        const { grid, start, goal, operator } = this.options
        const rows = grid.length
        const cols = grid[0]?.length ?? 0

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

    protected *generateSteps(): Generator<MazeStepEvent, void, unknown> {
        const { grid, start, goal, operator } = this.options
        const rows = grid.length
        const cols = grid[0]?.length ?? 0

        const isStartInvalid =
            !isCoordInGrid(start, rows, cols) || grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordInGrid(goal, rows, cols) || grid[goal.r][goal.c] === -1

        if (isStartInvalid || isGoalInvalid) {
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

            yield {
                stepIndex: 0,
                currentCell: null,
                frontier: [],
                visited: [],
                forwardDistances: {},
                backwardDistances: {},
                openedCount: 0,
                cycleCount: 0,
                actionDescription: this.metrics.statusText,
                status: 'not-found',
            }
            return
        }

        if (areCoordsEqual(start, goal)) {
            const duration = this.benchmark()
            const forwardDistances: Record<string, number> = {
                [coordKey(start)]: 0,
            }
            const backwardDistances: Record<string, number> = {
                [coordKey(goal)]: 0,
            }

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
                statusText: `Ціль (${goal.r}, ${goal.c}) співпадає зі стартом!`,
            }

            yield {
                stepIndex: 0,
                currentCell: start,
                frontier: [],
                visited: [start],
                forwardDistances,
                backwardDistances,
                openedCount: 1,
                cycleCount: 1,
                meetingPoint: start,
                foundPath: [start],
                actionDescription: this.metrics.statusText,
                status: 'found',
            }
            return
        }

        let stepCounter = 0
        let cycleCounter = 0
        let openedCounter = 0

        const queueF: GridCoord[] = [start]
        const queueB: GridCoord[] = [goal]

        const visitedSetF = new Set<string>([coordKey(start)])
        const visitedSetB = new Set<string>([coordKey(goal)])

        const forwardDistances: Record<string, number> = {
            [coordKey(start)]: 0,
        }
        const backwardDistances: Record<string, number> = {
            [coordKey(goal)]: 0,
        }

        const parentMapF = new Map<string, GridCoord>()
        const parentMapB = new Map<string, GridCoord>()

        const allVisitedList: GridCoord[] = [start, goal]

        const opName =
            operator === 'orthogonal'
                ? '4-напрямковий'
                : operator === 'diagonal'
                  ? 'діагональний'
                  : '8-напрямковий'

        yield {
            stepIndex: ++stepCounter,
            currentCell: start,
            frontier: [...queueF, ...queueB],
            visited: [...allVisitedList],
            forwardDistances: { ...forwardDistances },
            backwardDistances: { ...backwardDistances },
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Ініціалізація зустрічного хвильового пошуку (${opName}). Пряма хвиля від (${start.r}, ${start.c}), зворотна від (${goal.r}, ${goal.c}).`,
            status: 'running',
        }

        while (queueF.length > 0 && queueB.length > 0) {
            cycleCounter++

            // Balance frontiers: pick the smaller queue
            const isForward = queueF.length <= queueB.length
            const activeQueue = isForward ? queueF : queueB
            const activeVisited = isForward ? visitedSetF : visitedSetB
            const oppositeVisited = isForward ? visitedSetB : visitedSetF
            const activeDistances = isForward
                ? forwardDistances
                : backwardDistances
            const activeParentMap = isForward ? parentMapF : parentMapB
            const waveLabel = isForward ? 'пряма' : 'зворотна'

            const current = activeQueue.shift()!
            openedCounter++
            const currentDist = activeDistances[coordKey(current)] ?? 0

            const neighbors = this.getNeighbors(current, operator)
            const unvisitedNeighbors = neighbors.filter(
                (n) => !activeVisited.has(coordKey(n))
            )

            if (unvisitedNeighbors.length === 0) {
                yield {
                    stepIndex: ++stepCounter,
                    currentCell: current,
                    frontier: [...queueF, ...queueB],
                    visited: [...allVisitedList],
                    forwardDistances: { ...forwardDistances },
                    backwardDistances: { ...backwardDistances },
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    actionDescription: `Цикл #${cycleCounter} (${waveLabel} хвиля): (${current.r}, ${current.c}) не має нових доступних сусідів.`,
                    status: 'running',
                }
                continue
            }

            for (const neighbor of unvisitedNeighbors) {
                const nKey = coordKey(neighbor)

                const nextDist = currentDist + 1
                activeVisited.add(nKey)
                activeDistances[nKey] = nextDist
                activeParentMap.set(nKey, current)
                activeQueue.push(neighbor)
                allVisitedList.push(neighbor)

                yield {
                    stepIndex: ++stepCounter,
                    currentCell: current,
                    activeEdge: { from: current, to: neighbor },
                    frontier: [...queueF, ...queueB],
                    visited: [...allVisitedList],
                    forwardDistances: { ...forwardDistances },
                    backwardDistances: { ...backwardDistances },
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    actionDescription: `Цикл #${cycleCounter} (${waveLabel} хвиля): фронт досяг (${neighbor.r}, ${neighbor.c}), d=${nextDist}.`,
                    status: 'running',
                }

                // Check intersection
                if (oppositeVisited.has(nKey)) {
                    const path = this.mergePaths(
                        neighbor,
                        parentMapF,
                        parentMapB
                    )
                    const duration = this.benchmark()

                    // Compute unidirectional opened count to measure reduction
                    const uniSearch = new WaveUniAlgorithm(this.options)
                    const uniRes = uniSearch.runPure()
                    const reductionPct =
                        uniRes.openedCount > 0
                            ? Math.max(
                                  0,
                                  Math.round(
                                      (1 - openedCounter / uniRes.openedCount) *
                                          100
                                  )
                              )
                            : 0

                    this.metrics = {
                        foundPath: path,
                        pathLength: path.length - 1,
                        openedCellsCount: openedCounter,
                        cyclesCount: cycleCounter,
                        executionTimeMs: duration,
                        visitedOrder: allVisitedList,
                        meetingPoint: neighbor,
                        searchSpaceReductionPct: reductionPct,
                        isSuccess: true,
                        statusText: `Зустріч хвиль у точці (${neighbor.r}, ${neighbor.c})! Довжина шляху: ${path.length - 1} кроків. Скорочення пошуку: ${reductionPct}%.`,
                    }

                    yield {
                        stepIndex: ++stepCounter,
                        currentCell: neighbor,
                        frontier: [...queueF, ...queueB],
                        visited: [...allVisitedList],
                        forwardDistances: { ...forwardDistances },
                        backwardDistances: { ...backwardDistances },
                        meetingPoint: neighbor,
                        openedCount: openedCounter,
                        cycleCount: cycleCounter,
                        foundPath: path,
                        actionDescription: `Хвилі зустрілися у точці (${neighbor.r}, ${neighbor.c})! Знайдено найкоротший шлях (${path.length - 1} кроків).`,
                        status: 'found',
                    }

                    return
                }
            }
        }

        const duration = this.benchmark()
        this.metrics = {
            foundPath: null,
            pathLength: 0,
            openedCellsCount: openedCounter,
            cyclesCount: cycleCounter,
            executionTimeMs: duration,
            visitedOrder: allVisitedList,
            meetingPoint: null,
            isSuccess: false,
            statusText: `Шлях між (${start.r}, ${start.c}) та (${goal.r}, ${goal.c}) не існує. Хвилі не перетнулися.`,
        }

        yield {
            stepIndex: ++stepCounter,
            currentCell: null,
            frontier: [],
            visited: [...allVisitedList],
            forwardDistances: { ...forwardDistances },
            backwardDistances: { ...backwardDistances },
            openedCount: openedCounter,
            cycleCount: cycleCounter,
            actionDescription: `Пошук завершено. Хвилі вичерпані без перетину (шлях заблоковано).`,
            status: 'not-found',
        }
    }
}
