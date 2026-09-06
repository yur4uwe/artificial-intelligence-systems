import { LabManifest } from '../types';

export const LABS_REGISTRY: LabManifest[] = [
    {
        id: '0-palette-test',
        title: 'Palette Test',
        shortTitle: 'Palette Test',
        description: 'Test palette',
        loader: async () => {
            const module = await import('./0-palette-test/index');
            return new module.default();
        },
    },
    {
        id: '1-blind-search',
        title: 'Лабораторна 1: Сліпий пошук на графах (BFS)',
        shortTitle: 'Лаб 1: BFS Пошук',
        description: 'Дослідження пошуку в ширину на деревах, звичайних та орієнтованих графах',
        loader: async () => {
            const module = await import('./1-blind-search/index');
            return new module.default();
        },
    },
    // {
    //     id: '2-heuristic-search',
    //     title: 'Лабораторна 2: Евристичний пошук (A*)',
    //     shortTitle: 'Лаб 2: Евристики',
    //     description: 'Евристичний пошук та алгоритм A* (в розробці)',
    //     loader: async () => {
    //         // Placeholder until Lab 2 is implemented
    //         return {
    //             id: '2-heuristic-search',
    //             mount: (container) => {
    //                 container.innerHTML = `
    //         <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
    //           <div class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-4 shadow-xl">
    //             🧭
    //           </div>
    //           <h2 class="text-xl font-bold text-slate-100 mb-2">Лабораторна робота №2</h2>
    //           <p class="text-sm text-slate-400 max-w-md mb-6">
    //             Модуль евристичного пошуку (A*, жадібний пошук) буде додано у цей таб. Загальні компоненти з <code class="text-indigo-400 font-mono">common/</code> вже готові до імпорту.
    //           </p>
    //         </div>
    //       `;
    //             },
    //             unmount: () => { },
    //         };
    //     },
    // },
];
