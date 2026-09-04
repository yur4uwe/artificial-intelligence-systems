import { GraphData, GraphNode, GraphEdge } from '../../types';

/**
 * Creates explicit 32-vertex layout with fixed coordinates (>= 30 vertices, >= 30-40 edges, >= 5 levels).
 */
export function createTreePreset(): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 5 Levels Hierarchy
  // Level 1: Root (1)
  nodes.push({ id: 1, label: '1', x: 600, y: 70 });

  // Level 2: 3 children (2, 3, 4)
  nodes.push({ id: 2, label: '2', x: 260, y: 170 });
  nodes.push({ id: 3, label: '3', x: 600, y: 170 });
  nodes.push({ id: 4, label: '4', x: 940, y: 170 });

  edges.push({ id: '1-2', from: 1, to: 2, isDirected: false });
  edges.push({ id: '1-3', from: 1, to: 3, isDirected: false });
  edges.push({ id: '1-4', from: 1, to: 4, isDirected: false });

  // Level 3: 7 children (5, 6, 7, 8, 9, 10, 11)
  nodes.push({ id: 5, label: '5', x: 140, y: 280 });
  nodes.push({ id: 6, label: '6', x: 260, y: 280 });
  nodes.push({ id: 7, label: '7', x: 380, y: 280 });

  nodes.push({ id: 8, label: '8', x: 530, y: 280 });
  nodes.push({ id: 9, label: '9', x: 670, y: 280 });

  nodes.push({ id: 10, label: '10', x: 820, y: 280 });
  nodes.push({ id: 11, label: '11', x: 1060, y: 280 });

  edges.push({ id: '2-5', from: 2, to: 5, isDirected: false });
  edges.push({ id: '2-6', from: 2, to: 6, isDirected: false });
  edges.push({ id: '2-7', from: 2, to: 7, isDirected: false });
  edges.push({ id: '3-8', from: 3, to: 8, isDirected: false });
  edges.push({ id: '3-9', from: 3, to: 9, isDirected: false });
  edges.push({ id: '4-10', from: 4, to: 10, isDirected: false });
  edges.push({ id: '4-11', from: 4, to: 11, isDirected: false });

  // Level 4: 11 children (12..22)
  nodes.push({ id: 12, label: '12', x: 90, y: 400 });
  nodes.push({ id: 13, label: '13', x: 190, y: 400 });
  nodes.push({ id: 14, label: '14', x: 260, y: 400 });
  nodes.push({ id: 15, label: '15', x: 340, y: 400 });
  nodes.push({ id: 16, label: '16', x: 420, y: 400 });

  nodes.push({ id: 17, label: '17', x: 530, y: 400 });
  nodes.push({ id: 18, label: '18', x: 670, y: 400 });

  nodes.push({ id: 19, label: '19', x: 770, y: 400 });
  nodes.push({ id: 20, label: '20', x: 870, y: 400 });
  nodes.push({ id: 21, label: '21', x: 1000, y: 400 });
  nodes.push({ id: 22, label: '22', x: 1120, y: 400 });

  edges.push({ id: '5-12', from: 5, to: 12, isDirected: false });
  edges.push({ id: '5-13', from: 5, to: 13, isDirected: false });
  edges.push({ id: '6-14', from: 6, to: 14, isDirected: false });
  edges.push({ id: '7-15', from: 7, to: 15, isDirected: false });
  edges.push({ id: '7-16', from: 7, to: 16, isDirected: false });
  edges.push({ id: '8-17', from: 8, to: 17, isDirected: false });
  edges.push({ id: '9-18', from: 9, to: 18, isDirected: false });
  edges.push({ id: '10-19', from: 10, to: 19, isDirected: false });
  edges.push({ id: '10-20', from: 10, to: 20, isDirected: false });
  edges.push({ id: '11-21', from: 11, to: 21, isDirected: false });
  edges.push({ id: '11-22', from: 11, to: 22, isDirected: false });

  // Level 5: 10 leaves (23..32)
  nodes.push({ id: 23, label: '23', x: 70, y: 530 });
  nodes.push({ id: 24, label: '24', x: 140, y: 530 });
  nodes.push({ id: 25, label: '25', x: 260, y: 530 });
  nodes.push({ id: 26, label: '26', x: 380, y: 530 });
  nodes.push({ id: 27, label: '27', x: 490, y: 530 });
  nodes.push({ id: 28, label: '28', x: 570, y: 530 });
  nodes.push({ id: 29, label: '29', x: 670, y: 530 });
  nodes.push({ id: 30, label: '30', x: 820, y: 530 });
  nodes.push({ id: 31, label: '31', x: 1000, y: 530 });
  nodes.push({ id: 32, label: '32', x: 1120, y: 530 });

  edges.push({ id: '12-23', from: 12, to: 23, isDirected: false });
  edges.push({ id: '13-24', from: 13, to: 24, isDirected: false });
  edges.push({ id: '14-25', from: 14, to: 25, isDirected: false });
  edges.push({ id: '16-26', from: 16, to: 26, isDirected: false });
  edges.push({ id: '17-27', from: 17, to: 27, isDirected: false });
  edges.push({ id: '17-28', from: 17, to: 28, isDirected: false });
  edges.push({ id: '18-29', from: 18, to: 29, isDirected: false });
  edges.push({ id: '20-30', from: 20, to: 30, isDirected: false });
  edges.push({ id: '21-31', from: 21, to: 31, isDirected: false });
  edges.push({ id: '22-32', from: 22, to: 32, isDirected: false });

  return { nodes, edges };
}

