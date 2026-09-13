import { ThemePalette } from '@common/theme/palette'
import { GraphNode, GraphEdge } from './types'

export interface NodeDrawOptions {
    x: number
    y: number
    radius?: number
    label: string
    state?: string
    isHovered?: boolean
    isSelected?: boolean
    visitIndex?: number
    tagBadge?: string
}

export interface EdgeDrawOptions {
    fromX: number
    fromY: number
    toX: number
    toY: number
    fromRadius?: number
    toRadius?: number
    state?: 'idle' | 'active' | 'traversed' | 'path' | 'temp' | string
    isDirected?: boolean
    weight?: number
}

export interface NodeDrawerContextOptions {
    hoveredNodeId?: number | null
    selectedNodeId?: number | null
}

/**
 * Primitive: Draw directional Arrowhead
 */
export function drawArrowhead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    size: number = 10
): void {
    const arrowAngle = Math.PI / 6 // 30 degrees
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
        x - size * Math.cos(angle - arrowAngle),
        y - size * Math.sin(angle - arrowAngle)
    )
    ctx.lineTo(
        x - size * Math.cos(angle + arrowAngle),
        y - size * Math.sin(angle + arrowAngle)
    )
    ctx.closePath()
    ctx.fill()
}

/**
 * Primitive: Draw Start/Goal Tag Badge
 */
export function drawTagBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
): void {
    ctx.save()
    ctx.font = 'bold 10px Inter, sans-serif'
    const textWidth = ctx.measureText(text).width
    const padX = 6
    const padY = 3

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(
        x - textWidth / 2 - padX,
        y - 8 - padY,
        textWidth + padX * 2,
        16 + padY,
        4
    )
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
    ctx.restore()
}

/**
 * Primitive: Draw Visit Index badge (top-right circular badge)
 */
export function drawVisitBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    visitIndex: number,
    badgeBg: string,
    borderBg: string,
    radius: number = 22
): void {
    const badgeR = 9
    const badgeX = x + radius * 0.7
    const badgeY = y - radius * 0.7

    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fillStyle = badgeBg
    ctx.fill()
    ctx.strokeStyle = borderBg
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 9px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${visitIndex}`, badgeX, badgeY)
}

/**
 * Primitive: Draw Edge Weight Badge
 */
export function drawWeightBadge(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    midX: number,
    midY: number,
    weight: number,
    strokeColor: string
): void {
    ctx.save()
    ctx.fillStyle = theme.ui.bgSurface
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(midX - 12, midY - 9, 24, 18, 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = theme.ui.textPrimary
    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${weight}`, midX, midY)
    ctx.restore()
}

/**
 * Primitive: Draw Single Node
 */
