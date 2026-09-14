import { StepStatus } from '@/types'

export interface StatusBadgeConfig {
    text: string
    bg: string
    border: string
    color: string
}

export const DEFAULT_STATUS_CONFIGS: Record<StepStatus, StatusBadgeConfig> = {
    running: {
        text: 'Виконується...',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#f59e0b',
    },
    found: {
        text: 'Ціль досягнуто',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        color: '#10b981',
    },
    'not-found': {
        text: 'Шлях не існує',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.35)',
        color: '#f43f5e',
    },
    idle: {
        text: 'Очікування запуску',
        bg: 'var(--color-bg-elevated)',
        border: 'var(--color-border-subtle)',
        color: 'var(--color-text-secondary)',
    },
}

export class StatusBadge {
    private element: HTMLElement
    private customConfigs?: Partial<Record<StepStatus, Partial<StatusBadgeConfig>>>

    constructor(
        element: HTMLElement,
        customConfigs?: Partial<Record<StepStatus, Partial<StatusBadgeConfig>>>
    ) {
        this.element = element
        this.customConfigs = customConfigs
        this.reset()
    }

    public setStatus(status: StepStatus, customText?: string): void {
        const base = DEFAULT_STATUS_CONFIGS[status] ?? DEFAULT_STATUS_CONFIGS.idle
        const custom = this.customConfigs?.[status]
        const config = { ...base, ...custom }

        this.element.className =
            'px-2.5 py-0.5 rounded-full font-semibold text-[11px] border'
        this.element.style.backgroundColor = config.bg
        this.element.style.borderColor = config.border
        this.element.style.color = config.color
        this.element.textContent = customText ?? config.text
    }

    public reset(): void {
        this.setStatus('idle')
    }
}
