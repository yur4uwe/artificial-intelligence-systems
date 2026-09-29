import MapModel from './model'
import { WorkspaceContext, WorkspaceModule } from '@/types'
import {
    RoadsCanvasRenderer,
    RoadsContextMenuEvent,
} from './drawing/roads-renderer'
import { RoadsParamsTab } from './ui/params-tab'
import { RoadsMetricsPanel } from './ui/metrics-panel'
import { ContextMenu, ContextMenuItem } from '@common/ui/context-menu'
import { SearchRunner } from '@common/engine/search-runner'
import { PlaybackBar } from '@common/ui/playback-bar'
import DijkstraAlgorithm from '@/algorithms/map/dijkstra'
import { DijkstraMetrics, DijkstraStepEvent } from '@/algorithms/map/types'
import { exportDijkstraMetricsToCSV } from './export-utils'

export default class RoadsWorkspace implements WorkspaceModule {
    public id = 'roads-workspace'

    private context!: WorkspaceContext
    private model!: MapModel
    private renderer!: RoadsCanvasRenderer
    private paramsTab!: RoadsParamsTab
    private metricsPanel!: RoadsMetricsPanel
    private contextMenu!: ContextMenu
    private runner!: SearchRunner<DijkstraStepEvent>
    private playbackBar!: PlaybackBar

    private algorithm: DijkstraAlgorithm | null = null
    private lastMetrics: DijkstraMetrics | null = null

    private startCity: string = 'Київ'
    private goalCity: string = 'Львів'

    // Transient state tracking for delta updates
    private previousCurrentId: number | null = null

    public async mount(context: WorkspaceContext): Promise<void> {
        this.context = context

        // 1. Initialize Map Model
        this.model = new MapModel()

        // 2. Initialize Canvas Renderer
        this.renderer = new RoadsCanvasRenderer(
            this.context.canvas,
            this.model,
            {
                onNodeClick: (nodeId) => this.handleNodeClick(nodeId),
                onContextMenu: (e) => this.handleContextMenu(e),
            }
        )

        // 3. Initialize Context Menu
        this.contextMenu = new ContextMenu()

        // 4. Initialize Search Runner Engine
        this.runner = new SearchRunner<DijkstraStepEvent>({
            onStep: (event) => this.handleStep(event),
            onFinish: (event) => this.handleFinish(event),
            onReset: () => this.handleReset(),
        })

        // 5. Initialize Playback Bar in global container
        this.playbackBar = new PlaybackBar({
            container: this.context.playbackContainer,
            runner: this.runner,
            onStateChange: () => this.renderer.requestRender(),
            canPlay: () => {
                const startNode = this.model.findNodeByCityName(this.startCity)
                const goalNode = this.model.findNodeByCityName(this.goalCity)
                if (!startNode || !goalNode) {
                    alert('Будь ласка, виберіть початкове та цільове місто!')
                    return false
                }
                return true
            },
        })

        // 6. Initialize Sidebar Panels
        this.metricsPanel = new RoadsMetricsPanel(
            this.context.metricsContainer,
            this.model
        )

        this.paramsTab = new RoadsParamsTab({
            container: this.context.paramsContainer,
            onFitView: () => this.renderer.fitMapToViewport(),
            onToggleMap: () => this.renderer.toggleMapImage(),
            onStartChange: (city) => this.setStartCity(city),
            onGoalChange: (city) => this.setGoalCity(city),
            onSwapStartGoal: () => this.swapStartAndGoal(),
        })

        // 7. Initial algorithm wiring and visual synchronization
        this.updateAlgorithm()
        this.syncStartAndGoalVisuals()
    }

    private updateAlgorithm(): void {
        const startNode = this.model.findNodeByCityName(this.startCity)
        const goalNode = this.model.findNodeByCityName(this.goalCity)

        if (!startNode || !goalNode) {
            this.algorithm = null
            this.runner.setAlgorithm(null)
            return
        }

        this.algorithm = new DijkstraAlgorithm({
            model: this.model,
            startId: startNode.id,
            goalId: goalNode.id,
        })

        this.runner.setAlgorithm(this.algorithm)
    }

