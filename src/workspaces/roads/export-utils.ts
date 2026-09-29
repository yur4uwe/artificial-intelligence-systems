import { DijkstraMetrics, DijkstraStepEvent } from '@/algorithms/map/types'

export function exportDijkstraMetricsToCSV(
    metrics: DijkstraMetrics,
    traceHistory: DijkstraStepEvent[],
    labTitle: string = 'Лабораторна 5: Алгоритм Дейкстри (Автошляхи України)'
): string {
    const lines: string[] = []

    lines.push(`"Лабораторна робота","${labTitle}"`)
    lines.push(`"Дата/Час","${new Date().toLocaleString('uk-UA')}"`)
    lines.push(`"Результат пошуку","${metrics.statusText}"`)
    lines.push(
        `"Знайдений найкоротший шлях","${metrics.pathCities.length > 0 ? metrics.pathCities.join(' -> ') : 'Не знайдено'}"`
    )
    lines.push(`"Загальна відстань (км)","${metrics.totalDistanceKm}"`)
    lines.push(`"Кількість розкритих міст (W)","${metrics.settledCount}"`)
    lines.push(`"Кількість релаксацій доріг","${metrics.relaxationsCount}"`)
    lines.push(`"Час розрахунку (мс)","${metrics.executionTimeMs.toFixed(3)}"`)
    lines.push('')
    lines.push('"Крок","Тип кроку","Поточна W-вершина","Пояснення / Дія"')

    traceHistory.forEach((step) => {
        const actionClean = step.actionDescription.replace(/"/g, '""')
        lines.push(
            `${step.stepIndex},"${step.type}",${step.currentNodeId ?? '-'},"${actionClean}"`
        )
    })

    return lines.join('\n')
}
