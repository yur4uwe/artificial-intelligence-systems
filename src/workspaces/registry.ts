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
        title: 'Сліпий пошук на графах (BFS та DFS)',
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
        title: 'Хвильовий пошук у лабіринті (Лаб. 3 та 4)',
        shortTitle: 'Хвильовий пошук',
        description:
            'Одно- та двонаправлений хвильовий алгоритм Лі на одиничних сітках 10-20 порядку',
        loader: async () => {
            const module = await import('./maze/index')
            return new module.default()
        },
    },
]
