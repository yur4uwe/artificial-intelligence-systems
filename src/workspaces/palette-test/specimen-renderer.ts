import { ThemePalette } from '@common/theme/palette'
import {
    createEdgeDrawer,
    createNodeDrawer,
    drawEdge,
} from '@wrkspc/graph/drawing/render-primitives'
import { GraphEdge } from '@wrkspc/graph/types'

/**
 * High-definition canvas specimen renderer for design-sketch showcase
 */
export class PaletteSpecimensRenderer {
    /**
     * Draw Node States Specimen Matrix
     */
    public static renderNodeSpecimens(
        canvas: HTMLCanvasElement,
        theme: ThemePalette
    ): void {
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        const width = rect.width || 800
        const height = 180
        canvas.width = width * dpr
        canvas.height = height * dpr

        ctx.save()
        ctx.scale(dpr, dpr)

        // Background
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, width, height)

        // Define 10 node specimens
        const specimens = [
            {
                label: 'v1',
                name: 'Idle Default',
                state: 'idle',
                isHovered: false,
                isSelected: false,
            },
            {
                label: 'v2',
                name: 'Idle Hover',
                state: 'idle',
                isHovered: true,
                isSelected: false,
            },
            {
                label: 'v3',
                name: 'Selected',
                state: 'idle',
                isHovered: false,
                isSelected: true,
            },
            {
                label: 'S',
                name: 'Start (S)',
                state: 'start',
                badgeText: 'START (S)',
                visit: 1,
            },
            {
                label: 'G',
                name: 'Goal (G)',
                state: 'goal',
                badgeText: 'GOAL (G)',
            },
            { label: 'v4', name: 'Current', state: 'current' },
            { label: 'v5', name: 'In-Queue', state: 'in-queue' },
            { label: 'v6', name: 'Visited', state: 'visited', visit: 14 },
            { label: 'v7', name: 'Path', state: 'path' },
            { label: 'v8', name: 'Temp Source', state: 'temp-source' },
        ]

        const count = specimens.length
        const marginX = 45
        const availableW = width - marginX * 2
        const stepX = availableW / (count - 1)
        const centerY = 72
        const radius = 22

        const renderNode = createNodeDrawer(ctx, theme)

        specimens.forEach((spec, i) => {
            const x = marginX + i * stepX
            const y = centerY

            // Draw single node via primitive drawer
            renderNode({
                x,
                y,
                radius,
                label: spec.label,
                state: spec.state,
                isHovered: spec.isHovered,
                isSelected: spec.isSelected,
                visitIndex: spec.visit,
                tagBadge: spec.badgeText,
            })

            // Draw caption label below
            ctx.fillStyle = theme.ui.textSecondary
            ctx.font = '500 11px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(spec.name, x, y + radius + (spec.badgeText ? 22 : 12))
        })