export function drawNode(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    opt: NodeDrawOptions
): void {
    const {
        x,
        y,
        radius = 22,
        label,
        state = 'idle',
        isHovered = false,
        isSelected = false,
        visitIndex,
        tagBadge,
    } = opt

    const nodeColors = theme.graph.nodes

    let fillColor: string
    let strokeColor: string
    let textColor = theme.ui.textPrimary
    let haloColor: string | null = null
    let badgeBg: string = theme.ui.accentPrimary

    switch (state) {
        case 'start':
            haloColor = nodeColors.start.glow
            strokeColor = nodeColors.start.stroke
            textColor = nodeColors.start.text
            badgeBg = nodeColors.start.badgeBg
            fillColor = nodeColors.start.fillGradientStart
            break

        case 'goal':
            haloColor = nodeColors.goal.glow
            strokeColor = nodeColors.goal.stroke
            textColor = nodeColors.goal.text
            badgeBg = nodeColors.goal.badgeBg
            fillColor = nodeColors.goal.fillGradientStart
            break

        case 'current':
            haloColor = nodeColors.current.glow
            strokeColor = nodeColors.current.stroke
            textColor = nodeColors.current.text
            fillColor = nodeColors.current.fillGradientStart
            break

        case 'in-queue':
            haloColor = nodeColors.inQueue.glow
            strokeColor = nodeColors.inQueue.stroke
            textColor = nodeColors.inQueue.text
            badgeBg = nodeColors.inQueue.badgeBg
            fillColor = nodeColors.inQueue.fillGradientStart
            break

        case 'visited':
            strokeColor = nodeColors.visited.stroke
            textColor = nodeColors.visited.text
            badgeBg = nodeColors.visited.badgeBg
            fillColor = nodeColors.visited.fillGradientStart
            break

        case 'path':
            haloColor = nodeColors.path.glow
            strokeColor = nodeColors.path.stroke
            textColor = nodeColors.path.text
            fillColor = nodeColors.path.fillGradientStart
            break

        case 'temp-source':
            strokeColor = nodeColors.idle.stroke
            textColor = nodeColors.idle.text
            fillColor = nodeColors.idle.fillGradientStart
            break

        default:
            fillColor = nodeColors.idle.fillGradientStart
            strokeColor = isSelected
                ? theme.graph.selectionOutline
                : isHovered
                  ? nodeColors.idle.strokeHover
                  : nodeColors.idle.stroke
            textColor = nodeColors.idle.text
            break
    }

    // 1. Halo Glow
    if (haloColor || isSelected) {
        ctx.beginPath()
        ctx.arc(x, y, radius + (isSelected ? 7 : 5), 0, Math.PI * 2)
        ctx.fillStyle = haloColor || 'rgba(96, 165, 250, 0.35)'
        ctx.fill()
    }

    // 2. Dashed Ring if temp-source
    if (state === 'temp-source') {
        ctx.strokeStyle = theme.graph.tempEdgeLine
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.arc(x, y, radius + 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
    }

    // 3. Main Node Circle
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.strokeStyle = strokeColor
    ctx.stroke()

    // 4. Label Text
    ctx.fillStyle = textColor
    ctx.font = '600 13px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y)

    // 5. Visit Index Badge
    if (visitIndex !== undefined) {
        drawVisitBadge(ctx, x, y, visitIndex, badgeBg, theme.ui.bgApp, radius)
    }

    // 6. Tag Badge (START / GOAL or Custom)
    if (tagBadge) {
        const tagColor =
            state === 'start'
                ? nodeColors.start.stroke
                : state === 'goal'
                  ? nodeColors.goal.stroke
                  : theme.ui.accentPrimary
        drawTagBadge(ctx, x, y + radius + 11, tagBadge, tagColor)
    } else if (state === 'start') {
        drawTagBadge(
            ctx,
            x,
            y + radius + 11,
            'START (S)',
            nodeColors.start.stroke
        )
    } else if (state === 'goal') {
        drawTagBadge(
            ctx,
            x,
            y + radius + 11,
            'GOAL (G)',
            nodeColors.goal.stroke
        )
    }
}

/**
 * Primitive: Draw Single Edge
 */
export function drawEdge(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    opt: EdgeDrawOptions
): void {
    const {
        fromX,
        fromY,
        toX,
        toY,
        fromRadius = 22,
        toRadius = 22,
        state = 'idle',
        isDirected = false,
        weight,
    } = opt

    const dx = toX - fromX
    const dy = toY - fromY
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return

    const unitX = dx / dist
    const unitY = dy / dist

    const startX = fromX + unitX * fromRadius
    const startY = fromY + unitY * fromRadius
    const endX = toX - unitX * toRadius
    const endY = toY - unitY * toRadius

    // Handle temporary dashed connection
    if (state === 'temp') {
        ctx.strokeStyle = theme.graph.tempEdgeLine
        ctx.lineWidth = 2.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        ctx.setLineDash([])
        return
    }

    let strokeColor = theme.graph.edges.idle
    let lineWidth = 2

    if (state === 'path') {
        strokeColor = theme.graph.edges.path
        lineWidth = 4.5
    } else if (state === 'active') {
        strokeColor = theme.graph.edges.active
        lineWidth = 3.5
    } else if (state === 'traversed') {
        strokeColor = theme.graph.edges.traversed
        lineWidth = 2.5
    }

    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Arrowhead for directed edges
    if (isDirected) {
        const angle = Math.atan2(dy, dx)
        drawArrowhead(ctx, endX, endY, angle, strokeColor, 10)
    }

    // Weight Badge
    if (weight !== undefined) {
        const midX = (startX + endX) / 2
        const midY = (startY + endY) / 2
        drawWeightBadge(ctx, theme, midX, midY, weight, strokeColor)
    }
}

/**
 * Curried Function: Node Drawer Factory
 * Configures (ctx, theme, contextOpts) once and returns a unary function (node) => void
 * suitable for array mapping / iterators.
 */
export function createNodeDrawer(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    contextOpts: NodeDrawerContextOptions = {}
): (node: GraphNode | NodeDrawOptions) => void {
    const { hoveredNodeId = null, selectedNodeId = null } = contextOpts

    return (node: GraphNode | NodeDrawOptions): void => {
        const isGraphNode = 'id' in node
        const isHovered = isGraphNode
            ? hoveredNodeId === node.id
            : !!node.isHovered
        const isSelected = isGraphNode
            ? selectedNodeId === node.id
            : !!node.isSelected

        drawNode(ctx, theme, {
            x: node.x,
            y: node.y,
            radius: node.radius ?? 22,
            label: node.label,
            state: node.state ?? 'idle',
            isHovered,
            isSelected,
            visitIndex: node.visitIndex,
            tagBadge: 'tagBadge' in node ? node.tagBadge : undefined,
        })
    }
}

/**
 * Curried Function: Edge Drawer Factory
 * Configures (ctx, theme, getNode) once and returns a unary function (edge) => void.
 */
export function createEdgeDrawer(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    getNode: (
        id: number
    ) => { x: number; y: number; radius?: number } | undefined
): (edge: GraphEdge | EdgeDrawOptions) => void {
    return (edge: GraphEdge | EdgeDrawOptions): void => {
        if (
            'from' in edge &&
            'to' in edge &&
            edge.from !== undefined &&
            edge.to !== undefined
        ) {
            const fromNode = getNode(edge.from)
            const toNode = getNode(edge.to)
            if (!fromNode || !toNode) return

            drawEdge(ctx, theme, {
                fromX: fromNode.x,
                fromY: fromNode.y,
                toX: toNode.x,
                toY: toNode.y,
                fromRadius: fromNode.radius ?? 22,
                toRadius: toNode.radius ?? 22,
                state: edge.state,
                isDirected: edge.isDirected,
                weight: edge.weight,
            })
        } else if ('fromX' in edge && 'toX' in edge) {
            drawEdge(ctx, theme, edge)
        }
    }
}
