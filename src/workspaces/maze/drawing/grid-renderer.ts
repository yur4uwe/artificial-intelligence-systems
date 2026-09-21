import { MazeModel } from '../maze-model'
import { CanvasInteractionMode } from '../types'
import { DEFAULT_MAZE_TOKENS, MazeRenderTokens } from './render-tokens'
import { GridCoord } from '@/algorithms/maze/types'

export interface GridRendererCallbacks {
    onCellClick?: (coord: GridCoord) => void
    onModelChange?: () => void
}

export class GridRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private model: MazeModel
    private callbacks: GridRendererCallbacks
    private tokens: MazeRenderTokens = DEFAULT_MAZE_TOKENS

    private mode: CanvasInteractionMode = 'toggle-wall'
    private isMouseDown: boolean = false
    private drawWallValue: boolean = true // true = draw wall, false = erase wall
    private hoveredCell: GridCoord | null = null

    // Transform
    private zoom: number = 1
    private panX: number = 0
    private panY: number = 0
    private cellSize: number = 32
    private originX: number = 0
    private originY: number = 0

    private animFrameId: number | null = null
    private boundListeners: Array<{
        target: EventTarget
        type: string
        listener: EventListener
    }> = []

    constructor(
        canvas: HTMLCanvasElement,
        model: MazeModel,
        callbacks: GridRendererCallbacks = {}
    ) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d', { alpha: false })!
        this.model = model
        this.callbacks = callbacks

        this.initEvents()
        this.resize()
        this.zoomToFit()
    }

    public setModel(model: MazeModel): void {
        this.model = model
        this.zoomToFit()
        this.requestRender()
    }

    public setMode(mode: CanvasInteractionMode): void {
        this.mode = mode
        this.canvas.style.cursor =
            mode === 'toggle-wall' ? 'pointer' : 'crosshair'
    }

    public getMode(): CanvasInteractionMode {
        return this.mode
    }

    public getCanvasElement(): HTMLCanvasElement {
        return this.canvas
    }

    public resize(): void {
        const rect = this.canvas.parentElement?.getBoundingClientRect()
        const width = rect?.width || 800
        const height = rect?.height || 600
        const dpr = window.devicePixelRatio || 1

        this.canvas.width = Math.floor(width * dpr)
        this.canvas.height = Math.floor(height * dpr)
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`

        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        this.ctx.scale(dpr, dpr)

        this.zoomToFit()
        this.requestRender()
    }

    public zoomToFit(): void {
        const rect = this.canvas.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        const rows = this.model.getRows()
        const cols = this.model.getCols()

        const padding = 48
        const availableW = Math.max(100, width - padding * 2)
        const availableH = Math.max(100, height - padding * 2)

        const rawCellSize = Math.floor(
            Math.min(availableW / cols, availableH / rows)
        )
        this.cellSize = Math.max(16, Math.min(64, rawCellSize))

        const gridW = cols * this.cellSize
        const gridH = rows * this.cellSize

        this.originX = Math.floor((width - gridW) / 2)
        this.originY = Math.floor((height - gridH) / 2)
        this.zoom = 1
        this.panX = 0
        this.panY = 0

        this.requestRender()
    }

    public resetView(): void {
        this.zoomToFit()
    }

    public requestRender(): void {
        if (this.animFrameId !== null) return
        this.animFrameId = requestAnimationFrame(() => {
            this.animFrameId = null
            this.render()
        })
    }

    private initEvents(): void {
        const onPointerDown = (e: PointerEvent) => this.handlePointerDown(e)
        const onPointerMove = (e: PointerEvent) => this.handlePointerMove(e)
        const onPointerUp = (e: PointerEvent) => this.handlePointerUp(e)
        const onPointerLeave = () => this.handlePointerLeave()

        this.canvas.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        this.canvas.addEventListener('pointerleave', onPointerLeave)

        this.boundListeners.push(
            { target: this.canvas, type: 'pointerdown', listener: onPointerDown as EventListener },
            { target: window, type: 'pointermove', listener: onPointerMove as EventListener },
            { target: window, type: 'pointerup', listener: onPointerUp as EventListener },
            { target: this.canvas, type: 'pointerleave', listener: onPointerLeave as EventListener }
        )
    }

    private clientToGrid(clientX: number, clientY: number): GridCoord | null {
        const rect = this.canvas.getBoundingClientRect()
        const mouseX = clientX - rect.left
        const mouseY = clientY - rect.top

        const xInGrid = mouseX - this.originX
        const yInGrid = mouseY - this.originY

        if (xInGrid < 0 || yInGrid < 0) return null

        const c = Math.floor(xInGrid / this.cellSize)
        const r = Math.floor(yInGrid / this.cellSize)

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

    private handlePointerDown(e: PointerEvent): void {
        if (e.button !== 0) return // Left click only
        this.canvas.setPointerCapture(e.pointerId)
        this.isMouseDown = true

        const cell = this.clientToGrid(e.clientX, e.clientY)
        if (!cell) return

        if (this.mode === 'set-start') {
            this.model.setStart(cell.r, cell.c)
            this.callbacks.onCellClick?.(cell)
            this.requestRender()
            return
        }

        if (this.mode === 'set-goal') {
            this.model.setGoal(cell.r, cell.c)
            this.callbacks.onCellClick?.(cell)
            this.requestRender()
            return
        }

        // Mode: toggle-wall
        const isCurrentlyWall = this.model.isWall(cell.r, cell.c)
        this.drawWallValue = !isCurrentlyWall
        this.model.setWallState(cell.r, cell.c, this.drawWallValue)
        this.callbacks.onModelChange?.()
        this.requestRender()
    }

    private handlePointerMove(e: PointerEvent): void {
        const cell = this.clientToGrid(e.clientX, e.clientY)
        this.hoveredCell = cell

        if (this.isMouseDown && this.mode === 'toggle-wall' && cell) {
            this.model.setWallState(cell.r, cell.c, this.drawWallValue)
            this.callbacks.onModelChange?.()
        }

        this.requestRender()
    }

    private handlePointerUp(e: PointerEvent): void {
        this.isMouseDown = false
        try {
            this.canvas.releasePointerCapture(e.pointerId)
        } catch {}
    }

    private handlePointerLeave(): void {
        this.hoveredCell = null
        this.requestRender()
    }

    // --- Rendering Logic ---

    public render(): void {
        const rect = this.canvas.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const ctx = this.ctx

        ctx.save()
        ctx.fillStyle = this.tokens.background
        ctx.fillRect(0, 0, width, height)

        const rows = this.model.getRows()
        const cols = this.model.getCols()
        const start = this.model.getStart()
        const goal = this.model.getGoal()
        const cellSize = this.cellSize

        // Draw Row & Column Headers (coordinate indices)
        ctx.font = '10px ui-monospace, SFMono-Regular, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'

        // Col headers
        for (let c = 0; c < cols; c++) {
            const x = this.originX + c * cellSize + cellSize / 2
            const y = this.originY - 12
            ctx.fillText(`${c}`, x, y)
        }
        // Row headers
        for (let r = 0; r < rows; r++) {
            const x = this.originX - 16
            const y = this.originY + r * cellSize + cellSize / 2
            ctx.fillText(`${r}`, x, y)
        }

        // Draw Cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = this.originX + c * cellSize
                const y = this.originY + r * cellSize
                const isWall = this.model.isWall(r, c)
                const info = this.model.getVisualInfo(r, c)
                const isStart = r === start.r && c === start.c
                const isGoal = r === goal.r && c === goal.c

                // 1. Cell background
                if (isWall) {
                    ctx.fillStyle = this.tokens.cellWall
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

                    ctx.strokeStyle = this.tokens.cellWallBorder
                    ctx.lineWidth = 1
                    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                    continue
                }

                // Passable Cell Base
                ctx.fillStyle = this.tokens.cellPassable
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

                // 2. Wave Distances & State Fills
                if (info?.isMeeting) {
                    ctx.fillStyle = this.tokens.meetingFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                } else if (info?.isPath) {
                    ctx.fillStyle = this.tokens.pathFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                } else if (info?.forwardDist !== undefined && info?.backwardDist !== undefined) {
                    // Both waves reached
                    ctx.fillStyle = this.tokens.meetingFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                } else if (info?.forwardDist !== undefined) {
                    ctx.fillStyle = this.tokens.waveForwardFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                } else if (info?.backwardDist !== undefined) {
                    ctx.fillStyle = this.tokens.waveBackwardFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                }

                // 3. Start / Goal markers
                if (isStart) {
                    ctx.fillStyle = this.tokens.startFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                } else if (isGoal) {
                    ctx.fillStyle = this.tokens.goalFill
                    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
                }

                // 4. Cell Border
                ctx.strokeStyle = this.tokens.gridBorder
                ctx.lineWidth = 1
                ctx.strokeRect(x, y, cellSize, cellSize)

                // 5. Active state borders (Current / Frontier)
                if (info?.isCurrent) {
                    ctx.strokeStyle = this.tokens.currentStroke
                    ctx.lineWidth = 2
                    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
                } else if (info?.isFrontier) {
                    ctx.strokeStyle = this.tokens.frontierStroke
                    ctx.lineWidth = 1.5
                    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
                }

                // 6. Cell Text / Badges
                const fontSize = Math.max(9, Math.floor(cellSize * 0.38))
                ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'

                if (isStart) {
                    ctx.fillStyle = this.tokens.startText
                    ctx.fillText('S', x + cellSize / 2, y + cellSize / 2)
                } else if (isGoal) {
                    ctx.fillStyle = this.tokens.goalText
                    ctx.fillText('G', x + cellSize / 2, y + cellSize / 2)
                } else if (info?.forwardDist !== undefined && info?.backwardDist !== undefined) {
                    ctx.fillStyle = this.tokens.meetingText
                    ctx.fillText(
                        `${info.forwardDist}|${info.backwardDist}`,
                        x + cellSize / 2,
                        y + cellSize / 2
                    )
                } else if (info?.forwardDist !== undefined) {
                    ctx.fillStyle = this.tokens.waveForwardText
                    ctx.fillText(`${info.forwardDist}`, x + cellSize / 2, y + cellSize / 2)
                } else if (info?.backwardDist !== undefined) {
                    ctx.fillStyle = this.tokens.waveBackwardText
                    ctx.fillText(`${info.backwardDist}`, x + cellSize / 2, y + cellSize / 2)
                }
            }
        }

        // Draw Connecting Path Line if available
        this.renderPathPolyline()

        // Draw Hover Box
        if (this.hoveredCell) {
            const hx = this.originX + this.hoveredCell.c * cellSize
            const hy = this.originY + this.hoveredCell.r * cellSize
            ctx.fillStyle = this.tokens.hoverCell
            ctx.fillRect(hx, hy, cellSize, cellSize)

            ctx.strokeStyle =
                this.mode === 'set-start'
                    ? this.tokens.startStroke
                    : this.mode === 'set-goal'
                      ? this.tokens.goalStroke
                      : 'rgba(255, 255, 255, 0.4)'
            ctx.lineWidth = 1.5
            ctx.strokeRect(hx, hy, cellSize, cellSize)
        }

        ctx.restore()
    }

    private renderPathPolyline(): void {
        const rows = this.model.getRows()
        const cols = this.model.getCols()
        const pathCoords: GridCoord[] = []

        // Find path coordinates in sequential order if stored
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const info = this.model.getVisualInfo(r, c)
                if (info?.isPath) {
                    pathCoords.push({ r, c })
                }
            }
        }

        if (pathCoords.length < 2) return

        const ctx = this.ctx
        const cellSize = this.cellSize

        ctx.save()
        ctx.strokeStyle = this.tokens.pathLine
        ctx.lineWidth = Math.max(3, Math.floor(cellSize * 0.14))
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Connect path segments
        // We look for adjacent path cells
        for (let i = 0; i < pathCoords.length; i++) {
            const a = pathCoords[i]
            for (let j = i + 1; j < pathCoords.length; j++) {
                const b = pathCoords[j]
                const dr = Math.abs(a.r - b.r)
                const dc = Math.abs(a.c - b.c)
                if (dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)) {
                    const ax = this.originX + a.c * cellSize + cellSize / 2
                    const ay = this.originY + a.r * cellSize + cellSize / 2
                    const bx = this.originX + b.c * cellSize + cellSize / 2
                    const by = this.originY + b.r * cellSize + cellSize / 2

                    ctx.beginPath()
                    ctx.moveTo(ax, ay)
                    ctx.lineTo(bx, by)
                    ctx.stroke()
                }
            }
        }
        ctx.restore()
    }

    public destroy(): void {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
        for (const { target, type, listener } of this.boundListeners) {
            target.removeEventListener(type, listener)
        }
        this.boundListeners = []
    }
}