        ctx.restore()
    }

    /**
     * Draw Edge States Specimen Matrix
     */
    public static renderEdgeSpecimens(
        canvas: HTMLCanvasElement,
        theme: ThemePalette
    ): void {
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        const width = rect.width || 800
        const height = 150
        canvas.width = width * dpr
        canvas.height = height * dpr

        ctx.save()
        ctx.scale(dpr, dpr)

        // Background
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, width, height)

        const edgeSpecimens = [
            { name: 'Idle Undirected', type: 'idle', isDirected: false },
            { name: 'Idle Directed', type: 'idle', isDirected: true },
            { name: 'Active Traversal', type: 'active', isDirected: true },
            { name: 'Traversed Edge', type: 'traversed', isDirected: true },
            { name: 'Solution Path', type: 'path', isDirected: true },
            {
                name: 'Weighted Edge',
                type: 'idle',
                isDirected: false,
                weight: 15,
            },
            { name: 'Temp Connection', type: 'temp', isDirected: false },
        ]

        const count = edgeSpecimens.length
        const colWidth = width / count
        const r = 16
        const renderNode = createNodeDrawer(ctx, theme)

        edgeSpecimens.forEach((spec, i) => {
            const centerX = colWidth * i + colWidth / 2
            const x1 = centerX - 36
            const x2 = centerX + 36
            const y = 54

            // Draw Edge via primitive
            drawEdge(ctx, theme, {
                fromX: x1,
                fromY: y,
                toX: x2,
                toY: y,
                fromRadius: r,
                toRadius: r,
                state: spec.type,
                isDirected: spec.isDirected,
                weight: spec.weight,
            })

            // Draw Endpoints
            renderNode({ x: x1, y, radius: r, label: 'A' })
            renderNode({ x: x2, y, radius: r, label: 'B' })

            // Caption
            ctx.fillStyle = theme.ui.textSecondary
            ctx.font = '500 11px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(spec.name, centerX, y + r + 16)
        })

        ctx.restore()
    }

    /**
     * Draw Integrated Topology Specimen
     */
    public static renderMiniGraph(
        canvas: HTMLCanvasElement,
        theme: ThemePalette
    ): void {
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        const width = rect.width || 800
        const height = 300
        canvas.width = width * dpr
        canvas.height = height * dpr

        ctx.save()
        ctx.scale(dpr, dpr)

        // Clear
        ctx.fillStyle = theme.graph.background
        ctx.fillRect(0, 0, width, height)

        // Nodes coordinates scaled to width
        const scaleX = width / 800
        const nodes = [
            {
                id: 1,
                label: 'S',
                x: 75 * scaleX,
                y: 150,
                state: 'start',
                tagBadge: 'START (S)',
                visitIndex: 1,
            },
            {
                id: 2,
                label: 'v2',
                x: 200 * scaleX,
                y: 80,
                state: 'path',
                visitIndex: 2,
            },
            {
                id: 3,
                label: 'v3',
                x: 200 * scaleX,
                y: 220,
                state: 'visited',
                visitIndex: 3,
            },
            { id: 4, label: 'v4', x: 340 * scaleX, y: 220, state: 'current' },
            { id: 5, label: 'v5', x: 470 * scaleX, y: 260, state: 'in-queue' },
            { id: 6, label: 'v6', x: 470 * scaleX, y: 180, state: 'in-queue' },
            { id: 7, label: 'v7', x: 380 * scaleX, y: 70, state: 'path' },
            { id: 8, label: 'v8', x: 550 * scaleX, y: 80, state: 'path' },
            {
                id: 9,
                label: 'G',
                x: 720 * scaleX,
                y: 150,
                state: 'goal',
                tagBadge: 'GOAL (G)',
            },
            { id: 10, label: 'v10', x: 620 * scaleX, y: 240, state: 'idle' },
        ]

        const edges: GraphEdge[] = [
            // Solution Path (Highlighted)
            { id: 'e1', from: 1, to: 2, state: 'path', isDirected: true },
            { id: 'e2', from: 2, to: 7, state: 'path', isDirected: true },
            { id: 'e3', from: 7, to: 8, state: 'path', isDirected: true },
            { id: 'e4', from: 8, to: 9, state: 'path', isDirected: true },

            // Visited / Search Branches
            { id: 'e5', from: 1, to: 3, state: 'traversed', isDirected: true },
            { id: 'e6', from: 3, to: 4, state: 'traversed', isDirected: true },

            // Active expansion
            { id: 'e7', from: 4, to: 5, state: 'active', isDirected: true },
            { id: 'e8', from: 4, to: 6, state: 'active', isDirected: true },

            // Idle / Cross links
            {
                id: 'e9',
                from: 2,
                to: 4,
                state: 'idle',
                isDirected: true,
                weight: 8,
            },
            { id: 'e10', from: 6, to: 8, state: 'idle', isDirected: true },
            { id: 'e11', from: 5, to: 10, state: 'idle', isDirected: false },
            { id: 'e12', from: 10, to: 9, state: 'idle', isDirected: true },
        ]

        // 1. Draw edges via curried edge drawer
        const renderEdge = createEdgeDrawer(ctx, theme, (id) =>
            nodes.find((n) => n.id === id)
        )
        edges.forEach(renderEdge)

        // 2. Draw nodes via curried node drawer
        const renderNode = createNodeDrawer(ctx, theme)
        nodes.forEach(renderNode)

        ctx.restore()
    }
}
