import { StepEvent } from '@/types'

export type TransitionOperator = 'orthogonal' | 'diagonal' | 'all'

export type GridCoord = {
    r: number
    c: number
}

export function coordKey(coord: GridCoord): string {
    return `${coord.r},${coord.c}`
}

export function parseCoordKey(key: string): GridCoord {
    const [r, c] = key.split(',').map(Number)
    return { r, c }
}

export function areCoordsEqual(a: GridCoord, b: GridCoord): boolean {
    return a.r === b.r && a.c === b.c
}

export function isCoordInGrid(
    coord: GridCoord,
    rows: number,
    cols: number
): boolean {
    return coord.r >= 0 && coord.r < rows && coord.c >= 0 && coord.c < cols
}

export function addCoords(a: GridCoord, b: GridCoord): GridCoord {
    return { r: a.r + b.r, c: a.c + b.c }
}

export interface MazeSearchOptions {
    grid: number[][] // 0: passable, -1: wall
    start: GridCoord
    goal: GridCoord
    operator: TransitionOperator
}

export interface MazeMetrics {
    foundPath: GridCoord[] | null
    pathLength: number
    openedCellsCount: number
    cyclesCount: number
    executionTimeMs: number
    visitedOrder: GridCoord[]
    meetingPoint?: GridCoord | null
    searchSpaceReductionPct?: number
    isSuccess: boolean
    statusText: string
}

export type MazeStepEvent = StepEvent & {
    currentCell: GridCoord | null
    frontier: GridCoord[]
    visited: GridCoord[]
    forwardDistances: Record<string, number>
    backwardDistances?: Record<string, number>
    activeEdge?: { from: GridCoord; to: GridCoord }
    meetingPoint?: GridCoord | null
    foundPath?: GridCoord[]
    openedCount: number
    cycleCount: number
}
