import { GridCoord, MazeMetrics, MazeStepEvent } from '@/algorithms/maze/types'
import {
    StatusBadge,
    StatCard,
    PathDisplay,
    FrontierCard,
    StepLogList,
    formatExecutionTime,
} from '@common/ui/metrics'
import metricsPanelHtml from './metrics-panel.html?raw'

export class MazeMetricsPanel {
    private container: HTMLElement

    private statusBadge!: StatusBadge
    private pathDisplay!: PathDisplay<GridCoord>
    private pathLengthCard!: StatCard
    private openedNodesCard!: StatCard
    private cyclesCard!: StatCard
    private timeCard!: StatCard
    private biCard!: HTMLElement
    private meetingPointEl!: HTMLElement
    private reductionPctEl!: HTMLElement
    private frontierCard!: FrontierCard<GridCoord>
    private stepLogList!: StepLogList

    constructor(container: HTMLElement) {
        this.container = container
        this.render()
    }

    private render(): void {
        this.container.innerHTML = metricsPanelHtml

        this.statusBadge = new StatusBadge(
            this.container.querySelector<HTMLElement>('#mmp-status-badge')!
        )

        this.pathDisplay = new PathDisplay<GridCoord>({
            container: this.container.querySelector<HTMLElement>('#mmp-path-display')!,
            itemFormatter: (c) => `(${c.r},${c.c})`,
        })

        this.pathLengthCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#mmp-path-length')!,
            defaultValue: 0,
        })

        this.openedNodesCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#mmp-opened-nodes')!,
            defaultValue: 0,
        })

        this.cyclesCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#mmp-cycles')!,
            defaultValue: 0,
        })

        this.timeCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#mmp-exec-time')!,
            unitEl: this.container.querySelector<HTMLElement>('#mmp-exec-unit'),
            defaultValue: '0.00',
            defaultUnit: 'мс',
        })

        this.biCard = this.container.querySelector<HTMLElement>('#mmp-bi-info-card')!
        this.meetingPointEl = this.container.querySelector<HTMLElement>('#mmp-meeting-point')!
        this.reductionPctEl = this.container.querySelector<HTMLElement>('#mmp-reduction-pct')!

        this.frontierCard = new FrontierCard<GridCoord>({
            titleEl: this.container.querySelector<HTMLElement>('#mmp-frontier-title'),
            countEl: this.container.querySelector<HTMLElement>('#mmp-frontier-count'),
            chipsEl: this.container.querySelector<HTMLElement>('#mmp-frontier-chips')!,
            itemFormatter: (c) => `(${c.r},${c.c})`,
        })

        this.stepLogList = new StepLogList(
            this.container.querySelector<HTMLElement>('#mmp-log-list')!
        )
    }

    public setFrontierLabel(label: string): void {
        this.frontierCard.setTitle(label)
    }

    public setBidirectionalVisible(visible: boolean): void {
        if (visible) {
            this.biCard.classList.remove('hidden')
        } else {
            this.biCard.classList.add('hidden')
        }
    }

    public updateStep(event: MazeStepEvent): void {
        this.statusBadge.setStatus(event.status)
        this.openedNodesCard.setValue(event.openedCount)
        this.cyclesCard.setValue(event.cycleCount)

        if (event.foundPath && event.foundPath.length > 0) {
            this.pathDisplay.setPath(event.foundPath)
            this.pathLengthCard.setValue(event.foundPath.length - 1)
        } else if (event.status === 'not-found') {
            this.pathDisplay.setNotFound()
            this.pathLengthCard.setValue(0)
        }

        if (event.meetingPoint) {
            this.meetingPointEl.textContent = `(${event.meetingPoint.r}, ${event.meetingPoint.c})`
        }

        this.frontierCard.setItems(event.frontier)

        if (event.actionDescription) {
            this.stepLogList.append(event.stepIndex, event.actionDescription)
        }
    }

    public setFinalMetrics(metrics: MazeMetrics): void {
        const formatted = formatExecutionTime(metrics.executionTimeMs)
        this.timeCard.setValue(formatted.value, formatted.unit)
        if (metrics.foundPath) {
            this.pathLengthCard.setValue(metrics.pathLength)
        }
        if (metrics.meetingPoint) {
            this.meetingPointEl.textContent = `(${metrics.meetingPoint.r}, ${metrics.meetingPoint.c})`
        }
        if (metrics.searchSpaceReductionPct !== undefined) {
            this.reductionPctEl.textContent = `${metrics.searchSpaceReductionPct}%`
        }
        this.stepLogList.scrollToBottom()
    }

    public reset(): void {
        this.statusBadge.reset()
        this.pathDisplay.reset()
        this.pathLengthCard.reset()
        this.openedNodesCard.reset()
        this.cyclesCard.reset()
        this.timeCard.reset()
        this.meetingPointEl.textContent = '—'
        this.reductionPctEl.textContent = '0%'
        this.frontierCard.reset()
        this.stepLogList.reset()
    }
}
