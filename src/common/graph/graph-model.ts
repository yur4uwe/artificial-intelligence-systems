import { GraphData, GraphNode, GraphEdge, NodeVisualState, EdgeVisualState } from '../../types';

export type NeighborSortingStrategy = 'ascending-id' | 'descending-id' | 'clockwise' | 'custom';

export class GraphModel {
  private nodesMap: Map<number, GraphNode> = new Map();
  private edgesList: GraphEdge[] = [];

  constructor(initialData?: GraphData) {
    if (initialData) {
      this.loadData(initialData);
    }
  }

  public loadData(data: GraphData): void {
    this.nodesMap.clear();
    this.edgesList = [];

    data.nodes.forEach(node => {
      this.nodesMap.set(node.id, { ...node, radius: node.radius ?? 22, state: node.state ?? 'idle' });
    });

    data.edges.forEach(edge => {
      this.edgesList.push({ ...edge, state: edge.state ?? 'idle' });
    });
  }

  public getData(): GraphData {
    return {
      nodes: Array.from(this.nodesMap.values()).map(n => ({ ...n })),
      edges: this.edgesList.map(e => ({ ...e })),
    };
  }

  public clone(): GraphModel {
    return new GraphModel(this.getData());
  }

  public getNodes(): GraphNode[] {
    return Array.from(this.nodesMap.values());
  }

  public getNode(id: number): GraphNode | undefined {
    return this.nodesMap.get(id);
  }

  public getEdges(): GraphEdge[] {
    return this.edgesList;
  }

  public addNode(x: number, y: number, label?: string): GraphNode {
    // Determine next available ID
    let maxId = 0;
    this.nodesMap.forEach((_, id) => {
      if (id > maxId) maxId = id;
    });
    const newId = maxId + 1;
    const node: GraphNode = {
      id: newId,
      label: label ?? `${newId}`,
      x,
      y,
      radius: 22,
      state: 'idle',
    };
    this.nodesMap.set(newId, node);
    return node;
  }

  public removeNode(id: number): void {
    this.nodesMap.delete(id);
    this.edgesList = this.edgesList.filter(e => e.from !== id && e.to !== id);
  }

  public addEdge(from: number, to: number, isDirected: boolean = false, weight?: number): GraphEdge | null {
    if (from === to || !this.nodesMap.has(from) || !this.nodesMap.has(to)) {
      return null;
    }

    // Check if edge already exists
    const existing = this.edgesList.find(e => 
      (e.from === from && e.to === to) || 
      (!isDirected && !e.isDirected && e.from === to && e.to === from)
    );

    if (existing) {
      existing.isDirected = isDirected;
      if (weight !== undefined) existing.weight = weight;
      return existing;
    }

    const edge: GraphEdge = {
      id: `${from}-${to}-${isDirected ? 'dir' : 'undir'}-${Date.now()}`,
      from,
      to,
      isDirected,
      weight,
      state: 'idle',
    };
    this.edgesList.push(edge);
    return edge;
  }

  public removeEdge(id: string): void {
    this.edgesList = this.edgesList.filter(e => e.id !== id);
  }

  public toggleEdgeDirection(id: string): void {
    const edge = this.edgesList.find(e => e.id === id);
    if (edge) {
      edge.isDirected = !edge.isDirected;
    }
  }

  /**
   * Returns list of reachable neighbors for a given vertex ID, sorted by the given strategy.
   */
  public getNeighbors(nodeId: number, strategy: NeighborSortingStrategy = 'ascending-id'): number[] {
    const fromNode = this.nodesMap.get(nodeId);
    if (!fromNode) return [];

    const neighborsSet = new Set<number>();

    this.edgesList.forEach(edge => {
      if (edge.from === nodeId) {
        neighborsSet.add(edge.to);
      } else if (!edge.isDirected && edge.to === nodeId) {
        neighborsSet.add(edge.from);
      }
    });

    const neighbors = Array.from(neighborsSet);

    // Apply sorting strategy as requested by Lab 1 requirements
    switch (strategy) {
      case 'ascending-id':
        return neighbors.sort((a, b) => a - b);

      case 'descending-id':
        return neighbors.sort((a, b) => b - a);

      case 'clockwise': {
        // Sort by polar angle relative to fromNode (0 to 2*PI)
        return neighbors.sort((a, b) => {
          const nodeA = this.nodesMap.get(a)!;
          const nodeB = this.nodesMap.get(b)!;
          let angleA = Math.atan2(nodeA.y - fromNode.y, nodeA.x - fromNode.x);
          let angleB = Math.atan2(nodeB.y - fromNode.y, nodeB.x - fromNode.x);
          if (angleA < 0) angleA += 2 * Math.PI;
          if (angleB < 0) angleB += 2 * Math.PI;
          return angleA - angleB;
        });
      }

      default:
        return neighbors;
    }
  }

  public setNodeState(id: number, state: NodeVisualState, visitIndex?: number): void {
    const node = this.nodesMap.get(id);
    if (node) {
      node.state = state;
      if (visitIndex !== undefined) {
        node.visitIndex = visitIndex;
      }
    }
  }

  public setEdgeState(from: number, to: number, state: EdgeVisualState): void {
    this.edgesList.forEach(edge => {
      if (
        (edge.from === from && edge.to === to) ||
        (!edge.isDirected && edge.from === to && edge.to === from)
      ) {
        edge.state = state;
      }
    });
  }

  public resetVisualStates(keepStartAndGoal: { startId: number | null; goalId: number | null } = { startId: null, goalId: null }): void {
    this.nodesMap.forEach(node => {
      if (node.id === keepStartAndGoal.startId) {
        node.state = 'start';
      } else if (node.id === keepStartAndGoal.goalId) {
        node.state = 'goal';
      } else {
        node.state = 'idle';
      }
      delete node.visitIndex;
    });

    this.edgesList.forEach(edge => {
      edge.state = 'idle';
    });
  }
}
