import { WorkspaceModule, LabMetrics, StepEvent } from '@/types'
import {
    GraphModel,
    NeighborSortingStrategy,
    TREE_CONSTRAINTS,
    UNDIRECTED_GRAPH_CONSTRAINTS,
    DIRECTED_GRAPH_CONSTRAINTS,
} from '@common/graph/graph-model'
import {
    CanvasRenderer,
    ContextMenuEvent as ContextMenuDrawEvent,
} from '@common/graph/canvas-renderer'
import { SearchRunner } from '@common/engine/search-runner'
import { PlaybackBar } from '@common/ui/playback-bar'
import { MetricsPanel } from '@common/ui/metrics-panel'
import { GraphParamsTab } from './wrkspc-ui'
import {
    createTreePreset,
    createUndirectedPreset,
    createDirectedPreset,
} from './presets'
import { runBFS } from '@algorithms/bfs'
import { exportMetricsToCSV } from '@common/graph/export-utils'
import { ContextMenu, ContextMenuItem } from '@common/ui/context-menu'
import blindSearchHtml from './params-tab.html?raw'

export default class GraphWorkspace implements WorkspaceModule {
    public id = 'graph-workspace'

    private container!: HTMLElement
    private model!: GraphModel
    private renderer!: CanvasRenderer
    private runner!: SearchRunner
    private playbackBar!: PlaybackBar
    private metricsPanel!: MetricsPanel
    private contextMenu!: ContextMenu
    private labUI!: GraphParamsTab
    private resizeObserver!: ResizeObserver

    private startId: number = 1
    private goalId: number = 31
    private sortingStrategy: NeighborSortingStrategy = 'ascending-id'
    private lastMetrics: LabMetrics | null = null
    private activePreset: 'tree' | 'undirected' | 'directed' = 'tree'

    public async mount(container: HTMLElement): Promise<void> {
        this.container = container
        this.container.innerHTML = blindSearchHtml

        // 1. Initialize Graph Model with Tree constraints by default
        this.model = new GraphModel(createTreePreset(), TREE_CONSTRAINTS)

        // 2. Initialize Canvas Renderer
        const canvasEl = this.container.querySelector(
            '#l1-canvas'
        ) as HTMLCanvasElement
        this.renderer = new CanvasRenderer(canvasEl, this.model, {
            onNodeClick: (nodeId) => this.handleCanvasNodeClick(nodeId),
            onCanvasChange: () => this.handleCanvasChange(),
            onSelectionChange: () => {},
            onContextMenu: (e) => this.handleContextMenu(e),
        })

        this.resizeObserver = new ResizeObserver(() => {
            this.renderer.resize()
        })
        this.resizeObserver.observe(this.container)

        // 3. Initialize Search Runner Engine
        this.runner = new SearchRunner(
            () =>
                runBFS({
                    model: this.model,
                    startId: this.startId,
                    goalId: this.goalId,
                    sortingStrategy: this.sortingStrategy,
                }),
            {
                onStep: (event) => this.handleStep(event),
                onFinish: (event, metrics) => this.handleFinish(event, metrics),
                onReset: () => this.handleReset(),
            }
        )

        // 4. Initialize Playback Bar
        const playbackContainer = this.container.querySelector(
            '#l1-playback-container'
        ) as HTMLElement
        this.playbackBar = new PlaybackBar({
            container: playbackContainer,
            runner: this.runner,
            onStateChange: () => this.renderer.requestRender(),
        })

        // 5. Initialize Sidebar Panels
        const paramsContainer = this.container.querySelector(
            '#l1-params-panel'
        ) as HTMLElement
        const metricsContainer = this.container.querySelector(
            '#l1-metrics-panel'
        ) as HTMLElement

        this.metricsPanel = new MetricsPanel(metricsContainer)

        this.labUI = new GraphParamsTab({
            container: paramsContainer,
            onPresetChange: (key) => this.loadPreset(key),
            onStartChange: (id) => this.setStartNode(id),
            onGoalChange: (id) => this.setGoalNode(id),
            onSwapStartGoal: () => this.swapStartAndGoal(),
            onSortingChange: (strat) => {
                this.sortingStrategy = strat
                this.runner.reset()
            },
            onInteractionModeChange: (mode) => {
                this.renderer.setMode(mode)
            },
            onFitView: () => this.renderer.zoomToFit(),
            onResetView: () => this.renderer.resetView(),
        })

        this.contextMenu = new ContextMenu()
        this.initSidebarTabs()
        this.syncUIState()

        // Auto-fit initial graph view after a brief layout delay
        setTimeout(() => {
            this.renderer.resize()
            this.renderer.zoomToFit()
        }, 50)
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

        const csvContent = exportMetricsToCSV(
            metrics,
            history,
            'Лабораторна 1: Пошук в ширину (BFS)'
        )
        return {
            filename: `lab1-bfs-results-${Date.now()}.csv`,
            content: csvContent,
            mimeType: 'text/csv;charset=utf-8;',
        }
    }

    public exportScreenshot(): HTMLCanvasElement {
        return this.renderer.getCanvasElement()
    }

