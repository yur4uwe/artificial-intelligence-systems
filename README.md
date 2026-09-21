# Artificial Intelligence Systems (AIS)

Interactive web-based workbench for algorithmic exploration, visualization, and metric analysis across graph and grid search techniques.

---

### Project Objectives & Context

This system was built for the *Artificial Intelligence Systems* course at Ivan Franko National University of Lviv. It provides interactive visual environments to study, benchmark, and report on classical search algorithms across three core problem domains:

1. **Graph Workspace (Lab Works 1 & 2: Blind Search on Graphs)**
   * *Lab 1 (BFS)*: Breadth-First Search on trees, undirected graphs, and directed graphs (digraphs) of order $\ge 30$. Evaluates traversal directions, visited vertices, cycle count, and branch factor.
   * *Lab 2 (DFS)*: Depth-First Search comparing FIFO queue versus LIFO stack frontier behaviors, tracking recursion/backtracking cycles, and analyzing completeness and optimality differences.

2. **Maze Workspace (Lab Works 3 & 4: Wave Algorithm in Unit Grids)**
   * *Lab 3 (Unidirectional Wave)*: Lee wave algorithm on unit maze grids (where 0 is passable and -1 is an obstacle). Tests different transition operators: 4-directional (up, down, left, right), diagonal, and 8-directional combination.
   * *Lab 4 (Bidirectional Wave)*: Simultaneous bidirectional wave propagation starting from both source and goal cells, identifying the intersection meeting point and measuring search space reduction.

3. **Roads Workspace (Lab Work 5: Shortest Path on Weighted Graphs)**
   * *Lab 5 (Dijkstra)*: Dijkstra shortest path algorithm applied to the scheme of Ukraine's major automotive highways and inter-city distances. Features priority queue relaxations, road segment analysis, and total route mileage in kilometers.

---

### Architectural Design

The application is architected around modular workspaces and composable UI primitives:

