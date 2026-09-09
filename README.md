# Системи Штучного Інтелекту (Artificial Intelligence Systems)


---

## Запуск проєкту

### Вимоги
- [Node.js](https://nodejs.org/) (v18+) або [Bun](https://bun.sh/) (v1.0+)

### Команди для запуску
```bash
# Запуск локального сервера розробки
bun run dev
# або
npm run dev

# Збірка продакшн версії
bun run build
# або
npm run build
```
Після запуску відкрийте у браузері: `http://localhost:3000`

---

## Структура проєкту

```
ais/
├── src/
│   ├── types.ts # Типи моделей графів, метрик, кроків та модулів
│   ├── common/  # Спільні компоненти для імпорту
│   │   ├── graph/
│   │   │   ├── graph-model.ts
│   │   │   ├── canvas-renderer.ts
│   │   │   └── export-utils.ts
│   │   ├── ui/
│   │   │   ├── playback-bar.ts    # Панель керування анімацією (Play, Step, Slider)
│   │   │   └── metrics-panel.ts   # Картки метрик (цикли, розкриті вершини, черга FIFO)
│   │   └── engine/
│   │       └── search-runner.ts   # Движок покрокового виконання генераторів
│   └── labs/
│       ├── registry.ts        # Реєстр лабораторних з lazyload-імпортами
│       └── 1-blind-search/    # Лабораторна 1: Пошук в ширину (BFS)
```

---

