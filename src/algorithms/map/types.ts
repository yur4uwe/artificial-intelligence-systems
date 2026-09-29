import { StepEvent } from '@/types'
import MapModel from '@/workspaces/roads/model'

export type DijkstraOptions = {
    model: MapModel
    startId: number
    goalId: number
}

export type DijkstraStepType =
    | 'init'
    | 'settle-node'
    | 'relax-edge'
    | 'skip-settled'
    | 'finish-found'
    | 'finish-none'

export type DijkstraStepEvent = StepEvent & {
    type: DijkstraStepType
    currentNodeId: number | null

    // Discrete delta payload (only populated when relevant to the step)
    settledNodeId?: number
    relaxedDistance?: {
        nodeId: number
        dist: number
        prevDist?: number
    }
    activeEdge?: {
        from: number
        to: number
        weight: number
    }

    // Final result payload
    foundPath?: number[]
    totalDistanceKm?: number
}

export type DijkstraMetrics = {
    foundPath: number[] | null
    pathCities: string[]
    totalDistanceKm: number
    settledCount: number
    relaxationsCount: number
    executionTimeMs: number
    visitedOrder: number[]
    isSuccess: boolean
    statusText: string
}
