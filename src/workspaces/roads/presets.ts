import { GraphData, GraphEdge, GraphNode } from '@/workspaces/graph/types'

export interface RoadRouteDef {
    from: string
    to: string
    distanceKm: number
}

export const UKRAINE_CITIES: string[] = [
    'Вінниця',
    'Дніпро',
    'Донецьк',
    'Житомир',
    'Запоріжжя',
    'Івано-Франківськ',
    'Київ',
    'Кривий Ріг',
    'Кропивницький',
    'Луганськ',
    'Луцьк',
    'Львів',
    'Маріуполь',
    'Мелітополь',
    'Миколаїв',
    'Одеса',
    'Полтава',
    'Рівне',
    'Севастополь',
    'Сімферополь',
    'Суми',
    'Тернопіль',
    'Ужгород',
    'Харків',
    'Херсон',
    'Хмельницький',
    'Черкаси',
    'Чернівці',
    'Чернігів',
]

export const UKRAINE_ROADS: RoadRouteDef[] = [
    { from: 'Вінниця', to: 'Житомир', distanceKm: 127 },
    { from: 'Вінниця', to: 'Київ', distanceKm: 267 },
    { from: 'Вінниця', to: 'Кропивницький', distanceKm: 320 },
    { from: 'Вінниця', to: 'Миколаїв', distanceKm: 428 },
    { from: 'Вінниця', to: 'Одеса', distanceKm: 423 },
    { from: 'Вінниця', to: 'Черкаси', distanceKm: 341 },
    { from: 'Вінниця', to: 'Чернівці', distanceKm: 276 },
    { from: 'Дніпро', to: 'Донецьк', distanceKm: 248 },
    { from: 'Дніпро', to: 'Запоріжжя', distanceKm: 85 },
    { from: 'Дніпро', to: 'Кропивницький', distanceKm: 244 },
    { from: 'Дніпро', to: 'Кривий Ріг', distanceKm: 146 },
    { from: 'Дніпро', to: 'Полтава', distanceKm: 160 },
    { from: 'Дніпро', to: 'Харків', distanceKm: 218 },
    { from: 'Донецьк', to: 'Луганськ', distanceKm: 156 },
    { from: 'Донецьк', to: 'Маріуполь', distanceKm: 113 },
    { from: 'Донецьк', to: 'Харків', distanceKm: 294 },
    { from: 'Запоріжжя', to: 'Мелітополь', distanceKm: 125 },
    { from: 'Івано-Франківськ', to: 'Тернопіль', distanceKm: 133 },
    { from: 'Івано-Франківськ', to: 'Ужгород', distanceKm: 293 },
    { from: 'Київ', to: 'Житомир', distanceKm: 140 },
    { from: 'Київ', to: 'Полтава', distanceKm: 340 },
    { from: 'Київ', to: 'Суми', distanceKm: 333 },
    { from: 'Київ', to: 'Черкаси', distanceKm: 189 },
    { from: 'Київ', to: 'Чернігів', distanceKm: 148 },
    { from: 'Кропивницький', to: 'Полтава', distanceKm: 246 },
    { from: 'Луганськ', to: 'Харків', distanceKm: 325 },
    { from: 'Львів', to: 'Івано-Франківськ', distanceKm: 134 },
    { from: 'Львів', to: 'Луцьк', distanceKm: 151 },
    { from: 'Львів', to: 'Рівне', distanceKm: 211 },
    { from: 'Львів', to: 'Тернопіль', distanceKm: 127 },
    { from: 'Львів', to: 'Ужгород', distanceKm: 268 },
    { from: 'Львів', to: 'Чернівці', distanceKm: 268 },
    { from: 'Мелітополь', to: 'Маріуполь', distanceKm: 192 },
    { from: 'Мелітополь', to: 'Сімферополь', distanceKm: 250 },
    { from: 'Миколаїв', to: 'Херсон', distanceKm: 69 },
    { from: 'Рівне', to: 'Житомир', distanceKm: 188 },
    { from: 'Рівне', to: 'Луцьк', distanceKm: 73 },
    { from: 'Рівне', to: 'Тернопіль', distanceKm: 155 },
    { from: 'Харків', to: 'Полтава', distanceKm: 143 },
    { from: 'Херсон', to: 'Мелітополь', distanceKm: 231 },
    { from: 'Хмельницький', to: 'Вінниця', distanceKm: 119 },
    { from: 'Хмельницький', to: 'Житомир', distanceKm: 183 },
    { from: 'Хмельницький', to: 'Рівне', distanceKm: 194 },
    { from: 'Хмельницький', to: 'Тернопіль', distanceKm: 112 },
    { from: 'Хмельницький', to: 'Чернівці', distanceKm: 187 },
    { from: 'Суми', to: 'Харків', distanceKm: 184 },
    { from: 'Черкаси', to: 'Полтава', distanceKm: 233 },
    { from: 'Полтава', to: 'Суми', distanceKm: 175 },
    { from: 'Чернігів', to: 'Суми', distanceKm: 306 },
    { from: 'Сімферополь', to: 'Севастополь', distanceKm: 81 },
]

