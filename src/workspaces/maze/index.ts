import { WorkspaceContext, WorkspaceModule } from '@/types'
import { MazeModel } from './maze-model'
import { GridRenderer } from './drawing/grid-renderer'
import { SearchRunner } from '@common/engine/search-runner'
import { PlaybackBar } from '@common/ui/playback-bar'
import { MazeMetricsPanel } from './ui/metrics-panel'
import { MazeParamsTab, MazeAlgorithmType } from './ui/params-tab'
import { MAZE_PRESETS, PRESET_15_CLASSIC } from './presets'
import { exportMazeMetricsToCSV } from './export-utils'
import {
    MazeMetrics,
    MazeStepEvent,
    TransitionOperator,
    parseCoordKey,
} from '@/algorithms/maze/types'
import { BaseMazeSearch } from '@/algorithms/maze/base'
import WaveUniAlgorithm from '@/algorithms/maze/wave-uni'
import WaveBiAlgorithm from '@/algorithms/maze/wave-bi'

import { ContextMenu, ContextMenuItem } from '@common/ui/context-menu'
import { MazeContextMenuEvent } from './drawing/grid-renderer'

export default class MazeWorkspace implements WorkspaceModule {
    public id = 'maze-workspace'

    private context!: WorkspaceContext
    private model!: MazeModel
    private renderer!: GridRenderer
    private runner!: SearchRunner<MazeStepEvent>
    private playbackBar!: PlaybackBar
    private metricsPanel!: MazeMetricsPanel
    private paramsTab!: MazeParamsTab
    private contextMenu!: ContextMenu

    private activeAlgorithmType: MazeAlgorithmType = 'wave-uni'
    private activeOperator: TransitionOperator = 'orthogonal'
    private activeAlgorithm: BaseMazeSearch | null = null
    private lastMetrics: MazeMetrics | null = null

    public async mount(context: WorkspaceContext): Promise<void> {
        this.context = context

        // 1. Initialize Maze Model with 15x15 Classic preset (start and goal unset)
        this.model = new MazeModel(
            PRESET_15_CLASSIC.rows,
            PRESET_15_CLASSIC.cols,
            null,
            null
        )
        this.model.loadPreset(PRESET_15_CLASSIC)

        // 2. Initialize Canvas Renderer & Context Menu
        this.contextMenu = new ContextMenu()
        this.renderer = new GridRenderer(this.context.canvas, this.model, {
            onCellClick: () => this.handleCellClick(),
            onModelChange: () => this.handleModelChange(),
            onContextMenu: (e) => this.handleContextMenu(e),
        })

        // 3. Initialize Search Runner Engine
        this.runner = new SearchRunner<MazeStepEvent>({
            onStep: (event) => this.handleStep(event),
            onFinish: (event) => this.handleFinish(event),
            onReset: () => this.handleReset(),
        })

        // 4. Initialize Playback Bar in global playback container
        this.playbackBar = new PlaybackBar({
            container: this.context.playbackContainer,
            runner: this.runner,
            onStateChange: () => this.renderer.requestRender(),
            canPlay: () => {
                const start = this.model.getStart()
                const goal = this.model.getGoal()
                if (start === null || goal === null) {
                    alert(
                        'Будь ласка, виберіть початкову (Start) та цільову (Goal) клітинки!'
                    )
                    return false
                }
                if (this.model.isWall(start.r, start.c)) {
                    alert('Початкова точка не може бути стіною!')
                    return false
                }
                if (this.model.isWall(goal.r, goal.c)) {
                    alert('Цільова точка не може бути стіною!')
                    return false
                }
                return true
            },
        })

        // 5. Initialize Sidebar Panels
        this.metricsPanel = new MazeMetricsPanel(this.context.metricsContainer)

        this.paramsTab = new MazeParamsTab({
            container: this.context.paramsContainer,
            presets: MAZE_PRESETS,
            onAlgorithmChange: (algo) => {
                this.activeAlgorithmType = algo
                this.metricsPanel.setBidirectionalVisible(algo === 'wave-bi')
                this.metricsPanel.setFrontierLabel(
                    algo === 'wave-bi' ? 'Зустрічні фронти' : 'Фронт хвилі'
                )
                this.runner.reset()
                this.updateAlgorithm()
            },
            onOperatorChange: (op) => {
                this.activeOperator = op
                this.runner.reset()
                this.updateAlgorithm()
            },
            onPresetChange: (presetId) => {
                const preset = MAZE_PRESETS.find((p) => p.id === presetId)
                if (preset) {
                    this.model.loadPreset(preset)
                    this.runner.reset()
                    this.syncUIState()
                    this.updateAlgorithm()
                    this.renderer.zoomToFit()
                }
            },
            onDimensionsChange: (rows, cols) => {
                this.model.resize(rows, cols)
                this.runner.reset()
                this.syncUIState()
                this.updateAlgorithm()
                this.renderer.zoomToFit()
            },
            onSwapStartGoal: () => {
                this.model.swapStartGoal()
                this.runner.reset()
                this.syncUIState()
                this.updateAlgorithm()
                this.renderer.requestRender()
            },
        })

        this.syncUIState()
        this.updateAlgorithm()

        // Auto-fit initial grid after slight layout delay
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
            openedCellsCount: 0,
            cyclesCount: 0,
            executionTimeMs: 0,
            visitedOrder: [],
            isSuccess: false,
            statusText: 'Пошук не виконувався',
        }

