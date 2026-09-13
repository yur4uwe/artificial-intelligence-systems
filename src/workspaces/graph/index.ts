import { WorkspaceModule, WorkspaceContext } from '@/types'
import {
    GraphModel,
    NeighborSortingStrategy,
    TREE_CONSTRAINTS,
    UNDIRECTED_GRAPH_CONSTRAINTS,
    DIRECTED_GRAPH_CONSTRAINTS,
} from './graph-model'
import {
    CanvasRenderer,
    ContextMenuEvent as ContextMenuDrawEvent,
} from './drawing/canvas-renderer'
import { SearchRunner } from '@common/engine/search-runner'
import { PlaybackBar } from '@common/ui/playback-bar'
import { GraphMetricsPanel } from './ui/metrics-panel'
import { GraphParamsTab, GraphAlgorithmType } from './wrkspc-ui'
import {
    createTreePreset,
    createUndirectedPreset,
    createDirectedPreset,
} from './presets'
import BFSAlgorithm from '@algs/graph/bfs'
import DFSAlgorithm from '@algs/graph/dfs'
import { exportMetricsToCSV } from './export-utils'
import { ContextMenu, ContextMenuItem } from '@common/ui/context-menu'
import { GraphMetrics, GraphStepEvent } from '@/algorithms/graph/common'
import { BaseGraphSearch } from '@/algorithms/graph/base'

export default class GraphWorkspace implements WorkspaceModule {
    public id = 'graph-workspace'

    private context!: WorkspaceContext
    private model!: GraphModel
    private renderer!: CanvasRenderer
    private runner!: SearchRunner<GraphStepEvent>
    private playbackBar!: PlaybackBar
    private metricsPanel!: GraphMetricsPanel
    private contextMenu!: ContextMenu
    private labUI!: GraphParamsTab

    private activeAlgorithmType: GraphAlgorithmType = 'bfs'
    private startId: number | null = null
    private goalId: number | null = null
    private sortingStrategy: NeighborSortingStrategy = 'ascending-id'
    private lastMetrics: GraphMetrics | null = null
    private activePreset: 'tree' | 'undirected' | 'directed' = 'tree'

    private activeAlgorithm: BaseGraphSearch | null = null

    public async mount(context: WorkspaceContext): Promise<void> {
        this.context = context

        // 1. Initialize Graph Model with Tree constraints by default
        this.model = new GraphModel(createTreePreset(), TREE_CONSTRAINTS)

        // 2. Initialize Canvas Renderer
        this.renderer = new CanvasRenderer(this.context.canvas, this.model, {
            onNodeClick: (nodeId) => this.handleCanvasNodeClick(nodeId),
            onCanvasChange: () => this.handleCanvasChange(),
            onSelectionChange: () => {},
            onContextMenu: (e) => this.handleContextMenu(e),
        })

        // 3. Initialize Search Runner Engine
        this.runner = new SearchRunner<GraphStepEvent>({
            onStep: (event) => this.handleStep(event),
            onFinish: (event) => this.handleFinish(event),
            onReset: () => this.handleReset(),
        })

        // 4. Initialize Playback Bar in global playback container
        this.playbackBar = new PlaybackBar({
            container: this.context.playbackContainer,
            runner: this.runner,
            onStateChange: () => this.renderer.requestRender(),
        })

        // 5. Initialize Sidebar Panels
        this.metricsPanel = new GraphMetricsPanel(this.context.metricsContainer)

        this.labUI = new GraphParamsTab({
            container: this.context.paramsContainer,
            onAlgorithmChange: (algo) => {
                this.activeAlgorithmType = algo
                this.runner.reset()
                this.updateAlgorithm()
            },
            onPresetChange: (key) => this.loadPreset(key),
            onStartChange: (id) => this.setStartNode(id),
            onGoalChange: (id) => this.setGoalNode(id),
            onSwapStartGoal: () => this.swapStartAndGoal(),
            onSortingChange: (strat) => {
                this.sortingStrategy = strat
                this.updateAlgorithm()
                this.runner.reset()
            },
            onInteractionModeChange: (mode) => {
                this.renderer.setMode(mode)
            },
            onFitView: () => this.renderer.zoomToFit(),
            onResetView: () => this.renderer.resetView(),
        })

        this.contextMenu = new ContextMenu()

        this.syncUIState()
        this.updateAlgorithm()

        // Auto-fit initial graph view after a brief layout delay
        setTimeout(() => {
            this.renderer.resize()
            this.renderer.zoomToFit()
        }, 50)
    }

    public onResize(): void {
        this.renderer.resize()
    }

