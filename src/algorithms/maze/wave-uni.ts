import { BaseMazeSearch } from './base'
import {
    GridCoord,
    MazeStepEvent,
    areCoordsEqual,
    coordKey,
    isCoordInGrid as isCoordOnGrid,
} from './types'

export default class WaveUniAlgorithm extends BaseMazeSearch {
    public runPure(): {
        foundPath: GridCoord[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
    } {
        const { grid, start, goal, operator } = this.options
        const rows = grid.length
        const cols = grid[0]?.length ?? 0

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

    protected *generateSteps(): Generator<MazeStepEvent, void, unknown> {
        const { grid, start, goal, operator } = this.options
        const rows = grid.length
        const cols = grid[0]?.length ?? 0

        const isStartInvalid =
            !isCoordOnGrid(start, rows, cols) || grid[start.r][start.c] === -1
        const isGoalInvalid =
            !isCoordOnGrid(goal, rows, cols) || grid[goal.r][goal.c] === -1

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

            yield {
                stepIndex: 0,
                currentCell: start,
                frontier: [],
                visited: [start],
                forwardDistances,
                openedCount: 1,
                cycleCount: 1,
                foundPath: [start],
                actionDescription: this.metrics.statusText,
                status: 'found',
            }
            return
        }

        let stepCounter = 0
        let cycleCounter = 0
        let openedCounter = 0

        const queue: GridCoord[] = [start]
        const visitedSet = new Set<string>([coordKey(start)])
        const visitedList: GridCoord[] = [start]
        const parentMap = new Map<string, GridCoord>()
        const forwardDistances: Record<string, number> = {
            [coordKey(start)]: 0,
        }

        const opName =
            operator === 'orthogonal'
                ? '4-напрямковий'
                : operator === 'diagonal'
                  ? 'діагональний'
                  : '8-напрямковий'

        yield {
            stepIndex: ++stepCounter,
            currentCell: start,
            frontier: [...queue],
            visited: [...visitedList],
            forwardDistances: { ...forwardDistances },
            openedCount: 0,
            cycleCount: 0,
            actionDescription: `Ініціалізація хвильового пошуку (${opName}). Старт у (${start.r}, ${start.c}), хвиля d=0.`,
            status: 'running',
        }

        while (queue.length > 0) {
            cycleCounter++
            const current = queue.shift()!
            openedCounter++
            const currentDist = forwardDistances[coordKey(current)] ?? 0

            const neighbors = this.getNeighbors(current, operator)
            const unvisitedNeighbors = neighbors.filter(
                (n) => !visitedSet.has(coordKey(n))
            )

            if (unvisitedNeighbors.length === 0) {
                yield {
                    stepIndex: ++stepCounter,
                    currentCell: current,
                    frontier: [...queue],
                    visited: [...visitedList],
                    forwardDistances: { ...forwardDistances },
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    actionDescription: `Цикл #${cycleCounter}: клітинка (${current.r}, ${current.c}) не має нових доступних сусідів.`,
                    status: 'running',
                }
                continue
            }

            for (const neighbor of unvisitedNeighbors) {
                const nKey = coordKey(neighbor)
                if (visitedSet.has(nKey)) continue

                const nextDist = currentDist + 1
                visitedSet.add(nKey)
                visitedList.push(neighbor)
                parentMap.set(nKey, current)
                forwardDistances[nKey] = nextDist
                queue.push(neighbor)

                yield {
                    stepIndex: ++stepCounter,
                    currentCell: current,
                    activeEdge: { from: current, to: neighbor },
                    frontier: [...queue],
                    visited: [...visitedList],
                    forwardDistances: { ...forwardDistances },
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    actionDescription: `Цикл #${cycleCounter}: поширення хвилі (${current.r}, ${current.c}) -> (${neighbor.r}, ${neighbor.c}), фронт d=${nextDist}.`,
                    status: 'running',
                }

                if (areCoordsEqual(neighbor, goal)) {
                    const path = this.reconstructPath(goal, parentMap)
                    const duration = this.benchmark()

                    this.metrics = {
                        foundPath: path,
                        pathLength: path.length - 1,
                        openedCellsCount: openedCounter,
                        cyclesCount: cycleCounter,
                        executionTimeMs: duration,
                        visitedOrder: visitedList,
                        isSuccess: true,
                        statusText: `Ціль (${goal.r}, ${goal.c}) знайдено! Довжина шляху: ${path.length - 1} кроків.`,
                    }

                    yield {
                        stepIndex: ++stepCounter,
                        currentCell: goal,
                        frontier: [...queue],
                        visited: [...visitedList],
                        forwardDistances: { ...forwardDistances },
                        openedCount: openedCounter,
                        cycleCount: cycleCounter,
                        foundPath: path,
                        actionDescription: `Цільову клітинку успішно досягнуто! Побудовано найкоротший шлях довжиною ${path.length - 1} кроків.`,
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
            visitedOrder: visitedList,
            isSuccess: false,
            statusText: `Шлях між (${start.r}, ${start.c}) та (${goal.r}, ${goal.c}) не існує. Усі доступні клітинки вичерпано.`,
        }

        yield {
            stepIndex: ++stepCounter,
            currentCell: null,
            frontier: [],
            visited: [...visitedList],
            forwardDistances: { ...forwardDistances },
            openedCount: openedCounter,
            cycleCount: cycleCounter,
            actionDescription: `Пошук завершено безрезультатно. Ціль недосяжна.`,
            status: 'not-found',
        }
    }
}
