import { GraphData, GraphNode, GraphEdge, NodeVisualState, EdgeVisualState } from '../../types';

export type NeighborSortingStrategy = 'ascending-id' | 'descending-id' | 'clockwise' | 'custom';

export interface GraphConstraints {
  allowCycles: boolean;
  allowDirectedEdges: boolean;
  allowUndirectedEdges: boolean;
  allowSelfLoops: boolean;
  maxEdgesPerNode: number;
}

export const DEFAULT_GRAPH_CONSTRAINTS: GraphConstraints = {
  allowCycles: true,
  allowDirectedEdges: true,
  allowUndirectedEdges: true,
  allowSelfLoops: false,
  maxEdgesPerNode: Infinity,
};

export const TREE_CONSTRAINTS: GraphConstraints = {
  allowCycles: false,
  allowDirectedEdges: false,
  allowUndirectedEdges: true,
  allowSelfLoops: false,
  maxEdgesPerNode: Infinity,
};

export const UNDIRECTED_GRAPH_CONSTRAINTS: GraphConstraints = {
  allowCycles: true,
  allowDirectedEdges: false,
  allowUndirectedEdges: true,
  allowSelfLoops: false,
  maxEdgesPerNode: Infinity,
};

export const DIRECTED_GRAPH_CONSTRAINTS: GraphConstraints = {
  allowCycles: true,
  allowDirectedEdges: true,
  allowUndirectedEdges: false,
  allowSelfLoops: false,
  maxEdgesPerNode: Infinity,
};

export interface EdgeValidationResult {
  valid: boolean;
  reason?: string;
}

export class GraphModel {
  private nodesMap: Map<number, GraphNode> = new Map();
  private edgesList: GraphEdge[] = [];
  private constraints: GraphConstraints = DEFAULT_GRAPH_CONSTRAINTS;

  constructor(initialData?: GraphData, constraints: GraphConstraints = DEFAULT_GRAPH_CONSTRAINTS) {
    this.constraints = { ...constraints };
    if (initialData) {
      this.loadData(initialData);
    }
  }

  public setConstraints(constraints: Partial<GraphConstraints>): void {
    this.constraints = {
      ...this.constraints,
      ...constraints,
    };
  }

  public getConstraints(): GraphConstraints {
    return { ...this.constraints };
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
    return new GraphModel(this.getData(), this.constraints);
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

  /**
   * Checks if an undirected or directed path exists between two nodes.
   */
  public hasPath(fromId: number, toId: number, isDirected: boolean = false): boolean {
    if (fromId === toId) return true;
    if (!this.nodesMap.has(fromId) || !this.nodesMap.has(toId)) return false;

    const visited = new Set<number>([fromId]);
    const queue: number[] = [fromId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === toId) return true;

      const neighbors = this.getNeighbors(curr);
      for (const neighbor of neighbors) {
        if (isDirected) {
          const edge = this.edgesList.find(e => e.from === curr && e.to === neighbor && e.isDirected);
          if (!edge) continue;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  /**
   * Validates whether an edge can be added according to the model's structural constraints.
   */
  public canAddEdge(from: number, to: number, isDirected: boolean = false): EdgeValidationResult {
    if (from === to && !this.constraints.allowSelfLoops) {
      return { valid: false, reason: 'Петлі (ребра вершини до самої себе) заборонені' };
    }

    if (!this.nodesMap.has(from) || !this.nodesMap.has(to)) {
      return { valid: false, reason: 'Одна з вершин не існує в графі' };
    }

    if (isDirected && !this.constraints.allowDirectedEdges) {
      return { valid: false, reason: 'Орієнтовані дуги заборонені для цього типу графа' };
    }

    if (!isDirected && !this.constraints.allowUndirectedEdges) {
      return { valid: false, reason: 'Неорієнтовані ребра заборонені для орієнтованого графа' };
    }

    // Check if edge already exists
    const existing = this.edgesList.find(e => 
      (e.from === from && e.to === to) || 
      (!isDirected && !e.isDirected && e.from === to && e.to === from)
    );
    if (existing) {
      return { valid: true };
    }

    // Max degree check
    const fromDegree = this.edgesList.filter(e => e.from === from || (!e.isDirected && e.to === from)).length;
    const toDegree = this.edgesList.filter(e => e.to === to || (!e.isDirected && e.from === to)).length;
    if (fromDegree >= this.constraints.maxEdgesPerNode || toDegree >= this.constraints.maxEdgesPerNode) {
      return {
        valid: false,
        reason: `Перевищено максимальну кількість зв'язків для вершини (${this.constraints.maxEdgesPerNode})`,
      };
    }

    // Cycle invariant check
    if (!this.constraints.allowCycles) {
      if (!isDirected && this.hasPath(from, to, false)) {
        return {
          valid: false,
          reason: 'Неможливо створити ребро: це утворить цикл (порушення структури дерева)',
        };
      }
      if (isDirected && this.hasPath(to, from, true)) {
        return {
          valid: false,
          reason: 'Неможливо створити дугу: це утворить орієнтований цикл',
        };
      }
    }

    return { valid: true };
  }

  public addEdge(from: number, to: number, isDirected: boolean = false, weight?: number): GraphEdge | null {
    const validation = this.canAddEdge(from, to, isDirected);
    if (!validation.valid) {
      console.warn(`[GraphModel] addEdge rejected: ${validation.reason}`);
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

    switch (strategy) {
      case 'ascending-id':
        return neighbors.sort((a, b) => a - b);

      case 'descending-id':
        return neighbors.sort((a, b) => b - a);

      case 'clockwise': {
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
