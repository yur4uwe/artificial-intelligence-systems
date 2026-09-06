import { ThemePalette } from '../../common/theme/palette';

/**
 * High-definition canvas specimen renderer for design-sketch showcase
 */
export class PaletteSpecimensRenderer {
    /**
     * Draw Node States Specimen Matrix
     */
    public static renderNodeSpecimens(canvas: HTMLCanvasElement, theme: ThemePalette): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 800;
        const height = 180;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = theme.graph.background;
        ctx.fillRect(0, 0, width, height);

        // Subtle background grid
        this.drawGrid(ctx, width, height, theme.graph.grid, 24);

        // Define 10 node specimens
        const specimens = [
            { label: 'v1', name: 'Idle Default', state: 'idle', isHovered: false, isSelected: false },
            { label: 'v2', name: 'Idle Hover', state: 'idle', isHovered: true, isSelected: false },
            { label: 'v3', name: 'Selected', state: 'idle', isHovered: false, isSelected: true },
            { label: 'S', name: 'Start (S)', state: 'start', badgeText: 'START (S)', visit: 1 },
            { label: 'G', name: 'Goal (G)', state: 'goal', badgeText: 'GOAL (G)' },
            { label: 'v4', name: 'Current', state: 'current' },
            { label: 'v5', name: 'In-Queue', state: 'in-queue' },
            { label: 'v6', name: 'Visited', state: 'visited', visit: 14 },
            { label: 'v7', name: 'Path', state: 'path' },
            { label: 'v8', name: 'Temp Source', state: 'temp-source' },
        ];

        const count = specimens.length;
        const marginX = 45;
        const availableW = width - marginX * 2;
        const stepX = availableW / (count - 1);
        const centerY = 72;
        const radius = 22;

        specimens.forEach((spec, i) => {
            const x = marginX + i * stepX;
            const y = centerY;

            // Draw single node
            this.drawSingleNode(ctx, theme, {
                x,
                y,
                radius,
                label: spec.label,
                state: spec.state,
                isHovered: spec.isHovered,
                isSelected: spec.isSelected,
                visitIndex: spec.visit,
                tagBadge: spec.badgeText,
            });

            // Draw caption label below
            ctx.fillStyle = theme.ui.textSecondary;
            ctx.font = '500 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(spec.name, x, y + radius + (spec.tagBadge ? 22 : 12));
        });