    // --- Handlers & Internal Logic ---

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
    }

    private handleContextMenu(e: ContextMenuDrawEvent): void {
        let menuOptions = [] as ContextMenuItem[]
        switch (e.target.type) {
            case 'node':
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
            case 'edge':
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
            case 'canvas':
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
            default:
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _exhaustiveCheck: never = e.target
                return
        }
        this.contextMenu.show(e.clientX, e.clientY, menuOptions)
    }

    private setStartNode(id: number): void {
        this.startId = id
        this.labUI.setStart(id)
        this.runner.reset()
        this.updateStartGoalColors()
    }

    private setGoalNode(id: number): void {
        this.goalId = id
        this.labUI.setGoal(id)
        this.runner.reset()
        this.updateStartGoalColors()
    }

    private swapStartAndGoal(): void {
        const tmp = this.startId
        this.startId = this.goalId
        this.goalId = tmp
        this.labUI.setStart(this.startId)
        this.labUI.setGoal(this.goalId)
        this.runner.reset()
        this.updateStartGoalColors()
    }

    private updateStartGoalColors(): void {
        this.model.resetVisualStates({
            startId: this.startId,
            goalId: this.goalId,
        })
        this.renderer.requestRender()
    }

    private syncUIState(): void {
        const nodeIds = this.model.getNodes().map((n) => n.id)
        if (!nodeIds.includes(this.startId) && nodeIds.length > 0)
            this.startId = nodeIds[0]
        if (!nodeIds.includes(this.goalId) && nodeIds.length > 0)
            this.goalId = nodeIds[nodeIds.length - 1]

        this.labUI.updateNodeSelects(nodeIds, this.startId, this.goalId)
        this.updateStartGoalColors()
    }

    private handleStep(event: StepEvent): void {
        // 1. Reset node/edge states but keep Start/Goal markers
        this.model.resetVisualStates({
            startId: this.startId,
            goalId: this.goalId,
        })

        // 2. Mark visited nodes
        event.visited.forEach((id, index) => {
            if (id !== this.startId && id !== this.goalId) {
                this.model.setNodeState(id, 'visited', index + 1)
            }
        })

        // 3. Mark nodes currently in queue
        event.queue.forEach((id) => {
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

    private handleFinish(_event: StepEvent, metrics?: LabMetrics | null): void {
        this.playbackBar.updateButtons()
        if (metrics) {
            this.lastMetrics = metrics
            this.metricsPanel.setFinalMetrics(metrics)
        }
        // Auto switch to Results tab on finish
        this.switchSidebarTab('metrics')
    }

    private handleReset(): void {
        this.lastMetrics = null
        this.model.resetVisualStates({
            startId: this.startId,
            goalId: this.goalId,
        })
        this.renderer.requestRender()
        this.metricsPanel.reset()
        this.playbackBar.updateButtons()
    }

    private initSidebarTabs(): void {
        const btnParams = this.container.querySelector('#tab-btn-params')!
        const btnMetrics = this.container.querySelector('#tab-btn-metrics')!

        btnParams.addEventListener('click', () =>
            this.switchSidebarTab('params')
        )
        btnMetrics.addEventListener('click', () =>
            this.switchSidebarTab('metrics')
        )
    }

    private switchSidebarTab(tab: 'params' | 'metrics'): void {
        const btnParams = this.container.querySelector(
            '#tab-btn-params'
        ) as HTMLElement
        const btnMetrics = this.container.querySelector(
            '#tab-btn-metrics'
        ) as HTMLElement
        const panelParams = this.container.querySelector('#l1-params-panel')!
        const panelMetrics = this.container.querySelector('#l1-metrics-panel')!

        if (tab === 'params') {
            btnParams.style.backgroundColor = 'var(--color-bg-surface)'
            btnParams.style.color = 'var(--color-text-primary)'
            btnParams.style.borderColor = 'var(--color-border-muted)'
            btnParams.classList.add('font-semibold')
            btnParams.classList.remove('font-medium')

            btnMetrics.style.backgroundColor = 'transparent'
            btnMetrics.style.color = 'var(--color-text-secondary)'
            btnMetrics.style.borderColor = 'transparent'
            btnMetrics.classList.add('font-medium')
            btnMetrics.classList.remove('font-semibold')

            panelParams.classList.remove('hidden')
            panelMetrics.classList.add('hidden')
        } else {
            btnMetrics.style.backgroundColor = 'var(--color-bg-surface)'
            btnMetrics.style.color = 'var(--color-text-primary)'
            btnMetrics.style.borderColor = 'var(--color-border-muted)'
            btnMetrics.classList.add('font-semibold')
            btnMetrics.classList.remove('font-medium')

            btnParams.style.backgroundColor = 'transparent'
            btnParams.style.color = 'var(--color-text-secondary)'
            btnParams.style.borderColor = 'transparent'
            btnParams.classList.add('font-medium')
            btnParams.classList.remove('font-semibold')

            panelMetrics.classList.remove('hidden')
            panelParams.classList.add('hidden')
        }
    }
}
