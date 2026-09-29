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

    public override addNode(
        x: number,
        y: number,
        label?: string,
        radius: number = 14
    ): GraphNode {
        let maxId = 0
        this.nodesMap.forEach((_, id) => {
            if (id > maxId) maxId = id
        })
        const newId = maxId + 1
        const node: GraphNode = {
            id: newId,
            label: label ?? `Місто ${newId}`,
            x,
            y,
            radius,
            state: 'idle',
        }
        this.nodesMap.set(newId, node)
        this.version++
        return node
    }

    public renameNode(nodeId: number, newLabel: string): void {
        const node = this.nodesMap.get(nodeId)
        if (node) {
            node.label = newLabel
            this.version++
        }
    }

    public setEdgeWeight(edgeId: string, weight: number): void {
        const edge = this.edgesList.find((e) => e.id === edgeId)
        if (edge) {
            edge.weight = weight
            this.version++
        }
    }

    public reloadPreset(
        coords?: Record<string, { x: number; y: number }>
    ): void {
        this.loadData(buildRoadsGraph(coords ?? INITIAL_CITY_COORDINATES))
    }
}