    public unmount(): void {
        this.runner.reset()
        this.contextMenu.destroy()
        this.renderer.destroy()
    }

    public exportData(): {
        filename: string
        content: string
        mimeType: string
    } {
        const history = this.runner.getHistory()
        const metrics = this.lastMetrics || {
            foundPath: null,
            pathLength: 0,
            openedVerticesCount: 0,
            cyclesCount: 0,
            executionTimeMs: 0,
            visitedOrder: [],
            isSuccess: false,
            statusText: 'Пошук не виконувався',
        }

        const algoTitle =
            this.activeAlgorithmType === 'bfs'
                ? 'Лабораторна 1: Пошук в ширину (BFS)'
                : 'Лабораторна 2: Пошук в глибину (DFS)'

        const csvContent = exportMetricsToCSV(metrics, history, algoTitle)
        return {
            filename: `graph-${this.activeAlgorithmType}-results-${Date.now()}.csv`,
            content: csvContent,
            mimeType: 'text/csv;charset=utf-8;',
        }
    }

    public exportScreenshot(): HTMLCanvasElement {
        return this.renderer.getCanvasElement()
    }

    // --- Handlers & Internal Logic ---

    private updateAlgorithm(): void {
        if (this.startId === null || this.goalId === null) {
            return
        }

        const options = {
            model: this.model,
            startId: this.startId,
            goalId: this.goalId,
            sortingStrategy: this.sortingStrategy,
        }

        if (this.activeAlgorithmType === 'bfs') {
            this.activeAlgorithm = new BFSAlgorithm(options)
            this.metricsPanel.setFrontierLabel('Черга (FIFO)')
        } else {
            this.activeAlgorithm = new DFSAlgorithm(options)
            this.metricsPanel.setFrontierLabel('Стек (LIFO)')
        }

        this.runner.setAlgorithm(this.activeAlgorithm)
    }

    private loadPreset(key: 'tree' | 'undirected' | 'directed'): void {
        this.activePreset = key
        this.runner.reset()

        let data
        switch (this.activePreset) {
            case 'tree':
                data = createTreePreset()
                this.model.setConstraints(TREE_CONSTRAINTS)
                break
            case 'undirected':
                data = createUndirectedPreset()
                this.model.setConstraints(UNDIRECTED_GRAPH_CONSTRAINTS)
                break
            case 'directed':
                data = createDirectedPreset()
                this.model.setConstraints(DIRECTED_GRAPH_CONSTRAINTS)
                break
        }

        this.model.loadData(data)
        this.renderer.setModel(this.model)
        this.startId = 1
        this.goalId = 31
        this.syncUIState()
        this.updateAlgorithm()
        this.renderer.zoomToFit()
    }

    private handleCanvasNodeClick(nodeId: number): void {
        const mode = this.renderer.getMode()
        if (mode === 'set-start') {
            this.setStartNode(nodeId)
            this.renderer.setMode('select')
            this.labUI.setInteractionMode('select')
        } else if (mode === 'set-goal') {
            this.setGoalNode(nodeId)
            this.renderer.setMode('select')
            this.labUI.setInteractionMode('select')
        }
    }

    private handleCanvasChange(): void {
        this.runner.reset()
        this.syncUIState()
        this.updateAlgorithm()
    }

    private handleContextMenu(e: ContextMenuDrawEvent): void {
        let menuOptions = [] as ContextMenuItem[]
        switch (e.target.type) {
            case 'node': {
                const targetNodeId = e.target.nodeId
                menuOptions = [
                    {
                        label: 'Встановити як Start',
                        action: () => this.setStartNode(targetNodeId),
                    },
                    {
                        label: 'Встановити як Goal',
                        action: () => this.setGoalNode(targetNodeId),
                    },
                    {
                        label: "З'єднати ребром",
                        divider: true,
                        action: () => {
                            switch (this.activePreset) {
                                case 'tree':
                                case 'undirected':
                                    this.renderer.setMode('add-edge-undirected')
                                    break
                                case 'directed':
                                    this.renderer.setMode('add-edge-directed')
                                    break
                            }
                            this.renderer.setEdgeSource(targetNodeId)
                        },
                    },
                    {
                        label: 'Видалити вершину',
                        danger: true,
                        divider: true,
                        action: () => {
                            this.model.removeNode(targetNodeId)
                            this.handleCanvasChange()
                        },
                    },
                ]
                break
            }
            case 'edge': {
                const targetEdgeId = e.target.edgeId
                menuOptions = [
                    {
                        label: 'Видалити ребро',
                        danger: true,
                        action: () => {
                            this.model.removeEdge(targetEdgeId)
                            this.handleCanvasChange()
                        },
                    },
                ]
                break
            }
            case 'canvas': {
                menuOptions = [
                    {
                        label: 'Додати вершину тут',
                        action: () => {
                            this.model.addNode(e.worldX, e.worldY)
                            this.handleCanvasChange()
                        },
                    },
                    {
                        label: 'Показати весь граф',
                        divider: true,
                        action: () => this.renderer.zoomToFit(),
                    },
                    {
                        label: 'Скинути масштаб (1:1)',
                        action: () => this.renderer.resetView(),
                    },
                ]
                break
            }
            default: {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _exhaustiveCheck: never = e.target
                return
            }
        }
        this.contextMenu.show(e.clientX, e.clientY, menuOptions)
    }

