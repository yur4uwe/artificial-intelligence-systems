import { DijkstraMetrics, DijkstraStepEvent } from '@/algorithms/map/types'
import {
    StatusBadge,
    StatCard,
    PathDisplay,
    FrontierCard,
    StepLogList,
    formatExecutionTime,
} from '@common/ui/metrics'
import metricsPanelHtml from './metrics-panel.html?raw'
import MapModel from '../model'

export interface UnexpandedCity {
    nodeId: number
    cityName: string
    dist: number
}

export class RoadsMetricsPanel {
    private container: HTMLElement
    private model: MapModel

    private statusBadge!: StatusBadge
    private pathDisplay!: PathDisplay<string>
    private totalDistCard!: StatCard
    private settledCard!: StatCard
    private relaxCard!: StatCard
    private timeCard!: StatCard
    private unexpandedCard!: FrontierCard<UnexpandedCity>
    private stepLogList!: StepLogList

    // Local tracking for delta events
    private unexpandedMap = new Map<number, number>()
    private settledCount = 0
    private relaxCount = 0

    constructor(container: HTMLElement, model: MapModel) {
        this.container = container
        this.model = model
        this.render()
    }

    private render(): void {
        this.container.innerHTML = metricsPanelHtml

        this.statusBadge = new StatusBadge(
            this.container.querySelector<HTMLElement>('#rmp-status-badge')!
        )

        this.pathDisplay = new PathDisplay<string>({
            container:
                this.container.querySelector<HTMLElement>('#rmp-path-display')!,
            itemFormatter: (name) => name,
        })

        this.totalDistCard = new StatCard({
            valueEl:
                this.container.querySelector<HTMLElement>('#rmp-total-dist')!,
            defaultValue: 0,
        })

        this.settledCard = new StatCard({
            valueEl: this.container.querySelector<HTMLElement>(
                '#rmp-settled-count'
            )!,
            defaultValue: 0,
        })

        this.relaxCard = new StatCard({
            valueEl:
                this.container.querySelector<HTMLElement>('#rmp-relax-count')!,
            defaultValue: 0,
        })

        this.timeCard = new StatCard({
            valueEl:
                this.container.querySelector<HTMLElement>('#rmp-exec-time')!,
            unitEl: this.container.querySelector<HTMLElement>('#rmp-exec-unit'),
            defaultValue: '0.00',
            defaultUnit: 'мс',
        })

        this.unexpandedCard = new FrontierCard<UnexpandedCity>({
            titleEl: null,
            countEl: this.container.querySelector<HTMLElement>(
                '#rmp-unexpanded-count'
            ),
            chipsEl: this.container.querySelector<HTMLElement>(
                '#rmp-unexpanded-chips'
            )!,
            itemFormatter: (item) => `${item.cityName} (${item.dist} км)`,
            countFormatter: (count) => `${count} міст`,
            emptyText: 'Список порожній',
        })

        this.stepLogList = new StepLogList(
            this.container.querySelector<HTMLElement>('#rmp-log-list')!
        )
    }

    public setModel(model: MapModel): void {
        this.model = model
    }

    public updateStep(event: DijkstraStepEvent): void {
        this.statusBadge.setStatus(event.status)

        switch (event.type) {
            case 'init': {
                this.unexpandedMap.clear()
                this.settledCount = 0
                this.relaxCount = 0
                if (event.relaxedDistance) {
                    this.unexpandedMap.set(
                        event.relaxedDistance.nodeId,
                        event.relaxedDistance.dist
                    )
                }
                break
            }

            case 'settle-node': {
                if (event.settledNodeId !== undefined) {
                    this.settledCount++
                    this.unexpandedMap.delete(event.settledNodeId)
                }
                break
            }

            case 'relax-edge': {
                this.relaxCount++
                if (event.relaxedDistance) {
                    this.unexpandedMap.set(
                        event.relaxedDistance.nodeId,
                        event.relaxedDistance.dist
                    )
                }
                break
            }

            case 'finish-found': {
                if (event.settledNodeId !== undefined) {
                    this.settledCount++
                    this.unexpandedMap.delete(event.settledNodeId)
                }
                if (event.foundPath) {
                    const cityNames = event.foundPath.map(
                        (id) => this.model.getNode(id)?.label ?? `v${id}`
                    )
                    this.pathDisplay.setPath(cityNames)
                }
                if (event.totalDistanceKm !== undefined) {
                    this.totalDistCard.setValue(event.totalDistanceKm)
                }
                break
            }

            case 'finish-none': {
                this.pathDisplay.setNotFound()
                break
            }
        }

        this.settledCard.setValue(this.settledCount)
        this.relaxCard.setValue(this.relaxCount)
        this.syncUnexpandedChips()

        if (event.actionDescription) {
            this.stepLogList.append(event.stepIndex, event.actionDescription)
        }
    }

    private syncUnexpandedChips(): void {
        const sortedItems: UnexpandedCity[] = Array.from(
            this.unexpandedMap.entries()
        )
            .map(([nodeId, dist]) => ({
                nodeId,
                cityName: this.model.getNode(nodeId)?.label ?? `v${nodeId}`,
                dist,
            }))
            .sort((a, b) => a.dist - b.dist)

        this.unexpandedCard.setItems(sortedItems)
    }

    public setFinalMetrics(metrics: DijkstraMetrics): void {
        this.statusBadge.setStatus(metrics.isSuccess ? 'found' : 'not-found')
        this.totalDistCard.setValue(metrics.totalDistanceKm)
        this.settledCard.setValue(metrics.settledCount)
        this.relaxCard.setValue(metrics.relaxationsCount)

        const formatted = formatExecutionTime(metrics.executionTimeMs)
        this.timeCard.setValue(formatted.value, formatted.unit)

        if (metrics.isSuccess && metrics.pathCities.length > 0) {
            this.pathDisplay.setPath(metrics.pathCities)
        } else {
            this.pathDisplay.setNotFound()
        }
    }

    public reset(): void {
        this.unexpandedMap.clear()
        this.settledCount = 0
        this.relaxCount = 0

        this.statusBadge.reset()
        this.pathDisplay.reset()
        this.totalDistCard.reset()
        this.settledCard.reset()
        this.relaxCard.reset()
        this.timeCard.reset()
        this.unexpandedCard.reset()
        this.stepLogList.reset()
    }
}