        const labTitle =
            this.activeAlgorithmType === 'wave-uni'
                ? 'Лабораторна 3: Одно-направлений хвильовий пошук (Лі)'
                : 'Лабораторна 4: Двонаправлений хвильовий пошук'

        const opTitle =
            this.activeOperator === 'orthogonal'
                ? '4-напрямковий (вверх-вниз-вправо-вліво)'
                : this.activeOperator === 'diagonal'
                  ? 'діагональний (4 діагоналі)'
                  : '8-напрямковий (комбінація двох)'

        const gridDim = `${this.model.getRows()} × ${this.model.getCols()}`
        const obsPct = Math.round(this.model.getObstacleRatio() * 100)

        const csvContent = exportMazeMetricsToCSV(
            metrics,
            history,
            labTitle,
            opTitle,
            gridDim,
            obsPct
        )

        return {
            filename: `maze-${this.activeAlgorithmType}-${Date.now()}.csv`,
            content: csvContent,
            mimeType: 'text/csv;charset=utf-8;',
        }
    }

    public exportScreenshot(): HTMLCanvasElement {
        return this.renderer.getCanvasElement()
    }

    // --- Internal Handlers ---

    private updateAlgorithm(): void {
        const start = this.model.getStart()
        const goal = this.model.getGoal()

        if (start === null || goal === null) {
            this.activeAlgorithm = null
            this.runner.setAlgorithm(null)
            return
        }

        const options = {
            grid: this.model.getGrid(),
            start,
            goal,
            operator: this.activeOperator,
        }

        if (this.activeAlgorithmType === 'wave-uni') {
            this.activeAlgorithm = new WaveUniAlgorithm(options)
        } else {
            this.activeAlgorithm = new WaveBiAlgorithm(options)
        }

        this.runner.setAlgorithm(this.activeAlgorithm)
    }

    private syncUIState(): void {
        const start = this.model.getStart()
        const goal = this.model.getGoal()
        this.paramsTab.updateStartGoalDisplay(start, goal)
        this.paramsTab.updateDimensionsDisplay(
            this.model.getRows(),
            this.model.getCols()
        )
    }

    private handleCellClick(): void {
        this.runner.reset()
        this.syncUIState()
        this.updateAlgorithm()
    }

    private handleModelChange(): void {
        this.runner.reset()
        this.syncUIState()
        this.updateAlgorithm()
        this.renderer.requestRender()
    }

    private handleContextMenu(e: MazeContextMenuEvent): void {
        const cell = e.cell
        let menuItems: ContextMenuItem[] = []

        if (cell) {
            const isWall = this.model.isWall(cell.r, cell.c)
            const isStart =
                this.model.getStart()?.r === cell.r &&
                this.model.getStart()?.c === cell.c
            const isGoal =
                this.model.getGoal()?.r === cell.r &&
                this.model.getGoal()?.c === cell.c

            menuItems.push(
                {
                    label: isStart ? 'Скинути Start' : 'Встановити як Start',
                    action: () => {
                        this.model.setStart(
                            isStart ? null : cell.r,
                            isStart ? null : cell.c
                        )
                        this.handleModelChange()
                    },
                },
                {
                    label: isGoal ? 'Скинути Goal' : 'Встановити як Goal',
                    action: () => {
                        this.model.setGoal(
                            isGoal ? null : cell.r,
                            isGoal ? null : cell.c
                        )
                        this.handleModelChange()
                    },
                },
                {
                    divider: true,
                    label: isWall ? 'Зробити проходом' : 'Зробити стіною',
                    action: () => {
                        this.model.setWallState(cell.r, cell.c, !isWall)
                        this.handleModelChange()
                    },
                },
                {
                    divider: true,
                    label: 'Центрувати сітку',
                    action: () => this.renderer.zoomToFit(),
                },
                {
                    label: 'Скинути масштаб (1:1)',
                    action: () => this.renderer.resetZoom(),
                },
                {
                    divider: true,
                    danger: true,
                    label: 'Очистити всі стіни',
                    action: () => {
                        this.model.clearWalls()
                        this.handleModelChange()
                    },
                }
            )
        } else {
            menuItems = [
                {
                    label: 'Центрувати сітку',
                    action: () => this.renderer.zoomToFit(),
                },
                {
                    label: 'Скинути масштаб (1:1)',
                    action: () => this.renderer.resetZoom(),
                },
                {
                    divider: true,
                    danger: true,
                    label: 'Очистити всі стіни',
                    action: () => {
                        this.model.clearWalls()
                        this.handleModelChange()
                    },
                },
            ]
        }

        this.contextMenu.show(e.clientX, e.clientY, menuItems)
    }

    private handleStep(event: MazeStepEvent): void {
        // 1. Reset visual info on model
        this.model.resetVisualInfo()

        // 2. Set forward wave distances
        for (const [key, dist] of Object.entries(event.forwardDistances)) {
            const coord = parseCoordKey(key)
            this.model.setVisualInfo(coord.r, coord.c, { forwardDist: dist })
        }

        // 3. Set backward wave distances if bidirectional
        if (event.backwardDistances) {
            for (const [key, dist] of Object.entries(event.backwardDistances)) {
                const coord = parseCoordKey(key)
                this.model.setVisualInfo(coord.r, coord.c, {
                    backwardDist: dist,
                })
            }
        }

        // 4. Mark frontier cells
        for (const c of event.frontier) {
            this.model.setVisualInfo(c.r, c.c, { isFrontier: true })
        }

        // 5. Mark current cell
        if (event.currentCell) {
            this.model.setVisualInfo(event.currentCell.r, event.currentCell.c, {
                isCurrent: true,
            })
        }

        // 6. Mark meeting point if found
        if (event.meetingPoint) {
            this.model.setVisualInfo(
                event.meetingPoint.r,
                event.meetingPoint.c,
                { isMeeting: true }
            )
        }

        // 7. Mark path cells if found
        if (event.foundPath) {
            this.model.setPath(event.foundPath)
            for (const p of event.foundPath) {
                this.model.setVisualInfo(p.r, p.c, { isPath: true })
            }
        }

        this.renderer.requestRender()
        this.metricsPanel.updateStep(event)
    }

    private handleFinish(_event: MazeStepEvent): void {
        this.playbackBar.updateButtons()
        const metrics = this.activeAlgorithm?.getMetrics()
        if (metrics) {
            this.lastMetrics = metrics
            this.metricsPanel.setFinalMetrics(metrics)
        }
        // Auto-switch to Results tab
        this.context.switchSidebarTab('metrics')
    }

    private handleReset(): void {
        this.lastMetrics = null
        this.model.setPath(null)
        this.model.resetVisualInfo()
        this.renderer.requestRender()
        this.metricsPanel.reset()
        this.playbackBar.updateButtons()
    }
}
