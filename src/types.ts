export type NodeVisualState = 
  | 'idle' 
  | 'start' 
  | 'goal' 
  | 'current' 
  | 'in-queue' 
  | 'visited' 
  | 'path';

export type EdgeVisualState = 
  | 'idle' 
  | 'active' 
  | 'traversed' 
  | 'path';

export interface GraphNode {
  id: number;
  label: string;
  x: number;
  y: number;
  radius?: number;
  state?: NodeVisualState;
  visitIndex?: number;
}

export interface GraphEdge {
  id: string;
  from: number;
  to: number;
  weight?: number;
  isDirected: boolean;
  state?: EdgeVisualState;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface StepEvent {
  stepIndex: number;
  currentNodeId: number | null;
  queue: number[];
  visited: number[];
  openedCount: number;
  cycleCount: number;
  activeEdge?: { from: number; to: number };
  actionDescription: string;
  foundPath?: number[];
  status: 'idle' | 'running' | 'found' | 'not-found';
}

export interface LabMetrics {
  foundPath: number[] | null;
  pathLength: number;
  openedVerticesCount: number;
  cyclesCount: number;
  executionTimeMs: number;
  visitedOrder: number[];
  isSuccess: boolean;
  statusText: string;
}

export interface LabManifest {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
  loader: () => Promise<LabModule>;
}

export interface LabModule {
  id: string;
  mount: (container: HTMLElement) => Promise<void> | void;
  unmount: () => void;
  exportData?: () => { filename: string; content: string; mimeType: string };
  exportScreenshot?: () => HTMLCanvasElement | null;
}
