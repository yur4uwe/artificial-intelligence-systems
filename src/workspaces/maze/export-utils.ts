import { MazeMetrics, MazeStepEvent } from '@/algorithms/maze/types'

export function exportMazeMetricsToCSV(
    metrics: MazeMetrics,
    traceHistory: MazeStepEvent[],
    labTitle: string,
    operator: string,
    gridDimensions: string,
    obstacleRatioPct: number
): string {
    const lines: string[] = []

    lines.push(`"Лабораторна робота","${labTitle}"`)
    lines.push(`"Дата/Час","${new Date().toLocaleString('uk-UA')}"`)
    lines.push(`"Оператор переходу","${operator}"`)
    lines.push(`"Розмірність сітки (порядок)","${gridDimensions}"`)
    lines.push(`"Частка перешкод","${obstacleRatioPct}%"`)
    lines.push(`"Результат пошуку","${metrics.statusText}"`)
    lines.push(
        `"Знайдений шлях","${
            metrics.foundPath
                ? metrics.foundPath.map((p) => `(${p.r},${p.c})`).join(' -> ')
                : 'Не знайдено'
        }"`
    )
    lines.push(`"Довжина шляху (кроків)","${metrics.pathLength}"`)
    lines.push(`"Кількість розкритих клітинок","${metrics.openedCellsCount}"`)
    lines.push(`"Кількість циклів хвилі","${metrics.cyclesCount}"`)
    if (metrics.meetingPoint) {
        lines.push(
            `"Точка зустрічі хвиль","(${metrics.meetingPoint.r}, ${metrics.meetingPoint.c})"`
        )
    }
    if (metrics.searchSpaceReductionPct !== undefined) {
        lines.push(
            `"Скорочення простору пошуку","${metrics.searchSpaceReductionPct}%"`
        )
    }
    lines.push(`"Час виконання (мс)","${metrics.executionTimeMs.toFixed(3)}"`)
    lines.push('')
    lines.push(
        '"Крок","Поточна клітина","Фронт (Queue)","Розкрито","Дія / Пояснення"'
    )

    traceHistory.forEach((step, idx) => {
        const frontierStr = `[${step.frontier.map((p) => `(${p.r},${p.c})`).join(' ')}]`
        const currStr = step.currentCell
            ? `(${step.currentCell.r},${step.currentCell.c})`
            : '-'
        const actionClean = step.actionDescription.replace(/"/g, '""')
        lines.push(
            `${idx + 1},"${currStr}","${frontierStr}",${step.openedCount},"${actionClean}"`
        )
    })

    return lines.join('\n')
}
