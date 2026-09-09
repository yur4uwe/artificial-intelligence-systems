import { StepEvent, LabMetrics } from '@/types';
import { GraphModel, NeighborSortingStrategy } from '@common/graph/graph-model';

export interface BFSOptions {
    model: GraphModel;
    startId: number;
    goalId: number;
    sortingStrategy: NeighborSortingStrategy;
}

const benchmarkCache = new Map<string, number>();

export function clearBenchmarkCache(): void {
    benchmarkCache.clear();
}

/**
 * Synchronous, non-yielding pure BFS execution for fast benchmarking.
 */
export function runPureBFS(options: BFSOptions): {
    foundPath: number[] | null;
    openedCount: number;
    cyclesCount: number;
    isSuccess: boolean;
} {
    const { model, startId, goalId, sortingStrategy } = options;
    const startNode = model.getNode(startId);
    const goalNode = model.getNode(goalId);

    if (!startNode || !goalNode) {
        return { foundPath: null, openedCount: 0, cyclesCount: 0, isSuccess: false };
    }

    if (startId === goalId) {
        return { foundPath: [startId], openedCount: 1, cyclesCount: 1, isSuccess: true };
    }

    const queue: number[] = [startId];
    const visited = new Set<number>([startId]);
    const parentMap = new Map<number, number>();
    let cycleCounter = 0;
    let openedCounter = 0;
    let isGoalFound = false;

    while (queue.length > 0) {
        cycleCounter++;
        const currentId = queue.shift()!;
        openedCounter++;

        const neighbors = model.getNeighbors(currentId, sortingStrategy);
        const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));

        for (const neighborId of unvisitedNeighbors) {
            visited.add(neighborId);
            parentMap.set(neighborId, currentId);
            queue.push(neighborId);

            if (neighborId === goalId) {
                isGoalFound = true;
                break;
            }
        }

        if (isGoalFound) break;
    }

    if (isGoalFound) {
        const path: number[] = [];
        let curr: number | undefined = goalId;
        while (curr !== undefined) {
            path.unshift(curr);
            curr = parentMap.get(curr);
        }
        return { foundPath: path, openedCount: openedCounter, cyclesCount: cycleCounter, isSuccess: true };
    }

    return { foundPath: null, openedCount: openedCounter, cyclesCount: cycleCounter, isSuccess: false };
}

/**
 * Runs a micro-benchmark with JIT warm-up and caches the result by graph version and search params.
 */
export function benchmarkBFS(options: BFSOptions, iterations: number = 200): number {
    const { model, startId, goalId, sortingStrategy } = options;
    const key = `${model.getVersion()}_${startId}_${goalId}_${sortingStrategy}`;

    const cached = benchmarkCache.get(key);
    if (cached !== undefined) {
        return cached;
    }

    // Warm-up to trigger JIT optimization
    for (let i = 0; i < 15; i++) {
        runPureBFS(options);
    }

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
        runPureBFS(options);
    }
    const totalMs = performance.now() - t0;
    const avgDurationMs = totalMs / iterations;

    benchmarkCache.set(key, avgDurationMs);
    return avgDurationMs;
}