/**
 * Initial calibration coordinates (approximate 754x567 pixel space matching Map of Ukraine.png).
 * User can adjust and calibrate them via UI and context menu.
 */
export const INITIAL_CITY_COORDINATES: Record<
    string,
    { x: number; y: number }
> = {
    Вінниця: { x: 318, y: 251 },
    Дніпро: { x: 619, y: 311 },
    Донецьк: { x: 754, y: 329 },
    Житомир: { x: 329, y: 184 },
    Запоріжжя: { x: 632, y: 349 },
    'Івано-Франківськ': { x: 144, y: 265 },
    Київ: { x: 415, y: 174 },
    'Кривий Ріг': { x: 547, y: 348 },
    Кропивницький: { x: 492, y: 309 },
    Луганськ: { x: 785, y: 256 },
    Луцьк: { x: 173, y: 141 },
    Львів: { x: 105, y: 225 },
    Маріуполь: { x: 753, y: 390 },
    Мелітополь: { x: 643, y: 419 },
    Миколаїв: { x: 482, y: 413 },
    Одеса: { x: 424, y: 450 },
    Полтава: { x: 510, y: 215 },
    Рівне: { x: 219, y: 155 },
    Севастополь: { x: 566, y: 577 },
    Сімферополь: { x: 601, y: 557 },
    Суми: { x: 600, y: 130 },
    Тернопіль: { x: 187, y: 217 },
    Ужгород: { x: 28, y: 267 },
    Харків: { x: 671, y: 195 },
    Херсон: { x: 515, y: 434 },
    Хмельницький: { x: 249, y: 239 },
    Черкаси: { x: 480, y: 243 },
    Чернівці: { x: 192, y: 312 },
    Чернігів: { x: 450, y: 93 },
}

export function buildRoadsGraph(
    coords: Record<string, { x: number; y: number }> = INITIAL_CITY_COORDINATES
): GraphData {
    const cityToId = new Map<string, number>()
    const nodes: GraphNode[] = []

    UKRAINE_CITIES.forEach((cityName, idx) => {
        const id = idx + 1
        cityToId.set(cityName, id)
        let pos = coords[cityName]
        if (!coords[cityName]) {
            // Fallback
            pos = {
                x: 100 + (idx % 5) * 100,
                y: 100 + Math.floor(idx / 5) * 60,
            }
        }

        nodes.push({
            id,
            label: cityName,
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            radius: 14,
            state: 'idle',
        })
    })

    const edges: GraphEdge[] = []
    UKRAINE_ROADS.forEach((road, idx) => {
        const fromId = cityToId.get(road.from)
        const toId = cityToId.get(road.to)
        if (fromId !== undefined && toId !== undefined) {
            edges.push({
                id: `road-${fromId}-${toId}-${idx}`,
                from: fromId,
                to: toId,
                weight: road.distanceKm,
                isDirected: false,
                state: 'idle',
            })
        }
    })

    return { nodes, edges }
}