    private handleStep(event: DijkstraStepEvent): void {
        const startNode = this.model.findNodeByCityName(this.startCity)
        const goalNode = this.model.findNodeByCityName(this.goalCity)
        const startId = startNode?.id ?? -1
        const goalId = goalNode?.id ?? -1

        if (event.stepIndex <= 1 || event.type === 'init') {
            this.syncStartAndGoalVisuals()
            this.previousCurrentId = null
        }

        switch (event.type) {
            case 'init': {
                this.previousCurrentId = null
                break
            }

            case 'settle-node': {
                // If there was a previous current node, set to 'visited' (unless start/goal)
                if (
                    this.previousCurrentId !== null &&
                    this.previousCurrentId !== startId &&
                    this.previousCurrentId !== goalId
                ) {
                    this.model.setNodeState(this.previousCurrentId, 'visited')
                }

                // Settle new node as 'visited'
                if (
                    event.settledNodeId !== undefined &&
                    event.settledNodeId !== startId &&
                    event.settledNodeId !== goalId
                ) {
                    this.model.setNodeState(event.settledNodeId, 'visited')
                }

                // Mark current W node as 'current'
                if (
                    event.currentNodeId !== null &&
                    event.currentNodeId !== startId &&
                    event.currentNodeId !== goalId
                ) {
                    this.model.setNodeState(event.currentNodeId, 'current')
                    this.previousCurrentId = event.currentNodeId
                }
                break
            }

            case 'relax-edge': {
                // Revert any previous active edges to traversed
                for (const edge of this.model.getEdges()) {
                    if (edge.state === 'active') {
                        edge.state = 'traversed'
                    }
                }

                // Highlight the actively relaxing highway
                if (event.activeEdge) {
                    this.model.setEdgeState(
                        event.activeEdge.from,
                        event.activeEdge.to,
                        'active'
                    )
                }
                break
            }

            case 'finish-found': {
                // Revert any active edges
                for (const edge of this.model.getEdges()) {
                    if (edge.state === 'active') {
                        edge.state = 'traversed'
                    }
                }

                // Highlight entire shortest route
                if (event.foundPath) {
                    for (let i = 0; i < event.foundPath.length - 1; i++) {
                        const from = event.foundPath[i]
                        const to = event.foundPath[i + 1]
                        this.model.setEdgeState(from, to, 'path')
                    }
                    for (const id of event.foundPath) {
                        if (id !== startId && id !== goalId) {
                            this.model.setNodeState(id, 'path')
                        }
                    }
                }
                break
            }

            case 'finish-none': {
                break
            }
        }

        this.metricsPanel.updateStep(event)
        this.renderer.requestRender()
    }

    private handleFinish(_event: DijkstraStepEvent): void {
        this.playbackBar.updateButtons()
        const metrics = this.algorithm?.getMetrics()
        if (metrics) {
            this.lastMetrics = metrics
            this.metricsPanel.setFinalMetrics(metrics)
        }
        // Auto-switch to Results tab on completion
        this.context.switchSidebarTab('metrics')
    }

    private handleReset(): void {
        this.lastMetrics = null
        this.previousCurrentId = null
        this.syncStartAndGoalVisuals()
        this.metricsPanel.reset()
        this.playbackBar.updateButtons()
    }

    public exportData(): {
        filename: string
        content: string
        mimeType: string
    } {
        const history = this.runner.getHistory()
        const metrics =
            this.lastMetrics ??
            this.algorithm?.runPure() ?? {
                foundPath: null,
                pathCities: [],
                totalDistanceKm: 0,
                settledCount: 0,
                relaxationsCount: 0,
                executionTimeMs: 0,
                visitedOrder: [],
                isSuccess: false,
                statusText: 'Пошук не виконувався',
            }

        const csvContent = exportDijkstraMetricsToCSV(metrics, history)
        return {
            filename: `roads-dijkstra-results-${Date.now()}.csv`,
            content: csvContent,
            mimeType: 'text/csv;charset=utf-8;',
        }
    }

    public exportScreenshot(): HTMLCanvasElement | null {
        return this.renderer.getCanvasElement()
    }

    private handleNodeClick(nodeId: number): void {
        const node = this.model.getNode(nodeId)
        if (!node) return

        if (node.label !== this.startCity) {
            this.setGoalCity(node.label)
        }
    }

    private handleContextMenu(e: RoadsContextMenuEvent): void {
        const items: ContextMenuItem[] = []

        if (e.target.type === 'node') {
            const node = e.target.node
            items.push(
                {
                    label: `Встановити як Старт: ${node.label}`,
                    action: () => this.setStartCity(node.label),
                },
                {
                    label: `Встановити як Ціль: ${node.label}`,
                    action: () => this.setGoalCity(node.label),
                }
            )
        } else {
            items.push(
                {
                    label: 'Центрувати та вписати карту',
                    action: () => this.renderer.fitMapToViewport(),
                },
                {
                    label: `${this.renderer.isMapVisible() ? 'Сховати' : 'Показати'} підкладку карти`,
                    action: () => this.renderer.toggleMapImage(),
                }
            )
        }

        this.contextMenu.show(e.clientX, e.clientY, items)
    }

    private setStartCity(cityName: string): void {
        this.startCity = cityName
        this.paramsTab.setStartAndGoal(this.startCity, this.goalCity)
        this.runner.reset()
        this.updateAlgorithm()
        this.syncStartAndGoalVisuals()
    }

    private setGoalCity(cityName: string): void {
        this.goalCity = cityName
        this.paramsTab.setStartAndGoal(this.startCity, this.goalCity)
        this.runner.reset()
        this.updateAlgorithm()
        this.syncStartAndGoalVisuals()
    }

    private swapStartAndGoal(): void {
        const temp = this.startCity
        this.startCity = this.goalCity
        this.goalCity = temp
        this.paramsTab.setStartAndGoal(this.startCity, this.goalCity)
        this.runner.reset()
        this.updateAlgorithm()
        this.syncStartAndGoalVisuals()
    }

    private syncStartAndGoalVisuals(): void {
        const startNode = this.model.findNodeByCityName(this.startCity)
        const goalNode = this.model.findNodeByCityName(this.goalCity)

        this.model.resetVisualStates({
            startId: startNode?.id ?? null,
            goalId: goalNode?.id ?? null,
        })
        this.renderer.requestRender()
    }

    public onResize = (): void => {
        this.renderer?.resize()
    }

    public unmount = (): void => {
        this.runner?.reset()
        this.contextMenu?.destroy()
        this.renderer?.destroy()
    }
}
