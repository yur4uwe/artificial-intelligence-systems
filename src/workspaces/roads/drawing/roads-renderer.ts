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
    onConnectNodes?: (sourceNodeId: number, targetNodeId: number) => void
    onCanvasChange?: () => void
}

interface PillStyle {
    bg: string
    border: string
}

const DEFAULT_PILL_STYLE: PillStyle = {
    bg: 'rgba(15, 23, 42, 0.85)',
    border: 'rgba(255, 255, 255, 0.15)',
}

const CITY_PILL_STYLES: Record<string, PillStyle> = {
    start: { bg: 'rgba(34, 197, 94, 0.9)', border: '#4ade80' },
    goal: { bg: 'rgba(239, 68, 68, 0.9)', border: '#f87171' },
    current: { bg: 'rgba(180, 83, 9, 0.9)', border: '#fbbf24' },
    path: { bg: 'rgba(3, 105, 161, 0.9)', border: '#38bdf8' },
    'in-queue': { bg: 'rgba(12, 74, 110, 0.9)', border: '#38bdf8' },
    visited: { bg: 'rgba(30, 41, 59, 0.9)', border: '#64748b' },
}

export class RoadsCanvasRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private model: MapModel
    private callbacks: RoadsCanvasCallbacks

    // Map Image
    private mapImage: HTMLImageElement | null = null
    private isImageLoaded: boolean = false
    private mapOpacity: number = 0.6
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

    private draggingNodeId: number | null = null
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 }
    private hasDragged: boolean = false
    private edgeSourceNodeId: number | null = null
    private mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 }

    private labelWidthCache = new Map<string, number>()
    private distanceBadgeWidthCache = new Map<number, number>()

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
            this.mapImage.width = Math.round(
                this.mapImage.naturalWidth * this.mapImageScale
            )
            this.mapImage.height = Math.round(
                this.mapImage.naturalHeight * this.mapImageScale
            )
            this.fitMapToViewport()
            this.requestRender()
        }
    }

    public getMapImageScale(): number {
        return this.mapImageScale
    }

    public getImageDimensions(): {
        width: number
        height: number
        naturalWidth: number
        naturalHeight: number
    } | null {
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

    public resetView(): void {
        this.pan = { x: 0, y: 0 }
        this.zoom = 1.0
        this.requestRender()
    }

    public setEdgeSource(nodeId: number | null): void {
        this.edgeSourceNodeId = nodeId
        this.canvas.style.cursor = nodeId !== null ? 'crosshair' : 'default'
        this.requestRender()
    }

    public getEdgeSource(): number | null {
        return this.edgeSourceNodeId
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

    public worldToScreen(
        worldX: number,
        worldY: number
    ): { x: number; y: number } {
        return {
            x: worldX * this.zoom + this.pan.x,
            y: worldY * this.zoom + this.pan.y,
        }
    }

    private getCityLabelWidth(label: string): number {
        let width = this.labelWidthCache.get(label)
        if (width === undefined) {
            this.ctx.save()
            this.ctx.font = 'bold 11px Inter, sans-serif'
            width = this.ctx.measureText(label).width + 12
            this.ctx.restore()
            this.labelWidthCache.set(label, width)
        }
        return width
    }

    private findNodeAt(screenX: number, screenY: number): GraphNode | null {
        const nodes = this.model.getNodes()
        // Check marker circles first
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i]
            const radius = node.radius ?? 14
            const screen = this.worldToScreen(node.x, node.y)
            const dist = Math.hypot(screen.x - screenX, screen.y - screenY)
            if (dist <= radius + 6) {
                return node
            }
        }
        // Then check city label pills
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i]
            const radius = node.radius ?? 14
            const screen = this.worldToScreen(node.x, node.y)
            const pillW = this.getCityLabelWidth(node.label)
            const pillH = 16
            const pillX = screen.x - pillW / 2
            const pillY = screen.y + radius + 3
            if (
                screenX >= pillX &&
                screenX <= pillX + pillW &&
                screenY >= pillY &&
                screenY <= pillY + pillH
            ) {
                return node
            }
        }
        return null
    }

    private findEdgeAt(screenX: number, screenY: number): GraphEdge | null {
        const edges = this.model.getEdges()
        for (let i = edges.length - 1; i >= 0; i--) {
            const edge = edges[i]
            const from = this.model.getNode(edge.from)
            const to = this.model.getNode(edge.to)
            if (!from || !to) continue

            const fromScreen = this.worldToScreen(from.x, from.y)
            const toScreen = this.worldToScreen(to.x, to.y)

            const dist = this.pointToSegmentDistance(
                screenX,
                screenY,
                fromScreen.x,
                fromScreen.y,
                toScreen.x,
                toScreen.y
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
        window.addEventListener('pointermove', this.onPointerMove)
        window.addEventListener('pointerup', this.onPointerUp)
        this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
        this.canvas.addEventListener('contextmenu', this.onContextMenu)
        window.addEventListener('keydown', this.onKeyDown)
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && this.edgeSourceNodeId !== null) {
            this.edgeSourceNodeId = null
            this.canvas.style.cursor = 'default'
            this.requestRender()
        }
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

        if (e.button !== 0) return // Left click only for selection/pan/connecting

        // If in edge connecting mode
        if (this.edgeSourceNodeId !== null) {
            const targetNode = this.findNodeAt(screenX, screenY)
            if (targetNode && targetNode.id !== this.edgeSourceNodeId) {
                const sourceId = this.edgeSourceNodeId
                this.edgeSourceNodeId = null
                this.canvas.style.cursor = 'default'
                this.callbacks.onConnectNodes?.(sourceId, targetNode.id)
                this.requestRender()
                return
            } else {
                // Clicked same node or empty space -> cancel connecting
                this.edgeSourceNodeId = null
                this.canvas.style.cursor = 'default'
                this.requestRender()
                return
            }
        }

        const clickedNode = this.findNodeAt(screenX, screenY)
        if (clickedNode) {
            this.selectedNodeId = clickedNode.id
            this.draggingNodeId = clickedNode.id
            this.dragOffset = {
                x: world.x - clickedNode.x,
                y: world.y - clickedNode.y,
            }
            this.hasDragged = false
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
        this.mouseScreenPos = { x: screenX, y: screenY }

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
                this.hasDragged = true
                this.callbacks.onCanvasChange?.()
                this.requestRender()
            }
            return
        }

        if (this.edgeSourceNodeId !== null) {
            this.canvas.style.cursor = 'crosshair'
            this.requestRender()
            return
        }

        // Hover detection
        const prevHovered = this.hoveredNodeId
        const node = this.findNodeAt(screenX, screenY)
        this.hoveredNodeId = node ? node.id : null

        const prevHoveredEdge = this.hoveredEdgeId
        const edge = this.findEdgeAt(screenX, screenY)
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
        if (this.draggingNodeId !== null && !this.hasDragged) {
            this.callbacks.onNodeClick?.(this.draggingNodeId)
        }
        this.draggingNodeId = null
        this.hasDragged = false
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

        // Update hover states after zoom
        const node = this.findNodeAt(mouseX, mouseY)
        this.hoveredNodeId = node ? node.id : null
        const edge = this.findEdgeAt(mouseX, mouseY)
        this.hoveredEdgeId = edge ? edge.id : null
        this.canvas.style.cursor =
            this.hoveredNodeId !== null ? 'pointer' : 'default'

        this.requestRender()
    }

    private onContextMenu = (e: MouseEvent): void => {
        e.preventDefault()
        if (this.edgeSourceNodeId !== null) {
            this.edgeSourceNodeId = null
            this.canvas.style.cursor = 'default'
            this.requestRender()
            return
        }

        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        const clickedNode = this.findNodeAt(screenX, screenY)
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

        const clickedEdge = this.findEdgeAt(screenX, screenY)
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

        // 2. Draw Ukraine Map Image Underlay (transformed by pan and zoom)
        if (this.showMapImage && this.mapImage && this.isImageLoaded) {
            ctx.save()
            ctx.translate(this.pan.x, this.pan.y)
            ctx.scale(this.zoom, this.zoom)
            ctx.globalAlpha = this.mapOpacity
            const imgW = this.mapImage.width || this.mapImage.naturalWidth
            const imgH = this.mapImage.height || this.mapImage.naturalHeight
            ctx.drawImage(this.mapImage, 0, 0, imgW, imgH)
            ctx.restore()
        }

        // 3. Draw Road Edges with Kilometers (screen space, fixed relative size)
        this.drawEdges(ctx, theme)

        // 4. Draw City Nodes with Labels (screen space, fixed relative size)
        this.drawNodes(ctx, theme)

        // 5. Draw temporary edge connecting line
        if (this.edgeSourceNodeId !== null) {
            const sourceNode = this.model.getNode(this.edgeSourceNodeId)
            if (sourceNode) {
                const sourceScreen = this.worldToScreen(sourceNode.x, sourceNode.y)
                ctx.save()
                ctx.strokeStyle = theme.graph.tempEdgeLine
                ctx.lineWidth = 2.5
                ctx.setLineDash([6, 4])
                ctx.beginPath()
                ctx.moveTo(sourceScreen.x, sourceScreen.y)
                ctx.lineTo(this.mouseScreenPos.x, this.mouseScreenPos.y)
                ctx.stroke()

                // Highlight source circle
                ctx.beginPath()
                ctx.arc(
                    sourceScreen.x,
                    sourceScreen.y,
                    (sourceNode.radius ?? 14) + 6,
                    0,
                    Math.PI * 2
                )
                ctx.stroke()
                ctx.restore()
            }
        }

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

            const fromScreen = this.worldToScreen(from.x, from.y)
            const toScreen = this.worldToScreen(to.x, to.y)

            const dx = toScreen.x - fromScreen.x
            const dy = toScreen.y - fromScreen.y
            const dist = Math.hypot(dx, dy)
            if (dist === 0) return

            const fromR = from.radius ?? 14
            const toR = to.radius ?? 14

            let startX: number
            let startY: number
            let endX: number
            let endY: number

            if (dist > fromR + toR) {
                startX = fromScreen.x + (dx / dist) * fromR
                startY = fromScreen.y + (dy / dist) * fromR
                endX = toScreen.x - (dx / dist) * toR
                endY = toScreen.y - (dy / dist) * toR
            } else {
                startX = fromScreen.x
                startY = fromScreen.y
                endX = toScreen.x
                endY = toScreen.y
            }

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
        let textWidth = this.distanceBadgeWidthCache.get(weight)
        if (textWidth === undefined) {
            textWidth = ctx.measureText(text).width
            this.distanceBadgeWidthCache.set(weight, textWidth)
        }
        const padX = 5
        const boxW = textWidth + padX * 2
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
            const screen = this.worldToScreen(node.x, node.y)

            let fillColor = nodeColors.idle.fillGradientStart
            let strokeColor = nodeColors.idle.stroke
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
                case 'in-queue':
                    haloColor = nodeColors.inQueue.glow
                    strokeColor = nodeColors.inQueue.stroke
                    fillColor = nodeColors.inQueue.fillGradientStart
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
                ctx.arc(screen.x, screen.y, radius + 7, 0, Math.PI * 2)
                ctx.fillStyle = haloColor
                ctx.globalAlpha = 0.35
                ctx.fill()
                ctx.restore()
            }

            // City Marker Circle
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = fillColor
            ctx.fill()
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = isHovered || isSelected ? 3 : 2
            ctx.stroke()

            // City Name Pill Below Node
            this.drawCityLabel(
                ctx,
                screen.x,
                screen.y + radius + 3,
                node.label,
                node.state
            )
        })
    }

    private drawCityLabel(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        label: string,
        state?: string
    ): void {
        const pillW = this.getCityLabelWidth(label)
        const pillH = 16

        const style = (state && CITY_PILL_STYLES[state]) || DEFAULT_PILL_STYLE

        ctx.save()
        ctx.fillStyle = style.bg
        ctx.beginPath()
        ctx.roundRect(x - pillW / 2, y, pillW, pillH, 4)
        ctx.fill()

        ctx.strokeStyle = style.border
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, x, y + pillH / 2)
        ctx.restore()
    }

    public destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown)
        window.removeEventListener('pointermove', this.onPointerMove)
        window.removeEventListener('pointerup', this.onPointerUp)
        this.canvas.removeEventListener('wheel', this.onWheel)
        this.canvas.removeEventListener('contextmenu', this.onContextMenu)
        window.removeEventListener('keydown', this.onKeyDown)
        this.unsubscribeTheme?.()
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
        }
    }
}
