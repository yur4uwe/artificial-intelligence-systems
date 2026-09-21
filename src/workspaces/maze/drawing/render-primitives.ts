import { ThemePalette } from '@common/theme/palette'
import { CellVisualInfo } from '../types'
import { GridCoord } from '@/algorithms/maze/types'

export interface CellDrawOptions {
    x: number
    y: number
    cellSize: number
    isWall: boolean
    isStart: boolean
    isGoal: boolean
    isHovered?: boolean
    info?: CellVisualInfo
}

/**
 * Draw a single maze grid cell directly using ThemePalette tokens,
 * mirroring graph workspace node state semantics.
 */
export function drawCell(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    opt: CellDrawOptions
): void {
    const { x, y, cellSize, isWall, isStart, isGoal, isHovered, info } = opt
    const nodeColors = theme.graph.nodes

    // 1. Wall Cell (-1)
    if (isWall) {
        ctx.fillStyle = nodeColors.wall.fillGradientStart
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

        ctx.strokeStyle = isHovered
            ? nodeColors.wall.strokeHover
            : nodeColors.wall.stroke
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        return
    }

    // 2. Passable Cell Base (0)
    ctx.fillStyle = nodeColors.idle.fillGradientStart
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

    ctx.strokeStyle = isHovered ? nodeColors.idle.strokeHover : theme.graph.grid
    ctx.lineWidth = isHovered ? 1.5 : 1
    ctx.strokeRect(x, y, cellSize, cellSize)

    // Determine state identically to Graph workspace
    let fillColor: string | null = null
    let strokeColor: string | null = null
    let textColor = theme.ui.textPrimary
    let textBadge: string | null = null
    let haloColor: string | null = null

    if (isStart) {
        haloColor = nodeColors.start.glow
        strokeColor = nodeColors.start.stroke
        fillColor = nodeColors.start.fillGradientStart
        textColor = nodeColors.start.text
        textBadge = 'S'
    } else if (isGoal) {
        haloColor = nodeColors.goal.glow
        strokeColor = nodeColors.goal.stroke
        fillColor = nodeColors.goal.fillGradientStart
        textColor = nodeColors.goal.text
        textBadge = 'G'
    } else if (info?.isPath) {
        // Exact identical highlight to graph path nodes
        haloColor = nodeColors.path.glow
        strokeColor = nodeColors.path.stroke
        fillColor = nodeColors.path.fillGradientStart
        textColor = nodeColors.path.text
        if (info.forwardDist !== undefined) {
            textBadge = `${info.forwardDist}`
        }
    } else if (info?.isMeeting) {
        haloColor = nodeColors.current.glow
        strokeColor = nodeColors.current.stroke
        fillColor = nodeColors.current.fillGradientStart
        textColor = nodeColors.current.text
        if (info.forwardDist !== undefined && info.backwardDist !== undefined) {
            textBadge = `${info.forwardDist}|${info.backwardDist}`
        }
    } else if (info?.forwardDist !== undefined && info?.backwardDist !== undefined) {
        haloColor = nodeColors.current.glow
        strokeColor = nodeColors.current.stroke
        fillColor = nodeColors.current.fillGradientStart
        textColor = nodeColors.current.text
        textBadge = `${info.forwardDist}|${info.backwardDist}`
    } else if (info?.forwardDist !== undefined) {
        // Forward wave
        if (info.isFrontier) {
            haloColor = nodeColors.inQueue.glow
            strokeColor = nodeColors.inQueue.stroke
            fillColor = nodeColors.inQueue.fillGradientStart
            textColor = nodeColors.inQueue.text
        } else {
            strokeColor = nodeColors.visited.stroke
            fillColor = nodeColors.visited.fillGradientStart
            textColor = nodeColors.visited.text
        }
        textBadge = `${info.forwardDist}`
    } else if (info?.backwardDist !== undefined) {
        // Backward wave (Lab 4 bidirectional)
        const secondWave = nodeColors.secondWave
        if (info.isFrontier) {
            haloColor = secondWave.glow
            strokeColor = secondWave.stroke
            fillColor = secondWave.fillGradientStart
            textColor = secondWave.text
        } else {
            strokeColor = secondWave.stroke
            fillColor = secondWave.glow
            textColor = theme.ui.textPrimary
        }
        textBadge = `${info.backwardDist}`
    }

    // 3. Fill state
    if (fillColor) {
        ctx.fillStyle = fillColor
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
    }

    // 4. Halo / Glow (for path, start, goal, current)
    if (haloColor) {
        ctx.save()
        ctx.strokeStyle = haloColor
        ctx.lineWidth = 3
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        ctx.restore()
    }

    // 5. Active state stroke
    if (info?.isCurrent) {
        ctx.strokeStyle = nodeColors.current.stroke
        ctx.lineWidth = 2.5
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
    } else if (strokeColor) {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1.5
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
    }

    // 6. Cell Text Label
    if (textBadge) {
        const fontSize = Math.max(9, Math.floor(cellSize * 0.38))
        ctx.font = `bold ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = textColor
        ctx.fillText(textBadge, x + cellSize / 2, y + cellSize / 2)
    }
}

/**
 * Draw connecting path polyline directly using theme.graph.edges.path,
 * with identical stroke color and width as graph path edges.
 */
export function drawPathPolyline(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    path: GridCoord[],
    cellSize: number
): void {
    if (!path || path.length < 2) return

    ctx.save()
    // Identical to graph workspace drawEdge: strokeColor = theme.graph.edges.path, lineWidth = 4.5
    ctx.strokeStyle = theme.graph.edges.path
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    for (let i = 0; i < path.length; i++) {
        const pt = path[i]
        const px = pt.c * cellSize + cellSize / 2
        const py = pt.r * cellSize + cellSize / 2
        if (i === 0) {
            ctx.moveTo(px, py)
        } else {
            ctx.lineTo(px, py)
        }
    }
    ctx.stroke()
    ctx.restore()
}

/**
 * Draw coordinate rulers using theme.ui.textSecondary
 */
export function drawGridRulers(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    rows: number,
    cols: number,
    cellSize: number
): void {
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = theme.ui.textSecondary

    // Column headers
    for (let c = 0; c < cols; c++) {
        const x = c * cellSize + cellSize / 2
        const y = -12
        ctx.fillText(`${c}`, x, y)
    }

    // Row headers
    for (let r = 0; r < rows; r++) {
        const x = -16
        const y = r * cellSize + cellSize / 2
        ctx.fillText(`${r}`, x, y)
    }
}
