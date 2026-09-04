import { GraphNode, GraphEdge } from '../../types';
import { GraphModel } from './graph-model';

export type CanvasInteractionMode = 
  | 'select' 
  | 'add-node' 
  | 'add-edge-undirected' 
  | 'add-edge-directed' 
  | 'set-start' 
  | 'set-goal' 
  | 'delete';

export interface CanvasCallbacks {
  onNodeClick?: (nodeId: number) => void;
  onNodeDoubleClick?: (nodeId: number) => void;
  onEdgeClick?: (edgeId: string) => void;
  onCanvasChange?: () => void;
  onSelectionChange?: (selectedNodeId: number | null) => void;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private model: GraphModel;
  private callbacks: CanvasCallbacks;

  // Interaction & Viewport State
  private mode: CanvasInteractionMode = 'select';
  private hoveredNodeId: number | null = null;
  private hoveredEdgeId: string | null = null;
  private selectedNodeId: number | null = null;
  private edgeSourceNodeId: number | null = null;

  private draggingNodeId: number | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private isPanning: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };

  private pan: { x: number; y: number } = { x: 0, y: 0 };
  private zoom: number = 1.0;
  private dpr: number = 1;

  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, model: GraphModel, callbacks: CanvasCallbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.model = model;
    this.callbacks = callbacks;

    this.initCanvasSize();
    this.attachEventListeners();
    this.requestRender();
  }

  public setModel(model: GraphModel): void {
    this.model = model;
    this.selectedNodeId = null;
    this.edgeSourceNodeId = null;
    this.requestRender();
  }

  public setMode(mode: CanvasInteractionMode): void {
    this.mode = mode;
    this.edgeSourceNodeId = null;
    this.requestRender();
  }

  public getMode(): CanvasInteractionMode {
    return this.mode;
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas;
  }

  public resetView(): void {
    this.pan = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.requestRender();
  }

  public fitToScreen(): void {
    const nodes = this.model.getNodes();
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });

    const padding = 60;
    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;

    const scaleX = this.canvas.clientWidth / graphWidth;
    const scaleY = this.canvas.clientHeight / graphHeight;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    this.pan = {
      x: this.canvas.clientWidth / 2 - centerX * this.zoom,
      y: this.canvas.clientHeight / 2 - centerY * this.zoom,
    };

    this.requestRender();
  }

  public requestRender = (): void => {
    if (this.animationFrameId !== null) return;
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.render();
    });
  };

  private initCanvasSize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
  }

  public resize(): void {
    this.initCanvasSize();
    this.requestRender();
  }

  // Transform coordinates from screen pixels to world coordinates
  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.pan.x) / this.zoom,
      y: (screenY - this.pan.y) / this.zoom,
    };
  }

  private findNodeAt(worldX: number, worldY: number): GraphNode | null {
    const nodes = this.model.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const radius = node.radius ?? 22;
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      if (dist <= radius + 4) {
        return node;
      }
    }
    return null;
  }

  private attachEventListeners(): void {
    const el = this.canvas;

    el.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public destroy(): void {
    const el = this.canvas;
    el.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private onPointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);

    const clickedNode = this.findNodeAt(world.x, world.y);

    // Middle button or Space+Drag for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.isPanning = true;
      this.panStart = { x: screenX - this.pan.x, y: screenY - this.pan.y };
      return;
    }

    if (e.button === 0) {
      switch (this.mode) {
        case 'select':
          if (clickedNode) {
            this.draggingNodeId = clickedNode.id;
            this.dragOffset = { x: world.x - clickedNode.x, y: world.y - clickedNode.y };
            this.selectedNodeId = clickedNode.id;
            this.callbacks.onSelectionChange?.(clickedNode.id);
            this.callbacks.onNodeClick?.(clickedNode.id);
          } else {
            this.isPanning = true;
            this.panStart = { x: screenX - this.pan.x, y: screenY - this.pan.y };
            this.selectedNodeId = null;
            this.callbacks.onSelectionChange?.(null);
          }
          break;

        case 'add-node':
          if (!clickedNode) {
            const newNode = this.model.addNode(Math.round(world.x), Math.round(world.y));
            this.callbacks.onCanvasChange?.();
            this.selectedNodeId = newNode.id;
            this.callbacks.onSelectionChange?.(newNode.id);
          }
          break;

        case 'add-edge-undirected':
        case 'add-edge-directed':
          if (clickedNode) {
            if (this.edgeSourceNodeId === null) {
              this.edgeSourceNodeId = clickedNode.id;
            } else if (this.edgeSourceNodeId !== clickedNode.id) {
              const isDir = this.mode === 'add-edge-directed';
              this.model.addEdge(this.edgeSourceNodeId, clickedNode.id, isDir);
              this.edgeSourceNodeId = null;
              this.callbacks.onCanvasChange?.();
            }
          } else {
            this.edgeSourceNodeId = null;
          }
          break;

        case 'set-start':
          if (clickedNode) {
            this.callbacks.onNodeClick?.(clickedNode.id);
          }
          break;

        case 'set-goal':
          if (clickedNode) {
            this.callbacks.onNodeClick?.(clickedNode.id);
          }
          break;

        case 'delete':
          if (clickedNode) {
            this.model.removeNode(clickedNode.id);
            this.callbacks.onCanvasChange?.();
          }
          break;
      }
    }

    this.requestRender();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isPanning) {
      this.pan = {
        x: screenX - this.panStart.x,
        y: screenY - this.panStart.y,
      };
      this.requestRender();
      return;
    }

    const world = this.screenToWorld(screenX, screenY);

    if (this.draggingNodeId !== null) {
      const node = this.model.getNode(this.draggingNodeId);
      if (node) {
        node.x = Math.round(world.x - this.dragOffset.x);
        node.y = Math.round(world.y - this.dragOffset.y);
        this.callbacks.onCanvasChange?.();
        this.requestRender();
      }
      return;
    }

    // Hover detection
    const prevHovered = this.hoveredNodeId;
    const node = this.findNodeAt(world.x, world.y);
    this.hoveredNodeId = node ? node.id : null;

    if (prevHovered !== this.hoveredNodeId) {
      this.requestRender();
    }
  };

  private onPointerUp = (): void => {
    this.draggingNodeId = null;
    this.isPanning = false;
    this.requestRender();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.25), 3.5);

    // Zoom towards mouse pointer
    this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / this.zoom);
    this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / this.zoom);
    this.zoom = newZoom;

    this.requestRender();
  };

  // --- Rendering Pipeline ---

  public render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear background with rich subtle grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    this.drawBackgroundGrid(ctx);

    // Apply viewport transform (pan & zoom)
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, this.zoom);

    // 1. Draw Edges
    this.drawEdges(ctx);

    // 2. Draw Temporary Edge creation line
    if (this.edgeSourceNodeId !== null) {
      const sourceNode = this.model.getNode(this.edgeSourceNodeId);
      if (sourceNode) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(sourceNode.x, sourceNode.y, (sourceNode.radius ?? 22) + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Draw Nodes
    this.drawNodes(ctx);

    ctx.restore();
    ctx.restore();
  }

  private drawBackgroundGrid(ctx: CanvasRenderingContext2D): void {
    const clientW = this.canvas.clientWidth;
    const clientH = this.canvas.clientHeight;
    const gridSize = 32 * this.zoom;

    const offsetX = this.pan.x % gridSize;
    const offsetY = this.pan.y % gridSize;

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.18)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = offsetX; x < clientW; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, clientH);
    }
    for (let y = offsetY; y < clientH; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(clientW, y);
    }
    ctx.stroke();
  }

  private drawEdges(ctx: CanvasRenderingContext2D): void {
    const edges = this.model.getEdges();

    edges.forEach(edge => {
      const fromNode = this.model.getNode(edge.from);
      const toNode = this.model.getNode(edge.to);
      if (!fromNode || !toNode) return;

      const isPath = edge.state === 'path';
      const isActive = edge.state === 'active';
      const isTraversed = edge.state === 'traversed';

      let strokeColor = 'rgba(100, 116, 139, 0.45)';
      let lineWidth = 2;

      if (isPath) {
        strokeColor = '#ec4899'; // Vibrant Pink for solution path
        lineWidth = 4.5;
      } else if (isActive) {
        strokeColor = '#f59e0b'; // Amber yellow for current branch
        lineWidth = 3.5;
      } else if (isTraversed) {
        strokeColor = '#6366f1'; // Indigo for explored branch
        lineWidth = 2.5;
      }

      const fromR = fromNode.radius ?? 22;
      const toR = toNode.radius ?? 22;

      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;

      const unitX = dx / dist;
      const unitY = dy / dist;

      // Start and end clipped at node perimeters
      const startX = fromNode.x + unitX * fromR;
      const startY = fromNode.y + unitY * fromR;
      const endX = toNode.x - unitX * toR;
      const endY = toNode.y - unitY * toR;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw arrowhead for directed edges
      if (edge.isDirected) {
        const arrowSize = 10;
        const arrowAngle = Math.PI / 6; // 30 degrees
        const angle = Math.atan2(dy, dx);

        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - arrowAngle),
          endY - arrowSize * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + arrowAngle),
          endY - arrowSize * Math.sin(angle + arrowAngle)
        );
        ctx.closePath();
        ctx.fill();
      }

      // Draw weight label if specified
      if (edge.weight !== undefined) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - 12, midY - 9, 24, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${edge.weight}`, midX, midY);
        ctx.restore();
      }
    });
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    const nodes = this.model.getNodes();

    nodes.forEach(node => {
      const radius = node.radius ?? 22;
      const isHovered = this.hoveredNodeId === node.id;
      const isSelected = this.selectedNodeId === node.id;
      const state = node.state ?? 'idle';

      // Determine palette based on node state
      let fillGradient: CanvasGradient;
      let strokeColor = '#475569';
      let textColor = '#f8fafc';
      let haloColor: string | null = null;

      switch (state) {
        case 'start':
          haloColor = 'rgba(16, 185, 129, 0.4)';
          strokeColor = '#10b981';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#059669');
          fillGradient.addColorStop(1, '#064e3b');
          break;

        case 'goal':
          haloColor = 'rgba(244, 63, 94, 0.4)';
          strokeColor = '#f43f5e';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#e11d48');
          fillGradient.addColorStop(1, '#881337');
          break;

        case 'current':
          haloColor = 'rgba(245, 158, 11, 0.6)';
          strokeColor = '#f59e0b';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#d97706');
          fillGradient.addColorStop(1, '#78350f');
          break;

        case 'in-queue':
          haloColor = 'rgba(6, 182, 212, 0.35)';
          strokeColor = '#06b6d4';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#0284c7');
          fillGradient.addColorStop(1, '#0c4a6e');
          break;

        case 'visited':
          strokeColor = '#6366f1';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#4338ca');
          fillGradient.addColorStop(1, '#1e1b4b');
          break;

        case 'path':
          haloColor = 'rgba(236, 72, 153, 0.55)';
          strokeColor = '#ec4899';
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, '#db2777');
          fillGradient.addColorStop(1, '#701a75');
          break;

        default:
          fillGradient = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
          fillGradient.addColorStop(0, isHovered ? '#334155' : '#1e293b');
          fillGradient.addColorStop(1, '#0f172a');
          strokeColor = isSelected ? '#818cf8' : (isHovered ? '#64748b' : '#475569');
          break;
      }

      // Draw Halo Glow
      if (haloColor || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (isSelected ? 7 : 5), 0, Math.PI * 2);
        ctx.fillStyle = haloColor || 'rgba(129, 140, 248, 0.35)';
        ctx.fill();
      }

      // Draw Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillGradient;
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      // Node Label Text
      ctx.fillStyle = textColor;
      ctx.font = '600 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y);

      // Draw Visit Index badge (e.g. № 1, № 2)
      if (node.visitIndex !== undefined) {
        const badgeR = 9;
        const badgeX = node.x + radius * 0.7;
        const badgeY = node.y - radius * 0.7;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText(`${node.visitIndex}`, badgeX, badgeY);
      }

      // Start / Goal Tag Badges
      if (state === 'start') {
        this.drawTagBadge(ctx, node.x, node.y + radius + 11, 'START (S)', '#10b981');
      } else if (state === 'goal') {
        this.drawTagBadge(ctx, node.x, node.y + radius + 11, 'GOAL (G)', '#f43f5e');
      }
    });
  }

  private drawTagBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
    ctx.save();
    ctx.font = 'bold 10px Inter, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const padX = 6;
    const padY = 3;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - textWidth / 2 - padX, y - 8 - padY, textWidth + padX * 2, 16 + padY, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