export function* runBFS(options: BFSOptions): Generator<StepEvent, LabMetrics, unknown> {
    const { model, startId, goalId, sortingStrategy } = options;

    const startNode = model.getNode(startId);
    const goalNode = model.getNode(goalId);

    let stepCounter = 0;
    let cycleCounter = 0;
    let openedCounter = 0;

    if (!startNode || !goalNode) {
        const errorMetrics: LabMetrics = {
            foundPath: null,
            pathLength: 0,
            openedVerticesCount: 0,
            cyclesCount: 0,
            executionTimeMs: 0,
            visitedOrder: [],
            isSuccess: false,
            statusText: 'Помилка: Початкова або цільова вершина не знайдена в графі',
        };
        yield {
            stepIndex: 0,
            currentNodeId: null,
            queue: [],
            visited: [],
            openedCount: 0,
            cycleCount: 0,
            actionDescription: errorMetrics.statusText,
            status: 'not-found',
        };
        return errorMetrics;
    }

    // FIFO Queue for BFS
    const queue: number[] = [startId];
    const visited = new Set<number>([startId]);
    const parentMap = new Map<number, number>();
    const visitedOrder: number[] = [startId];

    // Check if start is already goal
    if (startId === goalId) {
        const duration = benchmarkBFS(options);
        const metrics: LabMetrics = {
            foundPath: [startId],
            pathLength: 0,
            openedVerticesCount: 1,
            cyclesCount: 1,
            executionTimeMs: duration,
            visitedOrder: [startId],
            isSuccess: true,
            statusText: `Ціль v${goalId} співпадає з початковою вершиною v${startId}!`,
        };
        yield {
            stepIndex: ++stepCounter,
            currentNodeId: startId,
            queue: [],
            visited: [startId],
            openedCount: 1,
            cycleCount: 1,
            foundPath: [startId],
            actionDescription: metrics.statusText,
            status: 'found',
        };
        return metrics;
    }

    let isGoalFound = false;

    while (queue.length > 0) {
        cycleCounter++;
        const currentId = queue.shift()!;
        openedCounter++;

        // Get sorted neighbors according to selected lab strategy
        const neighbors = model.getNeighbors(currentId, sortingStrategy);
        const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));

        if (unvisitedNeighbors.length === 0) {
            yield {
                stepIndex: ++stepCounter,
                currentNodeId: currentId,
                queue: [...queue],
                visited: Array.from(visited),
                openedCount: openedCounter,
                cycleCount: cycleCounter,
                actionDescription: `Розкриття v${currentId} (цикл #${cycleCounter}). Вершина не має нових суміжних вершин.`,
                status: 'running',
            };
            continue;
        }

        for (const neighborId of unvisitedNeighbors) {
            visited.add(neighborId);
            visitedOrder.push(neighborId);
            parentMap.set(neighborId, currentId);
            queue.push(neighborId);

            yield {
                stepIndex: ++stepCounter,
                currentNodeId: currentId,
                activeEdge: { from: currentId, to: neighborId },
                queue: [...queue],
                visited: Array.from(visited),
                openedCount: openedCounter,
                cycleCount: cycleCounter,
                actionDescription: `Цикл #${cycleCounter} (v${currentId}): перехід по дузі v${currentId} -> v${neighborId}. Додавання v${neighborId} до черги`,
                status: 'running',
            };

            if (neighborId === goalId) {
                isGoalFound = true;
                break;
            }
        }

        if (isGoalFound) {
            break;
        }
    }

    const duration = benchmarkBFS(options);

    if (isGoalFound) {
        // Reconstruct path from goal to start
        const path: number[] = [];
        let curr: number | undefined = goalId;
        while (curr !== undefined) {
            path.unshift(curr);
            curr = parentMap.get(curr);
        }

        const metrics: LabMetrics = {
            foundPath: path,
            pathLength: path.length - 1,
            openedVerticesCount: openedCounter,
            cyclesCount: cycleCounter,
            executionTimeMs: duration,
            visitedOrder,
            isSuccess: true,
            statusText: `Ціль v${goalId} знайдено! Довжина шляху: ${path.length - 1} ребер.`,
        };

        yield {
            stepIndex: ++stepCounter,
            currentNodeId: goalId,
            queue: [...queue],
            visited: Array.from(visited),
            openedCount: openedCounter,
            cycleCount: cycleCounter,
            foundPath: path,
            actionDescription: ` Цільова вершина v${goalId} успішно знайдена! Побудовано найкоротший шлях: ${path.join(' -> ')}.`,
            status: 'found',
        };

        return metrics;
    } else {
        const metrics: LabMetrics = {
            foundPath: null,
            pathLength: 0,
            openedVerticesCount: openedCounter,
            cyclesCount: cycleCounter,
            executionTimeMs: duration,
            visitedOrder,
            isSuccess: false,
            statusText: `Шлях між вершинами v${startId} та v${goalId} не існує. Черга вичерпана.`,
        };

        yield {
            stepIndex: ++stepCounter,
            currentNodeId: null,
            queue: [],
            visited: Array.from(visited),
            openedCount: openedCounter,
            cycleCount: cycleCounter,
            actionDescription: `Пошук завершено. Цільова вершина v${goalId} недосяжна з v${startId}.`,
            status: 'not-found',
        };

        return metrics;
    }
}
