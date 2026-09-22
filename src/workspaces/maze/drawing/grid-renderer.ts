import { MazeModel } from '../maze-model'
import { GridCoord } from '@/algorithms/maze/types'
import { getActiveTheme, onThemeChange } from '@common/theme/palette'
import {
    drawCell,
    drawCellBody,
    drawCellLabel,
    drawGridRulers,
    drawPathPolyline,
} from './render-primitives'

export interface MazeContextMenuEvent {
    clientX: number
    clientY: number
    cell: GridCoord | null
}

export interface GridRendererCallbacks {
    onCellClick?: (coord: GridCoord) => void
    onModelChange?: () => void
    onContextMenu?: (e: MazeContextMenuEvent) => void
}

export class GridRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private model: MazeModel
    private callbacks: GridRendererCallbacks
    private unsubscribeTheme?: () => void

    private hoveredCell: GridCoord | null = null

    // Viewport transform (Pan, Zoom, DPR)
    private pan: { x: number; y: number } = { x: 0, y: 0 }
    private zoom: number = 1.0
    private dpr: number = 1
    private cellSize: number = 36

    // Pan state
    private isPanning: boolean = false
    private panStart: { x: number; y: number } = { x: 0, y: 0 }
    private isSpaceDown: boolean = false

    private animFrameId: number | null = null
    private boundListeners: Array<{
        target: EventTarget
        type: string
        listener: EventListener
        options?: boolean | AddEventListenerOptions
    }> = []

    constructor(
        canvas: HTMLCanvasElement,
        model: MazeModel,
        callbacks: GridRendererCallbacks = {}
    ) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')!
        this.model = model
        this.callbacks = callbacks

        this.initEvents()
        this.resize()
        this.zoomToFit()

        this.unsubscribeTheme = onThemeChange(() => {
            this.requestRender()
        })
    }

    public setModel(model: MazeModel): void {
        this.model = model
        this.zoomToFit()
        this.requestRender()
    }

    public getCanvasElement(): HTMLCanvasElement {
        return this.canvas
    }

    public resize(): void {
        this.dpr = window.devicePixelRatio || 1
        const rect = this.canvas.getBoundingClientRect()
        this.canvas.width = Math.floor(rect.width * this.dpr)
        this.canvas.height = Math.floor(rect.height * this.dpr)
        this.requestRender()
    }

    /**
     * Scale and center the maze grid in the visible viewport,
     * specifically accounting for the floating bottom playback controller.
     */
    public zoomToFit(): void {
        const rect = this.canvas.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        if (width === 0 || height === 0) return

        const rows = this.model.getRows()
        const cols = this.model.getCols()

        // Reserve space for top rulers & bottom floating playback bar
        const bottomBarHeight = 90
        const paddingTop = 44
        const paddingBottom = bottomBarHeight + 16
        const paddingX = 48

        const availableW = Math.max(100, width - paddingX * 2)
        const availableH = Math.max(100, height - paddingTop - paddingBottom)

        this.cellSize = 36
        const totalGridW = cols * this.cellSize
        const totalGridH = rows * this.cellSize

        const scaleX = availableW / totalGridW
        const scaleY = availableH / totalGridH
        this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 2.2)

        // Center vertically in the visible portion above the playback bar
        const visibleCenterY = (paddingTop + (height - paddingBottom)) / 2
        this.pan = {
            x: Math.round(width / 2 - (totalGridW * this.zoom) / 2),
            y: Math.round(visibleCenterY - (totalGridH * this.zoom) / 2),
        }

        this.requestRender()
    }

    public resetView(): void {
        this.zoomToFit()
    }

    public resetZoom(): void {
        this.zoom = 1.0
        const rect = this.canvas.getBoundingClientRect()
        const totalGridW = this.model.getCols() * this.cellSize
        const totalGridH = this.model.getRows() * this.cellSize
        const bottomBarHeight = 90
        const paddingTop = 44
        const paddingBottom = bottomBarHeight + 16
        const visibleCenterY = (paddingTop + (rect.height - paddingBottom)) / 2
        this.pan = {
            x: Math.round(rect.width / 2 - totalGridW / 2),
            y: Math.round(visibleCenterY - totalGridH / 2),
        }
        this.requestRender()
    }

    public requestRender(): void {
        if (this.animFrameId !== null) return
        this.animFrameId = requestAnimationFrame(() => {
            this.animFrameId = null
            this.render()
        })
    }

    // --- Coordinate Transforms ---

    public screenToWorld(
        screenX: number,
        screenY: number
    ): { x: number; y: number } {
        return {
            x: (screenX - this.pan.x) / this.zoom,
            y: (screenY - this.pan.y) / this.zoom,
        }
    }

    public clientToGrid(clientX: number, clientY: number): GridCoord | null {
        const rect = this.canvas.getBoundingClientRect()
        const screenX = clientX - rect.left
        const screenY = clientY - rect.top
        const world = this.screenToWorld(screenX, screenY)

        const c = Math.floor(world.x / this.cellSize)
        const r = Math.floor(world.y / this.cellSize)

        if (
            r >= 0 &&
            r < this.model.getRows() &&
            c >= 0 &&
            c < this.model.getCols()
        ) {
            return { r, c }
        }
        return null
    }

    // --- Event Listeners ---

    private initEvents(): void {
        const onPointerDown = (e: PointerEvent) => this.handlePointerDown(e)
        const onPointerMove = (e: PointerEvent) => this.handlePointerMove(e)
        const onPointerUp = (e: PointerEvent) => this.handlePointerUp(e)
        const onPointerLeave = () => this.handlePointerLeave()
        const onContextMenu = (e: MouseEvent) => this.handleContextMenu(e)
        const onWheel = (e: WheelEvent) => this.handleWheel(e)
        const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e)
        const onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e)

        this.canvas.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        this.canvas.addEventListener('pointerleave', onPointerLeave)
        this.canvas.addEventListener('contextmenu', onContextMenu)
        this.canvas.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)

        this.boundListeners.push(
            {
                target: this.canvas,
                type: 'pointerdown',
                listener: onPointerDown as EventListener,
            },
            {
                target: window,
                type: 'pointermove',
                listener: onPointerMove as EventListener,
            },
            {
                target: window,
                type: 'pointerup',
                listener: onPointerUp as EventListener,
            },
            {
                target: this.canvas,
                type: 'pointerleave',
                listener: onPointerLeave as EventListener,
            },
            {
                target: this.canvas,
                type: 'contextmenu',
                listener: onContextMenu as EventListener,
            },
            {
                target: this.canvas,
                type: 'wheel',
                listener: onWheel as EventListener,
                options: { passive: false },
            },
            {
                target: window,
                type: 'keydown',
                listener: onKeyDown as EventListener,
            },
            {
                target: window,
                type: 'keyup',
                listener: onKeyUp as EventListener,
            }
        )
    }

    private handleContextMenu(e: MouseEvent): void {
        e.preventDefault()
        const cell = this.clientToGrid(e.clientX, e.clientY)
        this.callbacks.onContextMenu?.({
            clientX: e.clientX,
            clientY: e.clientY,
            cell,
        })
    }

    private handlePointerDown(e: PointerEvent): void {
        const rect = this.canvas.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const cell = this.clientToGrid(e.clientX, e.clientY)

        // Panning condition:
        // 1. Middle button (button === 1)
        // 2. Shift + Left button
        // 3. Space key is held down
        // 4. Click outside the grid cells
        const wantsPan =
            e.button === 1 ||
            (e.button === 0 && e.shiftKey) ||
            (e.button === 0 && this.isSpaceDown) ||
            (e.button === 0 && cell === null)

        if (wantsPan) {
            this.isPanning = true
            this.panStart = {
                x: screenX - this.pan.x,
                y: screenY - this.pan.y,
            }
            this.canvas.setPointerCapture(e.pointerId)
            this.canvas.style.cursor = 'grabbing'
            return
        }

        if (e.button !== 0 || !cell) return

        this.canvas.setPointerCapture(e.pointerId)

        const isCurrentlyWall = this.model.isWall(cell.r, cell.c)
        this.model.setWallState(cell.r, cell.c, !isCurrentlyWall)
        this.callbacks.onModelChange?.()
        this.requestRender()
    }

    private handlePointerMove(e: PointerEvent): void {
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

        const cell = this.clientToGrid(e.clientX, e.clientY)
        this.hoveredCell = cell

        this.requestRender()
    }

    private handlePointerUp(e: PointerEvent): void {
        if (this.isPanning) {
            this.isPanning = false
            this.canvas.style.cursor = 'crosshair'
        }

        try {
            this.canvas.releasePointerCapture(e.pointerId)
        } catch {}
        this.requestRender()
    }

    private handlePointerLeave(): void {
        this.hoveredCell = null
        this.requestRender()
    }

    private handleWheel(e: WheelEvent): void {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88
        const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.2), 3.5)

        // Zoom centered towards mouse pointer
        this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / this.zoom)
        this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / this.zoom)
        this.zoom = newZoom

        this.requestRender()
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.code === 'Space' && !this.isSpaceDown) {
            this.isSpaceDown = true
            if (!this.isPanning) {
                this.canvas.style.cursor = 'grab'
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (e.code === 'Space') {
            this.isSpaceDown = false
            if (!this.isPanning) {
                this.canvas.style.cursor = 'crosshair'
            }
        }
    }

    // --- Rendering Pipeline ---

    public render(): void {
        const width = this.canvas.clientWidth
        const height = this.canvas.clientHeight
        const ctx = this.ctx
        const theme = getActiveTheme()

        ctx.save()
        ctx.scale(this.dpr, this.dpr)

        // Canvas Background identical to graph workspace
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, width, height)

        // Viewport Transform (Pan & Zoom)
        ctx.save()
        ctx.translate(this.pan.x, this.pan.y)
        ctx.scale(this.zoom, this.zoom)

        const rows = this.model.getRows()
        const cols = this.model.getCols()
        const start = this.model.getStart()
        const goal = this.model.getGoal()
        const cellSize = this.cellSize

        // 1. Draw Row & Column Headers (coordinate indices)
        drawGridRulers(ctx, theme, rows, cols, cellSize)

        // 2. Draw Cell Bodies (fills, halos, borders)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellSize
                const y = r * cellSize
                const isWall = this.model.isWall(r, c)
                const info = this.model.getVisualInfo(r, c)
                const isStart = start !== null && r === start.r && c === start.c
                const isGoal = goal !== null && r === goal.r && c === goal.c

                const isHovered =
                    this.hoveredCell !== null &&
                    this.hoveredCell.r === r &&
                    this.hoveredCell.c === c &&
                    !this.isPanning

                drawCellBody(ctx, theme, {
                    x,
                    y,
                    cellSize,
                    isWall,
                    isStart,
                    isGoal,
                    isHovered,
                    info,
                })
            }
        }

        // 3. Draw Connecting Path Polyline (behind labels, on top of cell backgrounds)
        const currentPath = this.model.getPath()
        if (currentPath && currentPath.length > 1) {
            drawPathPolyline(ctx, theme, currentPath, cellSize)
        }

        // 4. Draw Cell Labels (numbers, 'S', 'G') ON TOP of the polyline
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isWall = this.model.isWall(r, c)
                if (isWall) continue

                const x = c * cellSize
                const y = r * cellSize
                const info = this.model.getVisualInfo(r, c)
                const isStart = start !== null && r === start.r && c === start.c
                const isGoal = goal !== null && r === goal.r && c === goal.c

                drawCellLabel(ctx, theme, {
                    x,
                    y,
                    cellSize,
                    isWall: false,
                    isStart,
                    isGoal,
                    info,
                })
            }
        }

        ctx.restore() // End Pan & Zoom
        ctx.restore() // End DPR scale
    }

    public destroy(): void {
        this.unsubscribeTheme?.()
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
        for (const { target, type, listener, options } of this.boundListeners) {
            target.removeEventListener(type, listener, options)
        }
        this.boundListeners = []
    }
}
