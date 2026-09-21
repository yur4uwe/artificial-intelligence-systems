import { GridCoord } from '@/algorithms/maze/types'

export interface GridDimensions {
    rows: number
    cols: number
}

export interface MazePreset {
    id: string
    name: string
    rows: number
    cols: number
    start?: GridCoord
    goal?: GridCoord
    grid: number[][] // 0: passable, -1: wall
}

export interface CellVisualInfo {
    forwardDist?: number
    backwardDist?: number
    isStart?: boolean
    isGoal?: boolean
    isMeeting?: boolean
    isPath?: boolean
    isFrontier?: boolean
    isCurrent?: boolean
}