        ctx.restore();
    }

    /**
     * Draw Edge States Specimen Matrix
     */
    public static renderEdgeSpecimens(canvas: HTMLCanvasElement, theme: ThemePalette): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 800;
        const height = 150;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = theme.graph.background;
        ctx.fillRect(0, 0, width, height);

        // Grid
        this.drawGrid(ctx, width, height, theme.graph.grid, 24);

        const edgeSpecimens = [
            { name: 'Idle Undirected', type: 'idle', isDirected: false },
            { name: 'Idle Directed', type: 'idle', isDirected: true },
            { name: 'Active Traversal', type: 'active', isDirected: true },
            { name: 'Traversed Edge', type: 'traversed', isDirected: true },
            { name: 'Solution Path', type: 'path', isDirected: true },
            { name: 'Weighted Edge', type: 'idle', isDirected: false, weight: 15 },
            { name: 'Temp Connection', type: 'temp', isDirected: false },
        ];

        const count = edgeSpecimens.length;
        const colWidth = width / count;
        const r = 16;

        edgeSpecimens.forEach((spec, i) => {
            const centerX = colWidth * i + colWidth / 2;
            const x1 = centerX - 36;
            const x2 = centerX + 36;
            const y = 54;

            // Draw Edge
            if (spec.type === 'temp') {
                ctx.strokeStyle = theme.graph.tempEdgeLine;
                ctx.lineWidth = 2.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(x1 + r, y);
                ctx.lineTo(x2 - r, y);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                let stroke = theme.graph.edges.idle;
                let lineWidth = 2;

                if (spec.type === 'active') {
                    stroke = theme.graph.edges.active;
                    lineWidth = 3.5;
                } else if (spec.type === 'traversed') {
                    stroke = theme.graph.edges.traversed;
                    lineWidth = 2.5;
                } else if (spec.type === 'path') {
                    stroke = theme.graph.edges.path;
                    lineWidth = 4.5;
                }

                ctx.strokeStyle = stroke;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(x1 + r, y);
                ctx.lineTo(x2 - r, y);
                ctx.stroke();

                if (spec.isDirected) {
                    this.drawArrowhead(ctx, x2 - r, y, 0, stroke);
                }

                if (spec.weight !== undefined) {
                    const midX = (x1 + x2) / 2;
                    ctx.save();
                    ctx.fillStyle = theme.ui.bgSurface;
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(midX - 12, y - 8, 24, 16, 4);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = theme.ui.textPrimary;
                    ctx.font = 'bold 10px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${spec.weight}`, midX, y);
                    ctx.restore();
                }
            }

            // Draw Endpoints
            this.drawEndpointNode(ctx, theme, x1, y, r, 'A');
            this.drawEndpointNode(ctx, theme, x2, y, r, 'B');

            // Caption
            ctx.fillStyle = theme.ui.textSecondary;
            ctx.font = '500 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(spec.name, centerX, y + r + 16);
        });

        ctx.restore();
    }

    /**
     * Draw Integrated Topology Specimen
     */
    public static renderMiniGraph(canvas: HTMLCanvasElement, theme: ThemePalette): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 800;
        const height = 300;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.save();
        ctx.scale(dpr, dpr);

        // Clear
        ctx.fillStyle = theme.graph.background;
        ctx.fillRect(0, 0, width, height);

        // Grid
        this.drawGrid(ctx, width, height, theme.graph.grid, 28);

        // Nodes coordinates scaled to width
        const scaleX = width / 800;
        const nodes = [
            { id: 1, label: 'S', x: 75 * scaleX, y: 150, state: 'start', tag: 'START (S)', visit: 1 },
            { id: 2, label: 'v2', x: 200 * scaleX, y: 80, state: 'path', visit: 2 },
            { id: 3, label: 'v3', x: 200 * scaleX, y: 220, state: 'visited', visit: 3 },
            { id: 4, label: 'v4', x: 340 * scaleX, y: 220, state: 'current' },
            { id: 5, label: 'v5', x: 470 * scaleX, y: 260, state: 'in-queue' },
            { id: 6, label: 'v6', x: 470 * scaleX, y: 180, state: 'in-queue' },
            { id: 7, label: 'v7', x: 380 * scaleX, y: 70, state: 'path' },
            { id: 8, label: 'v8', x: 550 * scaleX, y: 80, state: 'path' },
            { id: 9, label: 'G', x: 720 * scaleX, y: 150, state: 'goal', tag: 'GOAL (G)' },
            { id: 10, label: 'v10', x: 620 * scaleX, y: 240, state: 'idle' },
        ];

        const edges = [
            // Solution Path (Highlighted)
            { from: 1, to: 2, state: 'path', directed: true },
            { from: 2, to: 7, state: 'path', directed: true },
            { from: 7, to: 8, state: 'path', directed: true },
            { from: 8, to: 9, state: 'path', directed: true },

            // Visited / Search Branches
            { from: 1, to: 3, state: 'traversed', directed: true },
            { from: 3, to: 4, state: 'traversed', directed: true },

            // Active expansion
            { from: 4, to: 5, state: 'active', directed: true },
            { from: 4, to: 6, state: 'active', directed: true },

            // Idle / Cross links
            { from: 2, to: 4, state: 'idle', directed: true, weight: 8 },
            { from: 6, to: 8, state: 'idle', directed: true },
            { from: 5, to: 10, state: 'idle', directed: false },
            { from: 10, to: 9, state: 'idle', directed: true },
        ];

        // 1. Draw edges
        edges.forEach(edge => {
            const u = nodes.find(n => n.id === edge.from);
            const v = nodes.find(n => n.id === edge.to);
            if (!u || !v) return;

            let stroke = theme.graph.edges.idle;
            let lineWidth = 2;

            if (edge.state === 'path') {
                stroke = theme.graph.edges.path;
                lineWidth = 4.5;
            } else if (edge.state === 'active') {
                stroke = theme.graph.edges.active;
                lineWidth = 3.5;
            } else if (edge.state === 'traversed') {
                stroke = theme.graph.edges.traversed;
                lineWidth = 2.5;
            }

            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const dist = Math.hypot(dx, dy);
            if (dist === 0) return;

            const r = 22;
            const startX = u.x + (dx / dist) * r;
            const startY = u.y + (dy / dist) * r;
            const endX = v.x - (dx / dist) * r;
            const endY = v.y - (dy / dist) * r;

            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            if (edge.directed) {
                const angle = Math.atan2(dy, dx);
                this.drawArrowhead(ctx, endX, endY, angle, stroke);
            }

            if (edge.weight !== undefined) {
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                ctx.save();
                ctx.fillStyle = theme.ui.bgSurface;
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(midX - 10, midY - 8, 20, 16, 4);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = theme.ui.textPrimary;
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${edge.weight}`, midX, midY);
                ctx.restore();
            }
        });

        // 2. Draw nodes
        nodes.forEach(node => {
            this.drawSingleNode(ctx, theme, {
                x: node.x,
                y: node.y,
                radius: 22,
                label: node.label,
                state: node.state,
                visitIndex: node.visit,
                tagBadge: node.tag,
            });
        });

        ctx.restore();
    }

    // Helper: Draw Background Grid
    private static drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, step: number): void {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    // Helper: Draw Arrowhead
    private static drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
        const size = 9;
        const arrowAngle = Math.PI / 6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * Math.cos(angle - arrowAngle), y - size * Math.sin(angle - arrowAngle));
        ctx.lineTo(x - size * Math.cos(angle + arrowAngle), y - size * Math.sin(angle + arrowAngle));
        ctx.closePath();
        ctx.fill();
    }

    // Helper: Draw single Node with all states
    private static drawSingleNode(
        ctx: CanvasRenderingContext2D,
        theme: ThemePalette,
        opt: {
            x: number;
            y: number;
            radius: number;
            label: string;
            state: string;
            isHovered?: boolean;
            isSelected?: boolean;
            visitIndex?: number;
            tagBadge?: string;
        }
    ): void {
        const { x, y, radius, label, state, isHovered, isSelected, visitIndex, tagBadge } = opt;
        const nodeColors = theme.graph.nodes;

        let fillGradient: CanvasGradient;
        let strokeColor: string;
        let textColor = theme.ui.textPrimary;
        let haloColor: string | null = null;
        let badgeBg = theme.ui.accentPrimary;

        switch (state) {
            case 'start':
                haloColor = nodeColors.start.glow;
                strokeColor = nodeColors.start.stroke;
                textColor = nodeColors.start.text;
                badgeBg = nodeColors.start.badgeBg;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.start.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.start.fillGradientEnd);
                break;

            case 'goal':
                haloColor = nodeColors.goal.glow;
                strokeColor = nodeColors.goal.stroke;
                textColor = nodeColors.goal.text;
                badgeBg = nodeColors.goal.badgeBg;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.goal.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.goal.fillGradientEnd);
                break;

            case 'current':
                haloColor = nodeColors.current.glow;
                strokeColor = nodeColors.current.stroke;
                textColor = nodeColors.current.text;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.current.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.current.fillGradientEnd);
                break;

            case 'in-queue':
                haloColor = nodeColors.inQueue.glow;
                strokeColor = nodeColors.inQueue.stroke;
                textColor = nodeColors.inQueue.text;
                badgeBg = nodeColors.inQueue.badgeBg;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.inQueue.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.inQueue.fillGradientEnd);
                break;

            case 'visited':
                strokeColor = nodeColors.visited.stroke;
                textColor = nodeColors.visited.text;
                badgeBg = nodeColors.visited.badgeBg;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.visited.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.visited.fillGradientEnd);
                break;

            case 'path':
                haloColor = nodeColors.path.glow;
                strokeColor = nodeColors.path.stroke;
                textColor = nodeColors.path.text;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.path.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.path.fillGradientEnd);
                break;

            case 'temp-source':
                strokeColor = nodeColors.idle.stroke;
                textColor = nodeColors.idle.text;
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, nodeColors.idle.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.idle.fillGradientEnd);
                break;

            default:
                fillGradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
                fillGradient.addColorStop(0, isHovered ? nodeColors.idle.strokeHover : nodeColors.idle.fillGradientStart);
                fillGradient.addColorStop(1, nodeColors.idle.fillGradientEnd);
                strokeColor = isSelected ? theme.graph.selectionOutline : (isHovered ? nodeColors.idle.strokeHover : nodeColors.idle.stroke);
                textColor = nodeColors.idle.text;
                break;
        }

        // 1. Halo Glow
        if (haloColor || isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, radius + (isSelected ? 7 : 5), 0, Math.PI * 2);
            ctx.fillStyle = haloColor || 'rgba(96, 165, 250, 0.35)';
            ctx.fill();
        }

        // 2. Dashed Ring if temp-source
        if (state === 'temp-source') {
            ctx.strokeStyle = theme.graph.tempEdgeLine;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. Main Node Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillGradient;
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // 4. Label
        ctx.fillStyle = textColor;
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);

        // 5. Visit Index Badge
        if (visitIndex !== undefined) {
            const badgeR = 9;
            const badgeX = x + radius * 0.7;
            const badgeY = y - radius * 0.7;

            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
            ctx.fillStyle = badgeBg;
            ctx.fill();
            ctx.strokeStyle = theme.ui.bgApp;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.fillText(`${visitIndex}`, badgeX, badgeY);
        }

        // 6. Tag Badge (START / GOAL)
        if (tagBadge) {
            const tagColor = state === 'start' ? nodeColors.start.stroke : nodeColors.goal.stroke;
            ctx.save();
            ctx.font = 'bold 10px Inter, sans-serif';
            const textWidth = ctx.measureText(tagBadge).width;
            const padX = 6;
            const padY = 3;
            const tagY = y + radius + 11;

            ctx.fillStyle = tagColor;
            ctx.beginPath();
            ctx.roundRect(x - textWidth / 2 - padX, tagY - 8 - padY, textWidth + padX * 2, 16 + padY, 4);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tagBadge, x, tagY);
            ctx.restore();
        }
    }

    private static drawEndpointNode(ctx: CanvasRenderingContext2D, theme: ThemePalette, x: number, y: number, r: number, label: string): void {
        const nodeColors = theme.graph.nodes.idle;
        const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, r);
        grad.addColorStop(0, nodeColors.fillGradientStart);
        grad.addColorStop(1, nodeColors.fillGradientEnd);

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = nodeColors.stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = nodeColors.text;
        ctx.font = '600 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }
}
