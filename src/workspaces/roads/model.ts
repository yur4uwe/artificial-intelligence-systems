import {
    DEFAULT_GRAPH_CONSTRAINTS,
    GraphModel,
} from '@/workspaces/graph/graph-model'
import { GraphData, GraphNode } from '@/workspaces/graph/types'
import { buildRoadsGraph, INITIAL_CITY_COORDINATES } from './presets'

export default class MapModel extends GraphModel {
    constructor(initialData?: GraphData) {
        super(initialData ?? buildRoadsGraph(), DEFAULT_GRAPH_CONSTRAINTS)
    }

    public findNodeByCityName(name: string): GraphNode | undefined {
        for (const node of this.nodesMap.values()) {
            if (node.label === name) return node
        }
        return undefined
    }

    public getRoadDistance(fromId: number, toId: number): number | undefined {
        for (const edge of this.edgesList) {
            if (
                (edge.from === fromId && edge.to === toId) ||
                (!edge.isDirected && edge.from === toId && edge.to === fromId)
            ) {
                return edge.weight
            }
        }
        return undefined
    }

    public reloadPreset(coords?: Record<string, { x: number; y: number }>): void {
        this.loadData(buildRoadsGraph(coords ?? INITIAL_CITY_COORDINATES))
    }
}