/**
 * Creates Undirected Graph with 32 vertices and 45 edges (with cycles & cross-links).
 */
export function createUndirectedPreset(): GraphData {
  const base = createTreePreset();
  const edges = [...base.edges];

  // Add cross-links and cycle-forming edges
  const extraEdges = [
    { id: '2-3', from: 2, to: 3, isDirected: false },
    { id: '3-4', from: 3, to: 4, isDirected: false },
    { id: '5-6', from: 5, to: 6, isDirected: false },
    { id: '7-8', from: 7, to: 8, isDirected: false },
    { id: '9-10', from: 9, to: 10, isDirected: false },
    { id: '13-14', from: 13, to: 14, isDirected: false },
    { id: '16-17', from: 16, to: 17, isDirected: false },
    { id: '18-19', from: 18, to: 19, isDirected: false },
    { id: '20-21', from: 20, to: 21, isDirected: false },
    { id: '24-25', from: 24, to: 25, isDirected: false },
    { id: '26-27', from: 26, to: 27, isDirected: false },
    { id: '28-29', from: 28, to: 29, isDirected: false },
    { id: '30-31', from: 30, to: 31, isDirected: false },
    { id: '31-32', from: 31, to: 32, isDirected: false },
  ];

  extraEdges.forEach(e => edges.push(e));

  return { nodes: base.nodes, edges };
}

/**
 * Creates Directed Graph / Digraph with 32 vertices and 45 directed arcs.
 */
export function createDirectedPreset(): GraphData {
  const undir = createUndirectedPreset();
  const edges: GraphEdge[] = undir.edges.map(e => ({
    ...e,
    isDirected: true,
  }));

  // Re-orient some edges to create interesting paths, cycles, and bottlenecks
  const directedEdges: GraphEdge[] = [
    { id: 'd-1-2', from: 1, to: 2, isDirected: true },
    { id: 'd-1-3', from: 1, to: 3, isDirected: true },
    { id: 'd-1-4', from: 1, to: 4, isDirected: true },
    { id: 'd-2-3', from: 2, to: 3, isDirected: true },
    { id: 'd-3-4', from: 4, to: 3, isDirected: true },
    { id: 'd-2-5', from: 2, to: 5, isDirected: true },
    { id: 'd-2-6', from: 2, to: 6, isDirected: true },
    { id: 'd-2-7', from: 2, to: 7, isDirected: true },
    { id: 'd-3-8', from: 3, to: 8, isDirected: true },
    { id: 'd-3-9', from: 3, to: 9, isDirected: true },
    { id: 'd-4-10', from: 4, to: 10, isDirected: true },
    { id: 'd-4-11', from: 4, to: 11, isDirected: true },
    { id: 'd-5-6', from: 6, to: 5, isDirected: true },
    { id: 'd-7-8', from: 7, to: 8, isDirected: true },
    { id: 'd-9-10', from: 9, to: 10, isDirected: true },
    { id: 'd-5-12', from: 5, to: 12, isDirected: true },
    { id: 'd-5-13', from: 5, to: 13, isDirected: true },
    { id: 'd-6-14', from: 6, to: 14, isDirected: true },
    { id: 'd-7-15', from: 7, to: 15, isDirected: true },
    { id: 'd-7-16', from: 7, to: 16, isDirected: true },
    { id: 'd-8-17', from: 8, to: 17, isDirected: true },
    { id: 'd-9-18', from: 9, to: 18, isDirected: true },
    { id: 'd-10-19', from: 10, to: 19, isDirected: true },
    { id: 'd-10-20', from: 10, to: 20, isDirected: true },
    { id: 'd-11-21', from: 11, to: 21, isDirected: true },
    { id: 'd-11-22', from: 11, to: 22, isDirected: true },
    { id: 'd-13-14', from: 13, to: 14, isDirected: true },
    { id: 'd-16-17', from: 16, to: 17, isDirected: true },
    { id: 'd-18-19', from: 18, to: 19, isDirected: true },
    { id: 'd-20-21', from: 20, to: 21, isDirected: true },
    { id: 'd-12-23', from: 12, to: 23, isDirected: true },
    { id: 'd-13-24', from: 13, to: 24, isDirected: true },
    { id: 'd-14-25', from: 14, to: 25, isDirected: true },
    { id: 'd-16-26', from: 16, to: 26, isDirected: true },
    { id: 'd-17-27', from: 17, to: 27, isDirected: true },
    { id: 'd-17-28', from: 17, to: 28, isDirected: true },
    { id: 'd-18-29', from: 18, to: 29, isDirected: true },
    { id: 'd-20-30', from: 20, to: 30, isDirected: true },
    { id: 'd-21-31', from: 21, to: 31, isDirected: true },
    { id: 'd-22-32', from: 22, to: 32, isDirected: true },
    { id: 'd-24-25', from: 25, to: 24, isDirected: true },
    { id: 'd-26-27', from: 26, to: 27, isDirected: true },
    { id: 'd-28-29', from: 28, to: 29, isDirected: true },
    { id: 'd-30-31', from: 30, to: 31, isDirected: true },
    { id: 'd-31-32', from: 31, to: 32, isDirected: true },
  ];

  return { nodes: undir.nodes, edges: directedEdges };
}
