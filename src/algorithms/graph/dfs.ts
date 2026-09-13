import { RunnableAlgorithm } from '@common/engine/search-runner'
import { GraphMetrics, GraphOptions, GraphStepEvent } from './common'
import { NeighborSortingStrategy, GraphModel } from '@wrkspc/graph/graph-model'

export class DFSAlgorithm implements RunnableAlgorithm<GraphStepEvent> {
    private options: GraphOptions

    private generator: Generator<GraphStepEvent, void, unknown> | null = null
    private metrics: GraphMetrics | null = null
    private isDone: boolean = false
    private benchmarkCache = new Map<string, number>()

    constructor(options: GraphOptions) {
        this.options = { ...options }
    }

    public step(): GraphStepEvent | null {
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

    public getMetrics(): GraphMetrics | null {
        return this.metrics
    }

    public clearBenchmarkCache(): void {
        this.benchmarkCache.clear()
    }

    public getOptions(): GraphOptions {
        return { ...this.options }
    }

    public setOptions(options: Partial<GraphOptions>): void {
        if (options.model && options.model !== this.options.model) {
            this.benchmarkCache.clear()
        }
        Object.assign(this.options, options)
        this.reset()
    }

    private reconstructPath(
        goalId: number,
        parentMap: Map<number, number>
    ): number[] {
        const path: number[] = []
        let curr: number | undefined = goalId
        while (curr !== undefined) {
            path.unshift(curr)
            curr = parentMap.get(curr)
        }
        return path
    }

    public benchmark(iterations: number = 200): number {
        const { model, startId, goalId, sortingStrategy } = this.options

        const key = `${model.getVersion()}_${startId}_${goalId}_${sortingStrategy}`

        const cached = this.benchmarkCache.get(key)
        if (cached !== undefined) {
            return cached
        }

        // Warm-up to trigger JIT optimization
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

    public runPure(): {
        foundPath: number[] | null
        openedCount: number
        cyclesCount: number
        isSuccess: boolean
    } {
        const { model, startId, goalId, sortingStrategy } = this.options
        if (startId === goalId) {
            return {
                foundPath: [startId],
                openedCount: 1,
                cyclesCount: 1,
                isSuccess: true,
            }
        }

        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        if (!startNode || !goalNode) {
            return {
                foundPath: null,
                openedCount: 0,
                cyclesCount: 0,
                isSuccess: false,
            }
        }

        const stack: number[] = [startId]
        const visited: Set<number> = new Set([startId])
        const parentMap: Map<number, number> = new Map()
        let cyclesCount = 0
        let openedCount = 0

        while (stack.length > 0) {
            cyclesCount++
            const curr = stack.pop()!
            openedCount++

            const neighbors = model.getNeighbors(curr, sortingStrategy)
            const unvisitedNeighbors = neighbors.filter((n) => !visited.has(n))

            for (const neighborId of unvisitedNeighbors.reverse()) {
                visited.add(neighborId)
                parentMap.set(neighborId, curr)
                stack.push(neighborId)

                if (neighborId === goalId) {
                    return {
                        foundPath: this.reconstructPath(goalId, parentMap),
                        openedCount: openedCount,
                        cyclesCount: cyclesCount,
                        isSuccess: true,
                    }
                }
            }
        }

        return {
            foundPath: null,
            openedCount: openedCount,
            cyclesCount: cyclesCount,
            isSuccess: false,
        }
    }

    private *generateSteps(): Generator<GraphStepEvent, void, unknown> {
        const { model, startId, goalId, sortingStrategy } = this.options
        if (startId === goalId) {
            this.metrics = {
                foundPath: [startId],
                pathLength: 0,
                openedVerticesCount: 1,
                cyclesCount: 1,
                executionTimeMs: 0,
                visitedOrder: [startId],
                isSuccess: true,
                statusText: `Ціль v${goalId} співпадає з початковою вершиною v${startId}!`,
            }

            yield {
                stepIndex: 0,
                currentNodeId: startId,
                frontier: [],
                visited: [startId],
                openedCount: 1,
                cycleCount: 1,
                actionDescription: this.metrics.statusText,
                status: 'found',
            }

            return
        }

        const startNode = model.getNode(startId)
        const goalNode = model.getNode(goalId)

        if (!startNode || !goalNode) {
            this.metrics = {
                foundPath: null,
                pathLength: 0,
                openedVerticesCount: 0,
                cyclesCount: 0,
                executionTimeMs: 0,
                visitedOrder: [],
                isSuccess: false,
                statusText:
                    'Помилка: Початкова або цільова вершина не знайдена в графі',
            }
            yield {
                stepIndex: 0,
                currentNodeId: null,
                frontier: [],
                visited: [],
                openedCount: 0,
                cycleCount: 0,
                actionDescription: this.metrics.statusText,
                status: 'not-found',
            }

            return
        }

        const stack: number[] = [startId]
        const visited: Set<number> = new Set([startId])
        const parentMap: Map<number, number> = new Map()
        const visitedOrder: number[] = [startId]
        let cycleCounter = 0
        let openedCounter = 0
        let stepCounter = 0

        while (stack.length > 0) {
            cycleCounter++
            const currentId = stack.pop()!
            openedCounter++

            const neighbors = model.getNeighbors(currentId, sortingStrategy)
            const unvisitedNeighbors = neighbors.filter((n) => !visited.has(n))

            if (unvisitedNeighbors.length === 0) {
                yield {
                    stepIndex: ++stepCounter,
                    currentNodeId: currentId,
                    frontier: [...stack],
                    visited: Array.from(visited),
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    actionDescription: `Розкриття v${currentId} (цикл #${cycleCounter}). Вершина не має нових суміжних вершин.`,
                    status: 'running',
                }
                continue
            }

            for (const neighborId of unvisitedNeighbors.reverse()) {
                visited.add(neighborId)
                parentMap.set(neighborId, currentId)
                stack.push(neighborId)
                visitedOrder.push(neighborId)

                if (neighborId !== goalId) {
                    continue
                }

                const path = this.reconstructPath(goalId, parentMap)
                const duration = this.benchmark()

                this.metrics = {
                    foundPath: path,
                    pathLength: path.length - 1,
                    openedVerticesCount: openedCounter,
                    cyclesCount: cycleCounter,
                    executionTimeMs: duration,
                    visitedOrder,
                    isSuccess: true,
                    statusText: `Ціль v${goalId} знайдено! Довжина шляху: ${path.length - 1} ребер.`,
                }

                yield {
                    stepIndex: ++stepCounter,
                    currentNodeId: goalId,
                    frontier: [...stack],
                    visited: Array.from(visited),
                    openedCount: openedCounter,
                    cycleCount: cycleCounter,
                    foundPath: path,
                    actionDescription: `Цільова вершина v${goalId} успішно знайдена! Побудовано шлях: ${path.join(' -> ')}.`,
                    status: 'found',
                }

                return
            }
        }

        const duration = this.benchmark()

        this.metrics = {
            foundPath: null,
            pathLength: 0,
            openedVerticesCount: openedCounter,
            cyclesCount: cycleCounter,
            executionTimeMs: duration,
            visitedOrder,
            isSuccess: false,
            statusText: `Шлях між вершинами v${startId} та v${goalId} не існує. Черга вичерпана.`,
        }

        yield {
            stepIndex: ++stepCounter,
            currentNodeId: null,
            frontier: [],
            visited: Array.from(visited),
            openedCount: openedCounter,
            cycleCount: cycleCounter,
            actionDescription: `Пошук завершено. Цільова вершина v${goalId} недосяжна з v${startId}.`,
            status: 'not-found',
        }
    }
}

export default DFSAlgorithm