* **Global Shell ([src/main.ts](file:///home/yur4uwe/Uni/ais/src/main.ts), [index.html](file:///home/yur4uwe/Uni/ais/index.html))**
  Manages top-level navigation, lazy loading of workspace modules, canvas lifecycle, theme synchronization, and sidebar tab routing.

* **Search Engine ([src/common/engine/search-runner.ts](file:///home/yur4uwe/Uni/ais/src/common/engine/search-runner.ts))**
  A generic, generator-driven execution engine controlling execution states (`zero`, `running`, `paused`, `finished`), animation delay, step-by-step navigation, and instantaneous batch execution.

* **Reusable Metrics Primitives ([src/common/ui/metrics/](file:///home/yur4uwe/Uni/ais/src/common/ui/metrics/))**
  Rather than forcing rigid monolithic layouts, workspaces compose lightweight, independent UI primitives:
  * `StatusBadge`: State pill displaying current execution phase and color accents.
  * `StatCard`: Numerical and textual metric tiles with custom units and reset handling.
  * `PathDisplay<T>`: Generic sequence formatter for nodes, coordinates, or city chains.
  * `FrontierCard<T>`: Chip collection manager for FIFO queues, LIFO stacks, wave fronts, and priority queues.
  * `StepLogList`: Auto-scrolling step trace logger with container containment.
  * `formatExecutionTime`: Time formatting across microseconds, milliseconds, and seconds.

* **Workspaces Architecture ([src/workspaces/](file:///home/yur4uwe/Uni/ais/src/workspaces/))**
  Each workspace implements the `WorkspaceModule` contract (`mount`, `unmount`, `onResize`, `exportData`, `exportScreenshot`) and maintains symmetric sidebar tab controllers:
  * `ui/params-tab.ts` + `ui/params-tab.html`: Workspace setup and input configuration.
  * `ui/metrics-panel.ts` + `ui/metrics-panel.html`: Domain-specific results and frontier metrics.

---

### Project Structure

```
ais/
├── instructions/                       # Lab work assignments and specifications (Labs 1-5)
├── reports/                            # Generated laboratory report templates
├── src/
│   ├── algorithms/                     # Generator-based search algorithms
│   │   ├── graph/
│   │   │   ├── base.ts                 # BaseGraphSearch generator base class
│   │   │   ├── bfs.ts                  # Breadth-First Search implementation
│   │   │   ├── dfs.ts                  # Depth-First Search implementation
│   │   │   └── common.ts               # Algorithm options, step events, and metric types
│   │   └── maze/                       # Wave search algorithms
│   │       ├── base.ts                 # BaseMazeSearch generator base class
│   │       ├── wave-uni.ts             # Lab 3: Unidirectional Lee Wave implementation
│   │       ├── wave-bi.ts              # Lab 4: Bidirectional Lee Wave implementation
│   │       └── types.ts                # Transition operators, coordinates, step events
│   ├── common/                         # Shared utilities, engine, and UI primitives
│   │   ├── engine/
│   │   │   └── search-runner.ts        # Step generator runner & playback controller
│   │   ├── theme/
│   │   │   └── palette.ts              # Theme tokens and dynamic color definitions
│   │   └── ui/
│   │       ├── context-menu.ts         # Canvas contextual action menu
│   │       ├── playback-bar.ts         # Playback controller bar (Play, Step, Speed, Instant)
│   │       ├── playback_bar.html       # Playback bar HTML template
│   │       └── metrics/                # Composable metrics UI primitives
│   │           ├── index.ts            # Public barrel export
│   │           ├── formatters.ts       # Time formatting utilities
│   │           ├── status-badge.ts     # StatusBadge primitive
│   │           ├── stat-card.ts        # StatCard metric tile primitive
│   │           ├── path-display.ts     # Generic PathDisplay primitive
│   │           ├── frontier-card.ts    # Generic FrontierCard collection primitive
│   │           └── step-log-list.ts    # StepLogList auto-scrolling log primitive
│   ├── workspaces/                     # Domain workspaces
│   │   ├── registry.ts                 # Lazy-loaded workspace module registry
│   │   ├── graph/                      # Labs 1 & 2: Blind Graph Search (BFS & DFS)
│   │   │   ├── drawing/
│   │   │   │   ├── canvas-renderer.ts  # HTML5 Canvas graph visualizer & interaction
│   │   │   │   └── render-primitives.ts# Drawing routines for vertices, edges, arrows, badges
│   │   │   ├── ui/
│   │   │   │   ├── params-tab.html     # Graph parameters sidebar template
│   │   │   │   ├── params-tab.ts       # Graph parameters controller
│   │   │   │   ├── metrics-panel.html  # Graph metrics sidebar template
│   │   │   │   └── metrics-panel.ts    # Graph metrics controller (composes primitives)
│   │   │   ├── export-utils.ts         # CSV export utility for laboratory reporting
│   │   │   ├── graph-model.ts          # Graph topology state, adjacency, and visual states
│   │   │   ├── presets.ts              # Predefined graph topologies (Tree, Undirected, Directed)
│   │   │   ├── types.ts                # Graph-specific visual and data types
│   │   │   └── index.ts                # Graph WorkspaceModule entrypoint
│   │   ├── maze/                       # Labs 3 & 4: Unidirectional & Bidirectional Wave (Lee)
│   │   │   ├── drawing/
│   │   │   │   ├── grid-renderer.ts    # HTML5 Canvas grid visualizer & interactions
│   │   │   │   └── render-tokens.ts    # Colors for cells, wavefronts, walls, start/goal
│   │   │   ├── ui/
│   │   │   │   ├── params-tab.html     # Maze parameters sidebar template
│   │   │   │   ├── params-tab.ts       # Maze parameters controller
│   │   │   │   ├── metrics-panel.html  # Maze metrics sidebar template
│   │   │   │   └── metrics-panel.ts    # Maze metrics controller
│   │   │   ├── export-utils.ts         # CSV export for laboratory reporting
│   │   │   ├── maze-model.ts           # Grid state, cell mutations, obstacle ratio
│   │   │   ├── presets.ts              # Predefined maze orders (10x10, 12x12, 15x15, 20x20)
│   │   │   ├── types.ts                # Maze-specific types & dimensions
│   │   │   └── index.ts                # Maze WorkspaceModule entrypoint
│   │   └── roads/                      # Lab 5: Dijkstra Highway Network of Ukraine
│   ├── main.ts                         # Application bootstrapper and shell router
│   ├── style.css                       # Global Tailwind CSS styles and theme variables
│   └── types.ts                        # Global core interfaces (StepEvent, WorkspaceContext, etc.)
├── index.html                          # Single-page application shell
├── package.json                        # Scripts and dependencies
├── tsconfig.json                       # TypeScript compiler configuration
└── vite.config.ts                      # Vite build configuration and path aliases
```

---

### Getting Started

#### Prerequisites
* [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/) (v1.0+)

#### Installation & Development
```bash
# Install dependencies
bun install
# or
npm install

# Start development server
bun run dev
# or
npm run dev
```

The application will be accessible at `http://localhost:3000`.

#### Build & Typecheck
```bash
# Run type checking
bun x tsc --noEmit

# Compile production bundle
bun run build
```
