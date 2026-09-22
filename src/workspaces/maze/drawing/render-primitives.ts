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
 * Helper to determine badge text, text color, and fill color for a cell
 */
export function getCellLabelInfo(
    theme: ThemePalette,
    opt: CellDrawOptions
): { textBadge: string | null; textColor: string; badgeBg: string } {
    const { isStart, isGoal, info } = opt
    const nodeColors = theme.graph.nodes
    let textBadge: string | null = null
    let textColor = theme.ui.textPrimary
    let badgeBg = nodeColors.idle.fillGradientStart

    if (isStart) {
        textBadge = 'S'
        textColor = nodeColors.start.text
        badgeBg = nodeColors.start.fillGradientStart
    } else if (isGoal) {
        textBadge = 'G'
        textColor = nodeColors.goal.text
        badgeBg = nodeColors.goal.fillGradientStart
    } else if (info?.isPath) {
        textColor = nodeColors.path.text
        badgeBg = nodeColors.path.fillGradientStart
        if (info.forwardDist !== undefined && info.backwardDist !== undefined) {
            textBadge = `${info.forwardDist}|${info.backwardDist}`
        } else if (info.forwardDist !== undefined) {
            textBadge = `${info.forwardDist}`
        } else if (info.backwardDist !== undefined) {
            textBadge = `${info.backwardDist}`
        }
    } else if (info?.isMeeting) {
        textColor = nodeColors.current.text
        badgeBg = nodeColors.current.fillGradientStart
        if (info.forwardDist !== undefined && info.backwardDist !== undefined) {
            textBadge = `${info.forwardDist}|${info.backwardDist}`
        }
    } else if (info?.forwardDist !== undefined && info?.backwardDist !== undefined) {
        textColor = nodeColors.current.text
        badgeBg = nodeColors.current.fillGradientStart
        textBadge = `${info.forwardDist}|${info.backwardDist}`
    } else if (info?.forwardDist !== undefined) {
        if (info.isFrontier) {
            textColor = nodeColors.inQueue.text
            badgeBg = nodeColors.inQueue.fillGradientStart
        } else {
            textColor = nodeColors.visited.text
            badgeBg = nodeColors.visited.fillGradientStart
        }
        textBadge = `${info.forwardDist}`
    } else if (info?.backwardDist !== undefined) {
        const secondWave = nodeColors.secondWave
        if (info.isFrontier) {
            textColor = secondWave.text
            badgeBg = secondWave.fillGradientStart
        } else {
            textColor = theme.ui.textPrimary
            badgeBg = secondWave.glow
        }
        textBadge = `${info.backwardDist}`
    }

    return { textBadge, textColor, badgeBg }
}

/**
 * Draw cell body (fill, halo, border). Does NOT draw text badge.
 */
export function drawCellBody(
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
    let haloColor: string | null = null

    if (isStart) {
        haloColor = nodeColors.start.glow
        strokeColor = nodeColors.start.stroke
        fillColor = nodeColors.start.fillGradientStart
    } else if (isGoal) {
        haloColor = nodeColors.goal.glow
        strokeColor = nodeColors.goal.stroke
        fillColor = nodeColors.goal.fillGradientStart
    } else if (info?.isPath) {
        haloColor = info.isMeeting ? nodeColors.current.glow : nodeColors.path.glow
        strokeColor = info.isMeeting ? nodeColors.current.stroke : nodeColors.path.stroke
        fillColor = nodeColors.path.fillGradientStart
    } else if (info?.isMeeting) {
        haloColor = nodeColors.current.glow
        strokeColor = nodeColors.current.stroke
        fillColor = nodeColors.current.fillGradientStart
    } else if (info?.forwardDist !== undefined && info?.backwardDist !== undefined) {
        haloColor = nodeColors.current.glow
        strokeColor = nodeColors.current.stroke
        fillColor = nodeColors.current.fillGradientStart
    } else if (info?.forwardDist !== undefined) {
        if (info.isFrontier) {
            haloColor = nodeColors.inQueue.glow
            strokeColor = nodeColors.inQueue.stroke
            fillColor = nodeColors.inQueue.fillGradientStart
        } else {
            strokeColor = nodeColors.visited.stroke
            fillColor = nodeColors.visited.fillGradientStart
        }
    } else if (info?.backwardDist !== undefined) {
        const secondWave = nodeColors.secondWave
        if (info.isFrontier) {
            haloColor = secondWave.glow
            strokeColor = secondWave.stroke
            fillColor = secondWave.fillGradientStart
        } else {
            strokeColor = secondWave.stroke
            fillColor = secondWave.glow
        }
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
}

/**
 * Draw cell label / badge ON TOP of path polyline and cell fills.
 */
export function drawCellLabel(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    opt: CellDrawOptions
): void {
    const { x, y, cellSize, isWall } = opt
    if (isWall) return

    const { textBadge, textColor, badgeBg } = getCellLabelInfo(theme, opt)
    if (!textBadge) return

    const cx = x + cellSize / 2
    const cy = y + cellSize / 2

    const scale =
        textBadge.length > 4 ? 0.25 : textBadge.length > 2 ? 0.32 : 0.38
    const fontSize = Math.max(8, Math.floor(cellSize * scale))
    ctx.font = `bold ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Clean halo stroke matching the cell background to prevent line overlap
    ctx.save()
    ctx.strokeStyle = badgeBg
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.strokeText(textBadge, cx, cy)

    // Crisp text fill on top
    ctx.fillStyle = textColor
    ctx.fillText(textBadge, cx, cy)
    ctx.restore()
}

/**
 * Draw a single maze grid cell directly using ThemePalette tokens.
 */
export function drawCell(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    opt: CellDrawOptions
): void {
    drawCellBody(ctx, theme, opt)
    drawCellLabel(ctx, theme, opt)
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
