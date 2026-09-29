import { RunnableAlgorithm } from '@/common/engine/search-runner'
import { DijkstraMetrics, DijkstraOptions, DijkstraStepEvent } from './types'

export class DijkstraAlgorithm implements RunnableAlgorithm<DijkstraStepEvent> {
    private options: DijkstraOptions
    private generator: Generator<DijkstraStepEvent, void, unknown> | null = null
    private metrics: DijkstraMetrics | null = null
    private isDone: boolean = false

    constructor(options: DijkstraOptions) {
        this.options = { ...options }
    }

    public step(): DijkstraStepEvent | null {
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

    public getMetrics(): DijkstraMetrics | null {
        return this.metrics
    }

    public getOptions(): DijkstraOptions {
        return { ...this.options }
    }

    public setOptions(options: Partial<DijkstraOptions>): void {
        Object.assign(this.options, options)
        this.reset()
    }

    private *generateSteps(): Generator<DijkstraStepEvent, void, unknown> {
        const startTime = performance.now()
        const { model, startId, goalId } = this.options
        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        if (!startNode || !goalNode) {
            const statusText =
                'Помилка: Початкова або цільова вершина не знайдена в графі'
            this.metrics = {
                foundPath: null,
                pathCities: [],
                totalDistanceKm: 0,
                settledCount: 0,
                relaxationsCount: 0,
                executionTimeMs: 0,
                visitedOrder: [],
                isSuccess: false,
                statusText,
            }
            yield {
                type: 'finish-none',
                stepIndex: 1,
                currentNodeId: null,
                actionDescription: statusText,
                status: 'not-found',
            }
            return
        }

        const dist = new Map<number, number>()
        for (const node of model.getNodes()) {
            dist.set(node.id, Infinity)
        }
        dist.set(startId, 0)

        const parentMap = new Map<number, number>()

        const unexpandedList: number[] = [startId]
        const settled = new Set<number>()
        const visitedOrder: number[] = []
        let relaxationsCount = 0

        // Count the initial state step
        let stepCount = 1

        yield {
            type: 'init',
            stepIndex: stepCount,
            currentNodeId: startId,
            relaxedDistance: {
                nodeId: startId,
                dist: 0,
            },
            actionDescription: `Ініціалізація: початковій вершині "${startNode.label}" присвоєно числову мітку 0 км. Поміщено у список нерозкритих вершин.`,
            status: 'running',
        }

        while (unexpandedList.length > 0) {
            unexpandedList.sort(
                (a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity)
            )

            const currentW = unexpandedList.shift()!
            const currentDist = dist.get(currentW) ?? Infinity

            if (currentDist === Infinity) {
                break
            }

            if (settled.has(currentW)) {
                continue
            }

            const wNode = model.getNode(currentW)
            const wLabel = wNode?.label ?? `v${currentW}`

            if (currentW === goalId) {
                settled.add(currentW)
                visitedOrder.push(currentW)

                const path: number[] = []
                let curr: number | undefined = goalId
                while (curr !== undefined) {
                    path.unshift(curr)
                    curr = parentMap.get(curr)
                }

                const pathCities = path.map(
                    (id) => model.getNode(id)?.label ?? `v${id}`
                )
                const endTime = performance.now()
                const executionTimeMs = Math.max(0.01, endTime - startTime)

                this.metrics = {
                    foundPath: path,
                    pathCities,
                    totalDistanceKm: currentDist,
                    settledCount: settled.size,
                    relaxationsCount,
                    executionTimeMs,
                    visitedOrder,
                    isSuccess: true,
                    statusText: `Цільову вершину "${goalNode.label}" знайдено. Довжина найкоротшого шляху: ${currentDist} км.`,
                }

                stepCount++
                yield {
                    type: 'finish-found',
                    stepIndex: stepCount,
                    currentNodeId: goalId,
                    settledNodeId: goalId,
                    foundPath: path,
                    totalDistanceKm: currentDist,
                    actionDescription: `Цільову вершину "${goalNode.label}" знайдено! Найкоротший маршрут (${currentDist} км): ${pathCities.join(' -> ')}.`,
                    status: 'found',
                }
                return
            }

            settled.add(currentW)
            visitedOrder.push(currentW)

            stepCount++
            yield {
                type: 'settle-node',
                stepIndex: stepCount,
                currentNodeId: currentW,
                settledNodeId: currentW,
                actionDescription: `Розкриття W-вершини "${wLabel}" (остаточна мітка: ${currentDist} км). Огляд суміжних автошляхів.`,
                status: 'running',
            }

            // Inspect adjacent highways
            const neighbors = model.getNeighbors(currentW)
            for (const neighborId of neighbors) {
                if (settled.has(neighborId)) {
                    continue
                }

                const edgeWeight = model.getRoadDistance(currentW, neighborId)
                if (edgeWeight === undefined) {
                    continue
                }

                const oldDist = dist.get(neighborId) ?? Infinity
                const newDist = currentDist + edgeWeight
                const neighborNode = model.getNode(neighborId)
                const neighborLabel = neighborNode?.label ?? `v${neighborId}`

                // Relaxation condition: if new route is strictly shorter
                if (newDist < oldDist) {
                    relaxationsCount++
                    dist.set(neighborId, newDist)
                    parentMap.set(neighborId, currentW)

                    if (!unexpandedList.includes(neighborId)) {
                        unexpandedList.push(neighborId)
                    }

                    // Keep unexpanded list sorted
                    unexpandedList.sort(
                        (a, b) =>
                            (dist.get(a) ?? Infinity) -
                            (dist.get(b) ?? Infinity)
                    )

                    stepCount++
                    yield {
                        type: 'relax-edge',
                        stepIndex: stepCount,
                        currentNodeId: currentW,
                        activeEdge: {
                            from: currentW,
                            to: neighborId,
                            weight: edgeWeight,
                        },
                        relaxedDistance: {
                            nodeId: neighborId,
                            dist: newDist,
                            prevDist:
                                oldDist === Infinity ? undefined : oldDist,
                        },
                        actionDescription:
                            oldDist === Infinity
                                ? `Автошлях "${wLabel}" -> "${neighborLabel}" (${edgeWeight} км): присвоєно числову мітку ${newDist} км. Вершину додано до списку нерозкритих.`
                                : `Зменшення мітки: автошлях "${wLabel}" -> "${neighborLabel}" (${edgeWeight} км): нове значення ${newDist} км (було ${oldDist} км).`,
                        status: 'running',
                    }
                }
            }
        }

        // If unexpanded list empties without reaching goal
        const endTime = performance.now()
        const executionTimeMs = Math.max(0.01, endTime - startTime)
        const statusText = `Список нерозкритих вершин вичерпано. Цільова вершина "${goalNode.label}" недосяжна з "${startNode.label}".`

        this.metrics = {
            foundPath: null,
            pathCities: [],
            totalDistanceKm: 0,
            settledCount: settled.size,
            relaxationsCount,
            executionTimeMs,
            visitedOrder,
            isSuccess: false,
            statusText,
        }

        stepCount++
        yield {
            type: 'finish-none',
            stepIndex: stepCount,
            currentNodeId: null,
            actionDescription: statusText,
            status: 'not-found',
        }
    }

    public runPure(): DijkstraMetrics {
        const startTime = performance.now()
        const { model, startId, goalId } = this.options
        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        if (!startNode || !goalNode) {
            return {
                foundPath: null,
                pathCities: [],
                totalDistanceKm: 0,
                settledCount: 0,
                relaxationsCount: 0,
                executionTimeMs: 0,
                visitedOrder: [],
                isSuccess: false,
                statusText:
                    'Помилка: Початкова або цільова вершина не знайдена в графі',
            }
        }

        const dist = new Map<number, number>()
        for (const node of model.getNodes()) {
            dist.set(node.id, Infinity)
        }
        dist.set(startId, 0)

        const parentMap = new Map<number, number>()
        const unexpandedList: number[] = [startId]
        const settled = new Set<number>()
        const visitedOrder: number[] = []
        let relaxationsCount = 0

        while (unexpandedList.length > 0) {
            unexpandedList.sort(
                (a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity)
            )
            const currentW = unexpandedList.shift()!
            const currentDist = dist.get(currentW) ?? Infinity

            if (currentDist === Infinity) {
                break
            }

            if (settled.has(currentW)) {
                continue
            }

            if (currentW === goalId) {
                settled.add(currentW)
                visitedOrder.push(currentW)

                const path: number[] = []
                let curr: number | undefined = goalId
                while (curr !== undefined) {
                    path.unshift(curr)
                    curr = parentMap.get(curr)
                }

                const pathCities = path.map(
                    (id) => model.getNode(id)?.label ?? `v${id}`
                )
                const endTime = performance.now()

                return {
                    foundPath: path,
                    pathCities,
                    totalDistanceKm: currentDist,
                    settledCount: settled.size,
                    relaxationsCount,
                    executionTimeMs: Math.max(0.01, endTime - startTime),
                    visitedOrder,
                    isSuccess: true,
                    statusText: `Цільову вершину "${goalNode.label}" знайдено. Довжина найкоротшого шляху: ${currentDist} км.`,
                }
            }

            settled.add(currentW)
            visitedOrder.push(currentW)

            const neighbors = model.getNeighbors(currentW)
            for (const neighborId of neighbors) {
                if (settled.has(neighborId)) {
                    continue
                }

                const edgeWeight = model.getRoadDistance(currentW, neighborId)
                if (edgeWeight === undefined) {
                    continue
                }

                const oldDist = dist.get(neighborId) ?? Infinity
                const newDist = currentDist + edgeWeight

                if (newDist < oldDist) {
                    relaxationsCount++
                    dist.set(neighborId, newDist)
                    parentMap.set(neighborId, currentW)

                    if (!unexpandedList.includes(neighborId)) {
                        unexpandedList.push(neighborId)
                    }
                }
            }
        }

        const endTime = performance.now()
        return {
            foundPath: null,
            pathCities: [],
            totalDistanceKm: 0,
            settledCount: settled.size,
            relaxationsCount,
            executionTimeMs: Math.max(0.01, endTime - startTime),
            visitedOrder,
            isSuccess: false,
            statusText: `Список нерозкритих вершин вичерпано. Цільова вершина "${goalNode.label}" недосяжна з "${startNode.label}".`,
        }
    }
}

export default DijkstraAlgorithm
export { DijkstraAlgorithm as MapSearch }
