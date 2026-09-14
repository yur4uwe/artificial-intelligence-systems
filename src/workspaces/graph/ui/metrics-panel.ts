import { GraphMetrics, GraphStepEvent } from '@/algorithms/graph/common'
import {
    StatusBadge,
    StatCard,
    PathDisplay,
    FrontierCard,
    StepLogList,
    formatExecutionTime,
} from '@common/ui/metrics'
import metricsPanelHtml from './metrics-panel.html?raw'

export class GraphMetricsPanel {
    private container: HTMLElement

    private statusBadge!: StatusBadge
    private pathDisplay!: PathDisplay<number>
    private pathLengthCard!: StatCard
    private openedNodesCard!: StatCard
    private cyclesCard!: StatCard
    private timeCard!: StatCard
    private frontierCard!: FrontierCard<number>
    private stepLogList!: StepLogList

    constructor(container: HTMLElement) {
        this.container = container
        this.render()
    }

    private render(): void {
        this.container.innerHTML = metricsPanelHtml

        this.statusBadge = new StatusBadge(
            this.container.querySelector<HTMLElement>('#gmp-status-badge')!
        )

        this.pathDisplay = new PathDisplay<number>({
            container: this.container.querySelector<HTMLElement>('#gmp-path-display')!,
            itemFormatter: (id) => `v${id}`,
        })

        this.pathLengthCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#gmp-path-length')!,
            defaultValue: 0,
        })

        this.openedNodesCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#gmp-opened-nodes')!,
            defaultValue: 0,
        })

        this.cyclesCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#gmp-cycles')!,
            defaultValue: 0,
        })

        this.timeCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>('#gmp-exec-time')!,
            unitEl: this.container.querySelector<HTMLElement>('#gmp-exec-unit'),
            defaultValue: '0.00',
            defaultUnit: 'мс',
        })

        this.frontierCard = new FrontierCard<number>({
            titleEl: this.container.querySelector<HTMLElement>('#gmp-frontier-title'),
            countEl: this.container.querySelector<HTMLElement>('#gmp-frontier-count'),
            chipsEl: this.container.querySelector<HTMLElement>('#gmp-frontier-chips')!,
            itemFormatter: (id) => `v${id}`,
        })

        this.stepLogList = new StepLogList(
            this.container.querySelector<HTMLElement>('#gmp-log-list')!
        )
    }

    public setFrontierLabel(label: string): void {
        this.frontierCard.setTitle(label)
    }

    public updateStep(event: GraphStepEvent): void {
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

        this.frontierCard.setItems(event.frontier)

        if (event.actionDescription) {
            this.stepLogList.append(event.stepIndex, event.actionDescription)
        }
    }

    public setFinalMetrics(metrics: GraphMetrics): void {
        const formatted = formatExecutionTime(metrics.executionTimeMs)
        this.timeCard.setValue(formatted.value, formatted.unit)
        if (metrics.foundPath) {
            this.pathLengthCard.setValue(metrics.pathLength)
        }
        this.stepLogList.scrollToBottom()
    }

    public scrollToBottom(): void {
        this.stepLogList.scrollToBottom()
    }

    public reset(): void {
        this.statusBadge.reset()
        this.pathDisplay.reset()
        this.pathLengthCard.reset()
        this.openedNodesCard.reset()
        this.cyclesCard.reset()
        this.timeCard.reset()
        this.frontierCard.reset()
        this.stepLogList.reset()
    }
}