    private setStartNode(id: number): void {
        this.startId = id
        this.labUI.setStart(id)
        this.runner.reset()
        this.updateStartGoalColors()
        this.updateAlgorithm()
    }

    private setGoalNode(id: number): void {
        this.goalId = id
        this.labUI.setGoal(id)
        this.runner.reset()
        this.updateStartGoalColors()
        this.updateAlgorithm()
    }

    private swapStartAndGoal(): void {
        if (this.startId === null || this.goalId === null) return
        const tmp = this.startId
        this.startId = this.goalId
        this.goalId = tmp
        this.labUI.setStart(this.startId)
        this.labUI.setGoal(this.goalId)
        this.runner.reset()
        this.updateStartGoalColors()
        this.updateAlgorithm()
    }

    private updateStartGoalColors(): void {
        this.model.resetVisualStates({
            startId: this.startId ?? undefined,
            goalId: this.goalId ?? undefined,
        })
        this.renderer.requestRender()
    }

    private syncUIState(): void {
        const nodeIds = this.model.getNodes().map((n) => n.id)
        if (
            (this.startId === null || !nodeIds.includes(this.startId)) &&
            nodeIds.length > 0
        ) {
            this.startId = nodeIds[0]
        }
        if (
            (this.goalId === null || !nodeIds.includes(this.goalId)) &&
            nodeIds.length > 0
        ) {
            this.goalId = nodeIds[nodeIds.length - 1]
        }

        if (this.startId !== null && this.goalId !== null) {
            this.labUI.updateNodeSelects(nodeIds, this.startId, this.goalId)
        }
        this.updateStartGoalColors()
    }

    private handleStep(event: GraphStepEvent): void {
        // 1. Reset node/edge states but keep Start/Goal markers
        this.model.resetVisualStates({
            startId: this.startId ?? undefined,
            goalId: this.goalId ?? undefined,
        })

        // 2. Mark visited nodes
        event.visited.forEach((id, index) => {
            if (id !== this.startId && id !== this.goalId) {
                this.model.setNodeState(id, 'visited', index + 1)
            }
        })

        // 3. Mark nodes currently in frontier
        event.frontier.forEach((id) => {
            if (id !== this.startId && id !== this.goalId) {
                this.model.setNodeState(id, 'in-queue')
            }
        })

        // 4. Mark currently expanded node
        if (event.currentNodeId !== null) {
            if (
                event.currentNodeId !== this.startId &&
                event.currentNodeId !== this.goalId
            ) {
                this.model.setNodeState(event.currentNodeId, 'current')
            }
        }

        // 5. Mark active traversal edge
        if (event.activeEdge) {
            this.model.setEdgeState(
                event.activeEdge.from,
                event.activeEdge.to,
                'active'
            )
        }

        // 6. If found path, highlight it
        if (event.foundPath) {
            for (let i = 0; i < event.foundPath.length - 1; i++) {
                const u = event.foundPath[i]
                const v = event.foundPath[i + 1]
                this.model.setEdgeState(u, v, 'path')
            }
            event.foundPath.forEach((id) => {
                if (id !== this.startId && id !== this.goalId) {
                    this.model.setNodeState(id, 'path')
                }
            })
        }

        this.renderer.requestRender()
        this.metricsPanel.updateStep(event)
    }

    private handleFinish(_event: GraphStepEvent): void {
        this.playbackBar.updateButtons()
        const metrics = this.activeAlgorithm?.getMetrics()
        if (metrics) {
            this.lastMetrics = metrics
            this.metricsPanel.setFinalMetrics(metrics)
        }
        // Auto switch to Results tab on finish
        this.context.switchSidebarTab('metrics')
    }

    private handleReset(): void {
        this.lastMetrics = null
        this.model.resetVisualStates({
            startId: this.startId ?? undefined,
            goalId: this.goalId ?? undefined,
        })
        this.renderer.requestRender()
        this.metricsPanel.reset()
        this.playbackBar.updateButtons()
    }
}
