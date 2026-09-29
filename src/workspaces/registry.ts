import { WorkspaceManifest } from '@/types'

export const WRKSPC_REGISTRY: WorkspaceManifest[] = [
    {
        id: '0-palette-test',
        title: 'Palette Test',
        shortTitle: 'Palette Test',
        description: 'Test palette',
        loader: async () => {
            const module = await import('./palette-test/index')
            return new module.default()
        },
    },
    {
        id: '1-blind-search',
        title: 'Сліпий пошук на графах',
        shortTitle: 'Пошук на графах',
        description:
            'Дослідження пошуку в ширину та глибину на деревах, звичайних та орієнтованих графах',
        loader: async () => {
            const module = await import('./graph/index')
            return new module.default()
        },
    },
    {
        id: '2-maze-workspace',
        title: 'Хвильовий пошук у лабіринті',
        shortTitle: 'Хвильовий пошук',
        description:
            'Одно- та двонаправлений хвильовий алгоритм Лі на одиничних сітках 10-20 порядку',
        loader: async () => {
            const module = await import('./maze/index')
            return new module.default()
        },
    },
    {
        id: '3-roads-workspace',
        title: 'Автомобільні шляхи України',
        shortTitle: 'Автошляхи',
        description:
            'Знаходження найкоротшого шляху на зваженому графі автомобільних сполучень між містами України',
        loader: async () => {
            const module = await import('./roads/index')
            return new module.default()
        },
    },
]
