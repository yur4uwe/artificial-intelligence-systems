import { RunnableAlgorithm } from '@/common/engine/search-runner'
import { StepStatus } from '@/types'
import {
    DijkstraMetrics,
    DijkstraOptions,
    DijkstraStepEvent,
    DijkstraStepType,
} from './types'

export class DijkstraAlgorithm implements RunnableAlgorithm<DijkstraStepEvent> {
    private options: DijkstraOptions
    private generator: Generator<DijkstraStepEvent, void, unknown> | null = null
    private metrics: DijkstraMetrics | null = null
    private isDone: boolean = false
    private benchmarkCache = new Map<string, number>()

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
        if (options.model && options.model !== this.options.model) {
            this.benchmarkCache.clear()
        }
        Object.assign(this.options, options)
        this.reset()
    }

    public clearBenchmarkCache(): void {
        this.benchmarkCache.clear()
    }

    /**
     * Micro-benchmark with JIT warm-up and instance-level caching.
     */
    public benchmark(iterations: number = 200): number {
        const { model, startId, goalId } = this.options
        const key = `${model.getVersion()}_${startId}_${goalId}`

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

    private reconstructPath(
        goalId: number,
        parentMap: Map<number, number>
    ): { path: number[]; pathCities: string[] } {
        const path: number[] = []
        let curr: number | undefined = goalId
        while (curr !== undefined) {
            path.unshift(curr)
            curr = parentMap.get(curr)
        }
        const pathCities = path.map(
            (id) => this.options.model.getNode(id)?.label ?? `v${id}`
        )
        return { path, pathCities }
    }

    private *generateSteps(): Generator<DijkstraStepEvent, void, unknown> {
        const { model, startId, goalId } = this.options
        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        let stepCount = 0
        let currentW: number | null = startId
        let relaxationsCount = 0
        const settled = new Set<number>()
        const visitedOrder: number[] = []

        // Local helper constructing step events and auto-incrementing stepCount
        const makeStep = (
            type: DijkstraStepType,
            actionDescription: string,
            extra: Partial<DijkstraStepEvent> = {},
            status: StepStatus = 'running'
        ): DijkstraStepEvent => ({
            type,
            stepIndex: ++stepCount,
            currentNodeId: currentW,
            actionDescription,
            status,
            ...extra,
        })

        // Local helper constructing metrics using closure state
        const makeMetrics = (
            statusText: string,
            isSuccess: boolean,
            extra: Partial<DijkstraMetrics> = {}
        ): DijkstraMetrics => ({
            foundPath: null,
            pathCities: [],
            totalDistanceKm: 0,
            settledCount: settled.size,
            relaxationsCount,
            executionTimeMs:
                extra.executionTimeMs ??
                (startNode && goalNode ? this.benchmark() : 0),
            visitedOrder,
            isSuccess,
            statusText,
            ...extra,
        })

        if (!startNode || !goalNode) {
            const statusText =
                'Помилка: Початкова або цільова вершина не знайдена в графі'
            this.metrics = makeMetrics(statusText, false)
            yield makeStep(
                'finish-none',
                statusText,
                { currentNodeId: null },
                'not-found'
            )
            return
        }

        // 1. Initial distance map (labels): 0 for start, Infinity for others
        const dist = new Map<number, number>()
        for (const node of model.getNodes()) {
            dist.set(node.id, Infinity)
        }
        dist.set(startId, 0)

        // 2. Parent pointers for route backtracking
        const parentMap = new Map<number, number>()

        // 3. Candidate unexpanded vertices list (sorted by label value)
        const unexpandedList: number[] = [startId]

        // Step 1: Initial state
        yield makeStep(
            'init',
            `Ініціалізація: початковій вершині "${startNode.label}" присвоєно числову мітку 0 км. Поміщено у список нерозкритих вершин.`,
            {
                relaxedDistance: {
                    nodeId: startId,
                    dist: 0,
                },
            }
        )

        // Iterative search loop
        while (unexpandedList.length > 0) {
            // Sort unexpanded list by ascending distance label (professor's specification)
            unexpandedList.sort(
                (a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity)
            )

            // Select the first vertex from the unexpanded list (minimal label W-vertex)
            currentW = unexpandedList.shift()!
            const currentDist = dist.get(currentW) ?? Infinity

            if (currentDist === Infinity) {
                break
            }

            if (settled.has(currentW)) {
                continue
            }

            const wNode = model.getNode(currentW)
            const wLabel = wNode?.label ?? `v${currentW}`

            // Check goal condition prior to expanding W (professor's requirement)
            if (currentW === goalId) {
                settled.add(currentW)
                visitedOrder.push(currentW)

                const { path, pathCities } = this.reconstructPath(
                    goalId,
                    parentMap
                )
                const desc = `Цільову вершину "${goalNode.label}" знайдено! Найкоротший маршрут (${currentDist} км): ${pathCities.join(' -> ')}.`

                this.metrics = makeMetrics(desc, true, {
                    foundPath: path,
                    pathCities,
                    totalDistanceKm: currentDist,
                })

                yield makeStep(
                    'finish-found',
                    desc,
                    {
                        settledNodeId: goalId,
                        foundPath: path,
                        totalDistanceKm: currentDist,
                    },
                    'found'
                )
                return
            }

            // Mark W as settled (expanded)
            settled.add(currentW)
            visitedOrder.push(currentW)

            yield makeStep(
                'settle-node',
                `Розкриття W-вершини "${wLabel}" (остаточна мітка: ${currentDist} км). Огляд суміжних автошляхів.`,
                {
                    settledNodeId: currentW,
                }
            )

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

                // Guard clause: skip if route is not strictly shorter
                if (newDist >= oldDist) {
                    continue
                }

                const neighborNode = model.getNode(neighborId)
                const neighborLabel = neighborNode?.label ?? `v${neighborId}`

                relaxationsCount++
                dist.set(neighborId, newDist)
                parentMap.set(neighborId, currentW)

                if (!unexpandedList.includes(neighborId)) {
                    unexpandedList.push(neighborId)
                }

                // Keep unexpanded list sorted
                unexpandedList.sort(
                    (a, b) =>
                        (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity)
                )

                yield makeStep(
                    'relax-edge',
                    oldDist === Infinity
                        ? `Автошлях "${wLabel}" -> "${neighborLabel}" (${edgeWeight} км): присвоєно числову мітку ${newDist} км. Вершину додано до списку нерозкритих.`
                        : `Зменшення мітки: автошлях "${wLabel}" -> "${neighborLabel}" (${edgeWeight} км): нове значення ${newDist} км (було ${oldDist} км).`,
                    {
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
                    }
                )
            }
        }

        // If unexpanded list empties without reaching goal
        const statusText = `Список нерозкритих вершин вичерпано. Цільова вершина "${goalNode.label}" недосяжна з "${startNode.label}".`

        this.metrics = makeMetrics(statusText, false)

        yield makeStep(
            'finish-none',
            statusText,
            { currentNodeId: null },
            'not-found'
        )
    }

    public runPure(): DijkstraMetrics {
        const { model, startId, goalId } = this.options
        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        let relaxationsCount = 0
        const settled = new Set<number>()
        const visitedOrder: number[] = []

        // Local helper constructing metrics using closure state
        const makeMetrics = (
            statusText: string,
            isSuccess: boolean,
            extra: Partial<DijkstraMetrics> = {}
        ): DijkstraMetrics => ({
            foundPath: null,
            pathCities: [],
            totalDistanceKm: 0,
            settledCount: settled.size,
            relaxationsCount,
            executionTimeMs: 0,
            visitedOrder,
            isSuccess,
            statusText,
            ...extra,
        })

        if (!startNode || !goalNode) {
            return makeMetrics(
                'Помилка: Початкова або цільова вершина не знайдена в графі',
                false
            )
        }

        const dist = new Map<number, number>()
        for (const node of model.getNodes()) {
            dist.set(node.id, Infinity)
        }
        dist.set(startId, 0)

        const parentMap = new Map<number, number>()
        const unexpandedList: number[] = [startId]

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

                const { path, pathCities } = this.reconstructPath(
                    goalId,
                    parentMap
                )
                return makeMetrics(
                    `Цільову вершину "${goalNode.label}" знайдено. Довжина найкоротшого шляху: ${currentDist} км.`,
                    true,
                    {
                        foundPath: path,
                        pathCities,
                        totalDistanceKm: currentDist,
                    }
                )
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

                // Guard clause: skip if route is not strictly shorter
                if (newDist >= oldDist) {
                    continue
                }

                relaxationsCount++
                dist.set(neighborId, newDist)
                parentMap.set(neighborId, currentW)

                if (!unexpandedList.includes(neighborId)) {
                    unexpandedList.push(neighborId)
                }
            }
        }

        return makeMetrics(
            `Список нерозкритих вершин вичерпано. Цільова вершина "${goalNode.label}" недосяжна з "${startNode.label}".`,
            false
        )
    }
}

export default DijkstraAlgorithm
export { DijkstraAlgorithm as MapSearch }
