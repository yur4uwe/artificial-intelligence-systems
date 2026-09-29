import { GraphEdge, GraphNode } from '@/workspaces/graph/types'
import MapModel from '../model'
import {
    getActiveTheme,
    onThemeChange,
    ThemePalette,
} from '@common/theme/palette'
import mapImageUrl from '../assets/map-of-ukraine.webp'

export type CanvasInteractionMode = 'select' | 'pan'

export interface RoadsContextMenuEvent {
    clientX: number
    clientY: number
    worldX: number
    worldY: number
    target:
        | { type: 'node'; node: GraphNode }
        | { type: 'edge'; edge: GraphEdge }
        | { type: 'canvas' }
}

export interface RoadsCanvasCallbacks {
    onNodeClick?: (nodeId: number) => void
    onContextMenu?: (e: RoadsContextMenuEvent) => void
}

export class RoadsCanvasRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private model: MapModel
    private callbacks: RoadsCanvasCallbacks

    // Map Image
    private mapImage: HTMLImageElement | null = null
    private isImageLoaded: boolean = false
    private mapOpacity: number = 0.85
    private showMapImage: boolean = true
    private mapImageScale: number = 0.55 // Hardcoded 55% scale for crisp 1600x1114 image (width: 880, height: 613)

    // Viewport transform
    private pan: { x: number; y: number } = { x: 0, y: 0 }
    private zoom: number = 1.0
    private dpr: number = 1

    // Interaction state
    private hoveredNodeId: number | null = null
    private hoveredEdgeId: string | null = null
    private selectedNodeId: number | null = null
    private isPanning: boolean = false
    private panStart: { x: number; y: number } = { x: 0, y: 0 }

    private animationFrameId: number | null = null
    private unsubscribeTheme?: () => void

    constructor(
        canvas: HTMLCanvasElement,
        model: MapModel,
        callbacks: RoadsCanvasCallbacks = {}
    ) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')!
        this.model = model
        this.callbacks = callbacks

        this.loadMapImage()
        this.initCanvasSize()
        this.attachEventListeners()
        this.unsubscribeTheme = onThemeChange(() => this.requestRender())
    }

    private loadMapImage(): void {
        const img = new Image()
        img.src = mapImageUrl
        img.onload = () => {
            img.width = Math.round(img.naturalWidth * this.mapImageScale)
            img.height = Math.round(img.naturalHeight * this.mapImageScale)
            this.mapImage = img
            this.isImageLoaded = true
            this.fitMapToViewport()
        }
    }

    public setMapImageScale(scale: number): void {
        this.mapImageScale = Math.max(0.1, Math.min(3.0, scale))
        if (this.mapImage && this.mapImage.naturalWidth) {
            this.mapImage.width = Math.round(this.mapImage.naturalWidth * this.mapImageScale)
            this.mapImage.height = Math.round(this.mapImage.naturalHeight * this.mapImageScale)
            this.fitMapToViewport()
            this.requestRender()
        }
    }

    public getMapImageScale(): number {
        return this.mapImageScale
    }

    public getImageDimensions(): { width: number; height: number; naturalWidth: number; naturalHeight: number } | null {
        if (!this.mapImage) return null
        return {
            width: this.mapImage.width,
            height: this.mapImage.height,
            naturalWidth: this.mapImage.naturalWidth,
            naturalHeight: this.mapImage.naturalHeight,
        }
    }

    public setMapOpacity(opacity: number): void {
        this.mapOpacity = Math.max(0, Math.min(1, opacity))
        this.requestRender()
    }

    public getMapOpacity(): number {
        return this.mapOpacity
    }

    public toggleMapImage(): boolean {
        this.showMapImage = !this.showMapImage
        this.requestRender()
        return this.showMapImage
    }

    public isMapVisible(): boolean {
        return this.showMapImage
    }

    public fitMapToViewport(): void {
        if (!this.mapImage) return
        const padding = 30
        const availWidth = this.canvas.clientWidth - padding * 2
        const availHeight = this.canvas.clientHeight - padding * 2

        const imgWidth = this.mapImage.width || this.mapImage.naturalWidth
        const imgHeight = this.mapImage.height || this.mapImage.naturalHeight

        const scaleX = availWidth / imgWidth
        const scaleY = availHeight / imgHeight
        this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 2.5)

        this.pan = {
            x: (this.canvas.clientWidth - imgWidth * this.zoom) / 2,
            y: (this.canvas.clientHeight - imgHeight * this.zoom) / 2,
        }

        this.requestRender()
    }

    public setModel(model: MapModel): void {
        this.model = model
        this.selectedNodeId = null
        this.requestRender()
    }

    public getCanvasElement(): HTMLCanvasElement {
        return this.canvas
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

    public screenToWorld(
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
            const radius = node.radius ?? 14
            const dist = Math.hypot(node.x - worldX, node.y - worldY)
            if (dist <= radius + 6) {
                return node
            }
        }
        return null
    }

    private findEdgeAt(worldX: number, worldY: number): GraphEdge | null {
        const edges = this.model.getEdges()
        for (let i = edges.length - 1; i >= 0; i--) {
            const edge = edges[i]
            const from = this.model.getNode(edge.from)
            const to = this.model.getNode(edge.to)
            if (!from || !to) continue

            const dist = this.pointToSegmentDistance(
                worldX,
                worldY,
                from.x,
                from.y,
                to.x,
                to.y
            )
            if (dist <= 8) {
                return edge
            }
        }
        return null
    }

    private pointToSegmentDistance(
        px: number,
        py: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): number {
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
        if (l2 === 0) return Math.hypot(px - x1, py - y1)
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
        t = Math.max(0, Math.min(1, t))
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))
    }

    private attachEventListeners(): void {
        this.canvas.addEventListener('pointerdown', this.onPointerDown)
        this.canvas.addEventListener('pointermove', this.onPointerMove)
        this.canvas.addEventListener('pointerup', this.onPointerUp)
        this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
        this.canvas.addEventListener('contextmenu', this.onContextMenu)
    }

    private onPointerDown = (e: PointerEvent): void => {
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        // Middle button or right button drags canvas pan
        if (e.button === 1 || (e.button === 2 && e.shiftKey)) {
            this.isPanning = true
            this.panStart = { x: screenX - this.pan.x, y: screenY - this.pan.y }
            return
        }

        if (e.button !== 0) return // Left click only for selection/pan

        const clickedNode = this.findNodeAt(world.x, world.y)
        if (clickedNode) {
            this.selectedNodeId = clickedNode.id
            this.callbacks.onNodeClick?.(clickedNode.id)
            this.requestRender()
        } else {
            // Clicked empty canvas -> start panning
            this.selectedNodeId = null
            this.isPanning = true
            this.panStart = { x: screenX - this.pan.x, y: screenY - this.pan.y }
            this.requestRender()
        }
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

        // Hover detection
        const prevHovered = this.hoveredNodeId
        const node = this.findNodeAt(world.x, world.y)
        this.hoveredNodeId = node ? node.id : null

        const prevHoveredEdge = this.hoveredEdgeId
        const edge = this.findEdgeAt(world.x, world.y)
        this.hoveredEdgeId = edge ? edge.id : null

        if (
            prevHovered !== this.hoveredNodeId ||
            prevHoveredEdge !== this.hoveredEdgeId
        ) {
            this.canvas.style.cursor =
                this.hoveredNodeId !== null ? 'pointer' : 'default'
            this.requestRender()
        }
    }

    private onPointerUp = (): void => {
        this.isPanning = false
        this.requestRender()
    }

    private onWheel = (e: WheelEvent): void => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88
        const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.3), 3.5)

        this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / this.zoom)
        this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / this.zoom)
        this.zoom = newZoom

        this.requestRender()
    }

    private onContextMenu = (e: MouseEvent): void => {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        const clickedNode = this.findNodeAt(world.x, world.y)
        if (clickedNode) {
            this.callbacks.onContextMenu?.({
                clientX: e.clientX,
                clientY: e.clientY,
                worldX: Math.round(world.x),
                worldY: Math.round(world.y),
                target: { type: 'node', node: clickedNode },
            })
            return
        }

        const clickedEdge = this.findEdgeAt(world.x, world.y)
        if (clickedEdge) {
            this.callbacks.onContextMenu?.({
                clientX: e.clientX,
                clientY: e.clientY,
                worldX: Math.round(world.x),
                worldY: Math.round(world.y),
                target: { type: 'edge', edge: clickedEdge },
            })
            return
        }

        this.callbacks.onContextMenu?.({
            clientX: e.clientX,
            clientY: e.clientY,
            worldX: Math.round(world.x),
            worldY: Math.round(world.y),
            target: { type: 'canvas' },
        })
    }

    // --- Rendering Pipeline ---

    public render(): void {
        const ctx = this.ctx
        const theme = getActiveTheme()

        ctx.save()
        ctx.scale(this.dpr, this.dpr)

        // 1. Clear background
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight)

        // 2. Viewport transform
        ctx.save()
        ctx.translate(this.pan.x, this.pan.y)
        ctx.scale(this.zoom, this.zoom)

        // 3. Draw Ukraine Map Image Underlay
        if (this.showMapImage && this.mapImage && this.isImageLoaded) {
            ctx.save()
            ctx.globalAlpha = this.mapOpacity
            const imgW = this.mapImage.width || this.mapImage.naturalWidth
            const imgH = this.mapImage.height || this.mapImage.naturalHeight
            ctx.drawImage(this.mapImage, 0, 0, imgW, imgH)
            ctx.restore()
        }

        // 4. Draw Road Edges with Kilometers
        this.drawEdges(ctx, theme)

        // 5. Draw City Nodes with Labels
        this.drawNodes(ctx, theme)

        ctx.restore()
        ctx.restore()
    }

    private drawEdges(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette
    ): void {
        const edges = this.model.getEdges()

        edges.forEach((edge) => {
            const from = this.model.getNode(edge.from)
            const to = this.model.getNode(edge.to)
            if (!from || !to) return

            const dx = to.x - from.x
            const dy = to.y - from.y
            const dist = Math.hypot(dx, dy)
            if (dist === 0) return

            const fromR = from.radius ?? 14
            const toR = to.radius ?? 14

            const startX = from.x + (dx / dist) * fromR
            const startY = from.y + (dy / dist) * fromR
            const endX = to.x - (dx / dist) * toR
            const endY = to.y - (dy / dist) * toR

            let strokeColor = theme.graph.edges.idle
            let lineWidth = 2.5

            if (edge.state === 'path') {
                strokeColor = theme.graph.edges.path
                lineWidth = 5
            } else if (edge.state === 'active') {
                strokeColor = theme.graph.edges.active
                lineWidth = 4
            } else if (edge.state === 'traversed') {
                strokeColor = theme.graph.edges.traversed
                lineWidth = 3
            }

            // Draw Highway Line
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.lineTo(endX, endY)
            ctx.stroke()

            // Draw Road Distance Badge (km)
            if (edge.weight !== undefined) {
                const midX = (startX + endX) / 2
                const midY = (startY + endY) / 2
                this.drawRoadDistanceBadge(
                    ctx,
                    theme,
                    midX,
                    midY,
                    edge.weight,
                    strokeColor
                )
            }
        })
    }

    private drawRoadDistanceBadge(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette,
        x: number,
        y: number,
        weight: number,
        strokeColor: string
    ): void {
        ctx.save()
        ctx.font = 'bold 9px Inter, sans-serif'
        const text = `${weight} км`
        const textMetrics = ctx.measureText(text)
        const padX = 5
        const boxW = textMetrics.width + padX * 2
        const boxH = 15

        ctx.fillStyle = theme.ui.bgSurface
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 4)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = theme.ui.textPrimary
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x, y)
        ctx.restore()
    }

    private drawNodes(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette
    ): void {
        const nodes = this.model.getNodes()

        nodes.forEach((node) => {
            const isHovered = this.hoveredNodeId === node.id
            const isSelected = this.selectedNodeId === node.id
            const radius = node.radius ?? 14
            const nodeColors = theme.graph.nodes

            let fillColor = nodeColors.idle.fillGradientStart
            let strokeColor = nodeColors.idle.stroke
            let textColor = '#ffffff'
            let haloColor: string | null = null

            switch (node.state) {
                case 'start':
                    haloColor = nodeColors.start.glow
                    strokeColor = nodeColors.start.stroke
                    fillColor = nodeColors.start.fillGradientStart
                    break
                case 'goal':
                    haloColor = nodeColors.goal.glow
                    strokeColor = nodeColors.goal.stroke
                    fillColor = nodeColors.goal.fillGradientStart
                    break
                case 'current':
                    haloColor = nodeColors.current.glow
                    strokeColor = nodeColors.current.stroke
                    fillColor = nodeColors.current.fillGradientStart
                    break
                case 'path':
                    haloColor = nodeColors.path.glow
                    strokeColor = nodeColors.path.stroke
                    fillColor = nodeColors.path.fillGradientStart
                    break
                case 'visited':
                    strokeColor = nodeColors.visited.stroke
                    fillColor = nodeColors.visited.fillGradientStart
                    break
            }

            // Glow Halo on hover/selection
            if (isSelected) {
                haloColor = theme.ui.accentPrimary
            }

            if (haloColor) {
                ctx.save()
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius + 7, 0, Math.PI * 2)
                ctx.fillStyle = haloColor
                ctx.globalAlpha = 0.35
                ctx.fill()
                ctx.restore()
            }

            // City Marker Circle
            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = fillColor
            ctx.fill()
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = isHovered || isSelected ? 3 : 2
            ctx.stroke()

            // City Name Pill Below Node
            this.drawCityLabel(
                ctx,
                theme,
                node.x,
                node.y + radius + 3,
                node.label,
                node.state
            )
        })
    }

    private drawCityLabel(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette,
        x: number,
        y: number,
        label: string,
        state?: string
    ): void {
        ctx.save()
        ctx.font = 'bold 11px Inter, sans-serif'
        const metrics = ctx.measureText(label)
        const padX = 6
        const padY = 2
        const pillW = metrics.width + padX * 2
        const pillH = 16

        // Label pill background for high contrast against map
        ctx.fillStyle =
            state === 'start'
                ? 'rgba(34, 197, 94, 0.9)'
                : state === 'goal'
                  ? 'rgba(239, 68, 68, 0.9)'
                  : 'rgba(15, 23, 42, 0.85)'
        ctx.beginPath()
        ctx.roundRect(x - pillW / 2, y, pillW, pillH, 4)
        ctx.fill()

        ctx.strokeStyle =
            state === 'start'
                ? '#4ade80'
                : state === 'goal'
                  ? '#f87171'
                  : 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x, y + pillH / 2)

        ctx.restore()
    }

    public destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown)
        this.canvas.removeEventListener('pointermove', this.onPointerMove)
        this.canvas.removeEventListener('pointerup', this.onPointerUp)
        this.canvas.removeEventListener('wheel', this.onWheel)
        this.canvas.removeEventListener('contextmenu', this.onContextMenu)
        this.unsubscribeTheme?.()
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
        }
    }
}
