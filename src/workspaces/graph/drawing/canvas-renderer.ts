import { GraphEdge, GraphNode } from '../types'
import { GraphModel } from '../graph-model'
import {
    getActiveTheme,
    onThemeChange,
    ThemePalette,
} from '@common/theme/palette'
import { createNodeDrawer, createEdgeDrawer } from './render-primitives'

const TOLERANCE = 8

export type CanvasInteractionMode =
    | 'select'
    | 'add-node'
    | 'add-edge-undirected'
    | 'add-edge-directed'
    | 'set-start'
    | 'set-goal'
    | 'delete'

export type ContextMenuTarget =
    | { type: 'node'; nodeId: number }
    | { type: 'edge'; edgeId: string }
    | { type: 'canvas' }

export interface ContextMenuEvent {
    clientX: number
    clientY: number
    worldX: number
    worldY: number
    target: ContextMenuTarget
}

export interface CanvasCallbacks {
    onNodeClick?: (nodeId: number) => void
    onNodeDoubleClick?: (nodeId: number) => void
    onEdgeClick?: (edgeId: string) => void
    onCanvasChange?: () => void
    onSelectionChange?: (selectedNodeId: number | null) => void
    onContextMenu?: (e: ContextMenuEvent) => void
}

export class CanvasRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private model: GraphModel
    private callbacks: CanvasCallbacks

    // Interaction & Viewport State
    private mode: CanvasInteractionMode = 'select'
    private hoveredNodeId: number | null = null
    private hoveredEdgeId: string | null = null
    private selectedNodeId: number | null = null
    private edgeSourceNodeId: number | null = null

    private draggingNodeId: number | null = null
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 }
    private isPanning: boolean = false
    private panStart: { x: number; y: number } = { x: 0, y: 0 }

    private pan: { x: number; y: number } = { x: 0, y: 0 }
    private zoom: number = 1.0
    private dpr: number = 1

    private animationFrameId: number | null = null
    private unsubscribeTheme?: () => void

    constructor(
        canvas: HTMLCanvasElement,
        model: GraphModel,
        callbacks: CanvasCallbacks = {}
    ) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')!
        this.model = model
        this.callbacks = callbacks

        this.initCanvasSize()
        this.attachEventListeners()
        this.unsubscribeTheme = onThemeChange(() => this.requestRender())
        this.requestRender()
    }

    public setModel(model: GraphModel): void {
        this.model = model
        this.selectedNodeId = null
        this.edgeSourceNodeId = null
        this.requestRender()
    }

    public setMode(mode: CanvasInteractionMode): void {
        this.mode = mode
        this.edgeSourceNodeId = null
        this.requestRender()
    }

    public setEdgeSource(nodeId: number): void {
        this.edgeSourceNodeId = nodeId
        this.requestRender()
    }

    public getMode(): CanvasInteractionMode {
        return this.mode
    }

    public getCanvasElement(): HTMLCanvasElement {
        return this.canvas
    }

    public resetView(): void {
        this.pan = { x: 0, y: 0 }
        this.zoom = 1.0
        this.requestRender()
    }

    public zoomToFit(): void {
        const nodes = this.model.getNodes()
        if (nodes.length === 0) return

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity
        nodes.forEach((n) => {
            if (n.x < minX) minX = n.x
            if (n.y < minY) minY = n.y
            if (n.x > maxX) maxX = n.x
            if (n.y > maxY) maxY = n.y
        })

        const padding = 60
        const graphWidth = maxX - minX + padding * 2
        const graphHeight = maxY - minY + padding * 2

        const scaleX = this.canvas.clientWidth / graphWidth
        const scaleY = this.canvas.clientHeight / graphHeight
        this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.5)

        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2

        this.pan = {
            x: this.canvas.clientWidth / 2 - centerX * this.zoom,
            y: this.canvas.clientHeight / 2 - centerY * this.zoom,
        }

        this.requestRender()
    }

    public requestRender = (): void => {
        if (this.animationFrameId !== null) return
        this.animationFrameId = requestAnimationFrame(() => {
            this.animationFrameId = null
            this.render()
        })
    }

    private initCanvasSize(): void {
        this.dpr = window.devicePixelRatio || 1
        const rect = this.canvas.getBoundingClientRect()
        this.canvas.width = rect.width * this.dpr
        this.canvas.height = rect.height * this.dpr
    }

    public resize(): void {
        this.initCanvasSize()
        this.requestRender()
    }

    // Transform coordinates from screen pixels to world coordinates
    private screenToWorld(
        screenX: number,
        screenY: number
    ): { x: number; y: number } {
        return {
            x: (screenX - this.pan.x) / this.zoom,
            y: (screenY - this.pan.y) / this.zoom,
        }
    }

    private findNodeAt(worldX: number, worldY: number): GraphNode | null {
        const nodes = this.model.getNodes()
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i]
            const radius = node.radius ?? 22
            const dist = Math.hypot(node.x - worldX, node.y - worldY)
            if (dist <= radius + 4) {
                return node
            }
        }
        return null
    }

    private findEdgeAt(worldX: number, worldY: number): GraphEdge | null {
        const edges = this.model.getEdges()

        // Iterate backwards so top-most/latest rendered edges are hit first
        for (let i = edges.length - 1; i >= 0; i--) {
            const edge = edges[i]
            const from = this.model.getNode(edge.from)
            const to = this.model.getNode(edge.to)

            if (!from || !to) continue

            const dx = to.x - from.x
            const dy = to.y - from.y
            const lengthSq = dx * dx + dy * dy

            let projX: number
            let projY: number

            if (lengthSq === 0) {
                // Degenerate segment (endpoints overlap)
                projX = from.x
                projY = from.y
            } else {
                // Calculate normalized projection of point onto segment AB
                const t =
                    ((worldX - from.x) * dx + (worldY - from.y) * dy) / lengthSq
                const normT = Math.max(0, Math.min(1, t))

                // Closest point on the segment
                projX = from.x + normT * dx
                projY = from.y + normT * dy
            }

            const dist = Math.hypot(worldX - projX, worldY - projY)
            if (dist <= TOLERANCE) {
                return edge
            }
        }
        return null
    }

    private attachEventListeners(): void {
        const el = this.canvas

        el.addEventListener('pointerdown', this.onPointerDown)
        window.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('pointerup', this.onPointerUp)
        el.addEventListener('wheel', this.onWheel, { passive: false })
        el.addEventListener('contextmenu', this.onContextMenu)
    }

    public destroy(): void {
        const el = this.canvas
        el.removeEventListener('pointerdown', this.onPointerDown)
        window.removeEventListener('pointermove', this.onPointerMove)
        window.removeEventListener('pointerup', this.onPointerUp)
        el.removeEventListener('wheel', this.onWheel)
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
        }
        if (this.unsubscribeTheme) {
            this.unsubscribeTheme()
        }
    }

    private onContextMenu = (e: MouseEvent): void => {
        e.preventDefault()
        if (!this.callbacks.onContextMenu) {
            console.warn('No onContextMenu callback')
            return
        }
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        const clickedNode = this.findNodeAt(world.x, world.y)

        const clickedEdge = !clickedNode
            ? this.findEdgeAt(world.x, world.y)
            : null

        let target: ContextMenuTarget
        if (clickedNode) {
            target = { type: 'node', nodeId: clickedNode.id }
        } else if (clickedEdge) {
            target = { type: 'edge', edgeId: clickedEdge.id }
        } else {
            target = { type: 'canvas' }
        }

        this.callbacks.onContextMenu({
            clientX: e.clientX,
            clientY: e.clientY,
            worldX: Math.round(world.x),
            worldY: Math.round(world.y),
            target,
        })
    }

    private onPointerDown = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        const clickedNode = this.findNodeAt(world.x, world.y)

        // Middle button or Shift+Click for panning
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true
            this.panStart = { x: screenX - this.pan.x, y: screenY - this.pan.y }
            return
        }

        if (e.button !== 0) {
            return
        }

        if (!clickedNode) {
            switch (this.mode) {
                case 'add-node':
                    const newNode = this.model.addNode(
                        Math.round(world.x),
                        Math.round(world.y)
                    )
                    this.callbacks.onCanvasChange?.()
                    this.selectedNodeId = newNode.id
                    this.callbacks.onSelectionChange?.(newNode.id)
                    break
                case 'select':
                    this.isPanning = true
                    this.panStart = {
                        x: screenX - this.pan.x,
                        y: screenY - this.pan.y,
                    }
                    this.selectedNodeId = null
                    this.callbacks.onSelectionChange?.(null)
                    break
                case 'add-edge-undirected':
                case 'add-edge-directed':
                    this.edgeSourceNodeId = null
                    break
            }
            return
        }
        switch (this.mode) {
            case 'select':
                this.draggingNodeId = clickedNode.id
                this.dragOffset = {
                    x: world.x - clickedNode.x,
                    y: world.y - clickedNode.y,
                }
                this.selectedNodeId = clickedNode.id
                this.callbacks.onSelectionChange?.(clickedNode.id)
                this.callbacks.onNodeClick?.(clickedNode.id)
                break

            case 'add-edge-undirected':
            case 'add-edge-directed':
                if (this.edgeSourceNodeId === null) {
                    this.edgeSourceNodeId = clickedNode.id
                } else if (this.edgeSourceNodeId !== clickedNode.id) {
                    const isDir = this.mode === 'add-edge-directed'
                    this.model.addEdge(
                        this.edgeSourceNodeId,
                        clickedNode.id,
                        isDir
                    )
                    this.edgeSourceNodeId = null
                    this.callbacks.onCanvasChange?.()
                }
                break

            case 'set-start':
                this.callbacks.onNodeClick?.(clickedNode.id)
                break

            case 'set-goal':
                this.callbacks.onNodeClick?.(clickedNode.id)
                break

            case 'delete':
                this.model.removeNode(clickedNode.id)
                this.callbacks.onCanvasChange?.()
                break
        }

        this.requestRender()
    }

    private onPointerMove = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top

        if (this.isPanning) {
            this.pan = {
                x: screenX - this.panStart.x,
                y: screenY - this.panStart.y,
            }
            this.requestRender()
            return
        }

        const world = this.screenToWorld(screenX, screenY)

        if (this.draggingNodeId !== null) {
            const node = this.model.getNode(this.draggingNodeId)
            if (node) {
                node.x = Math.round(world.x - this.dragOffset.x)
                node.y = Math.round(world.y - this.dragOffset.y)
                this.callbacks.onCanvasChange?.()
                this.requestRender()
            }
            return
        }

        const prevHoveredEdge = this.hoveredEdgeId
        const edge = this.findEdgeAt(world.x, world.y)
        this.hoveredEdgeId = edge ? edge.id : null

        // Hover detection
        const prevHovered = this.hoveredNodeId
        const node = this.findNodeAt(world.x, world.y)
        this.hoveredNodeId = node ? node.id : null

        if (
            prevHovered !== this.hoveredNodeId ||
            prevHoveredEdge !== this.hoveredEdgeId
        ) {
            this.requestRender()
        }
    }

    private onPointerUp = (): void => {
        this.draggingNodeId = null
        this.isPanning = false
        this.requestRender()
    }

    private onWheel = (e: WheelEvent): void => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88
        const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.25), 3.5)

        // Zoom towards mouse pointer
        this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / this.zoom)
        this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / this.zoom)
        this.zoom = newZoom

        this.requestRender()
    }

    // --- Rendering Pipeline ---

    public render(): void {
        const ctx = this.ctx
        const theme = getActiveTheme()

        ctx.save()
        ctx.scale(this.dpr, this.dpr)

        // Clear background with theme background color
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight)

        // Apply viewport transform (pan & zoom)
        ctx.save()
        ctx.translate(this.pan.x, this.pan.y)
        ctx.scale(this.zoom, this.zoom)

        // 1. Draw Edges
        this.drawEdges(ctx, theme)

        // 2. Draw Temporary Edge creation line
        if (this.edgeSourceNodeId !== null) {
            const sourceNode = this.model.getNode(this.edgeSourceNodeId)
            if (sourceNode) {
                ctx.strokeStyle = theme.graph.tempEdgeLine
                ctx.lineWidth = 2.5
                ctx.setLineDash([6, 4])
                ctx.beginPath()
                ctx.arc(
                    sourceNode.x,
                    sourceNode.y,
                    (sourceNode.radius ?? 22) + 6,
                    0,
                    Math.PI * 2
                )
                ctx.stroke()
                ctx.setLineDash([])
            }
        }

        // 3. Draw Nodes
        this.drawNodes(ctx, theme)

        ctx.restore()
        ctx.restore()
    }

    private drawEdges(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette
    ): void {
        const renderEdge = createEdgeDrawer(ctx, theme, (id) =>
            this.model.getNode(id)
        )
        this.model.getEdges().forEach(renderEdge)
    }

    private drawNodes(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette
    ): void {
        const renderNode = createNodeDrawer(ctx, theme, {
            hoveredNodeId: this.hoveredNodeId,
            selectedNodeId: this.selectedNodeId,
        })
        this.model.getNodes().forEach(renderNode)
    }
}
