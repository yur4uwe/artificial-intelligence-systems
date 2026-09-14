export interface FormattedTime {
    value: string
    unit: string
    full: string
}

export function formatExecutionTime(timeMs: number): FormattedTime {
    if (timeMs <= 0) {
        return { value: '< 0.01', unit: 'мс', full: '< 0.01 мс' }
    }
    if (timeMs < 0.1) {
        const us = timeMs * 1000
        const val = us < 1 ? us.toFixed(2) : us.toFixed(1)
        return { value: val, unit: 'мкс', full: `${val} мкс` }
    }
    if (timeMs < 1) {
        return { value: timeMs.toFixed(3), unit: 'мс', full: `${timeMs.toFixed(3)} мс` }
    }
    if (timeMs >= 1000) {
        return { value: (timeMs / 1000).toFixed(2), unit: 'с', full: `${(timeMs / 1000).toFixed(2)} с` }
    }
    return { value: timeMs.toFixed(2), unit: 'мс', full: `${timeMs.toFixed(2)} мс` }
}
