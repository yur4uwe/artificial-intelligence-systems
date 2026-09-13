export type NodeVisualState =
    'idle' | 'start' | 'goal' | 'current' | 'in-queue' | 'visited' | 'path'

export type EdgeVisualState = 'idle' | 'active' | 'traversed' | 'path'

export interface GraphNode {
    id: number
    label: string
    x: number
    y: number
    radius?: number
    state?: NodeVisualState
    visitIndex?: number
}

export interface GraphEdge {
    id: string
    from: number
    to: number
    weight?: number
    isDirected: boolean
    state?: EdgeVisualState
}

export interface GraphData {
    nodes: GraphNode[]
    edges: GraphEdge[]
}
