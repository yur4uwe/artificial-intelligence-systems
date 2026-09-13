import { GraphModel, NeighborSortingStrategy } from '@wrkspc/graph/graph-model'
import { StepEvent } from '@/types'

export interface GraphOptions {
    model: GraphModel
    startId: number
    goalId: number
    sortingStrategy: NeighborSortingStrategy
}

export type GraphMetrics = {
    foundPath: number[] | null
    pathLength: number
    openedVerticesCount: number
    cyclesCount: number
    executionTimeMs: number
    visitedOrder: number[]
    isSuccess: boolean
    statusText: string
}

export type GraphStepEvent = StepEvent & {
    currentNodeId: number | null
    frontier: number[]
    visited: number[]
    openedCount: number
    cycleCount: number
    activeEdge?: { from: number; to: number }
    foundPath?: number[]
}
