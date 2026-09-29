# Handoff: Lab 5 Dijkstra Ukrainian Road Network Implementation

Date: 2026-09-29
Project: AIS Labs (Methods and Systems of AI)
Module: Lab 5 - Dijkstra Algorithm on Ukraine Highway Map
Target Workspace: `src/workspaces/roads/` and `src/algorithms/map/`

---

## 1. Current State Summary

The foundational setup for Lab 5 is complete:
* The workspace is registered as `3-roads-workspace` in `src/workspaces/registry.ts` and appears in navigation as "Автошляхи (Lab 5)".
* The high-resolution map underlay image (`src/workspaces/roads/assets/map-of-ukraine.webp`, 1600x1114) is integrated and rendered via `RoadsCanvasRenderer`.
* Image scaling is hardcoded to 55% (`img.width = 880`, `img.height = 613`) with 85% opacity (`mapOpacity = 0.85`), providing crisp rendering while keeping city markers and highway lines in proper visual proportion.
* All 29 Ukrainian cities and all 50 highway segments with kilometer distances from Table 1 of `instructions/lab-work-5.md` are encoded in `src/workspaces/roads/presets.ts`.
* City coordinates were calibrated by the user and are permanently stored in `INITIAL_CITY_COORDINATES` in `presets.ts`.
* All temporary calibration UI controls, sliders, and listeners have been removed.
* Global rule strictly enforced: NO EMOJIS AT ALL (no unicode emojis in code, templates, or UI strings).
* Production build passes without error (`bun run build`).

---

## 2. Important Context & Architectural Decisions

An architectural review (LLM Council) was conducted with the following conclusions:

1. **Do NOT extend or rewrite `BaseGraphSearch`:**
   * `BaseGraphSearch` (`src/algorithms/graph/base.ts`) powers Labs 1 & 2 (unweighted BFS and DFS).
   * It assumes insertion-time visited marking (`visited.add` when enqueued) and immediate goal detection upon neighbor expansion.
   * Dijkstra is uniform-cost search: it requires settlement upon extraction, continuous edge relaxation ($d[v] \leftarrow d[u] + w$), and a priority queue.
   * Modifying `BaseGraphSearch` introduces regressions into earlier labs and reports.
   * Dijkstra must be implemented as a dedicated search class in `src/algorithms/map/`.

2. **Algorithm Contract:**
   * The algorithm must implement `RunnableAlgorithm<DijkstraStepEvent>` so it seamlessly connects to the existing `SearchRunner` and `PlaybackBar` controls.

3. **Termination Semantics:**
   * Lab 5 requires point-to-point routing between specified start and target cities ("відправна і цільова точки маршруту").
   * The search must terminate early as soon as the target city is extracted (settled) from the priority queue.
   * Upon reaching the target, backtrack via parent pointers to build the shortest path and compute the total distance in kilometers.

4. **Style Constraint:**
   * The user explicitly requested: DO NOT USE EMOJIS AT ALL. This applies to UI labels, tooltips, logs, and documentation.

---

## 3. Immediate Next Steps

1. **Implement `DijkstraAlgorithm` in `src/algorithms/map/dijkstra.ts` (or `base.ts`):**
   * Define `DijkstraStepEvent` in `src/algorithms/map/types.ts`:
     * `currentNodeId: number | null`
     * `settledNodes: number[]`
     * `frontier: Array<{ nodeId: number; dist: number }>`
     * `distances: Record<number, number>`
     * `activeEdge?: { from: number; to: number; weight: number }`
     * `foundPath?: number[]`
     * `totalDistanceKm?: number`
     * `actionDescription: string`
   * Implement generator `*generateSteps()`:
     * Initialize `dist: Map<number, number>` with `Infinity`, `dist.set(startId, 0)`.
     * Maintain min-priority queue (or keyed array) tracking `(nodeId, distance)`.
     * While priority queue is not empty:
       * Extract node `u` with minimum distance.
       * If already settled, skip. Otherwise mark settled.
       * If `u === goalId`, reconstruct path, compute total km, yield final step, and return.
       * For each neighbor `v` of `u`:
         * Get highway distance `w` from `model.getRoadDistance(u, v)`.
         * If `dist[u] + w < dist[v]`: update `dist[v]`, update parent map, push/update in priority queue.
         * Yield edge relaxation step.
   * Implement synchronous `runPure()` and cached `benchmark()` methods for performance metrics.

2. **Build Results & Metrics Panel in `src/workspaces/roads/ui/metrics-panel.ts`:**
   * Render total route distance in kilometers (`X км`).
   * Render ordered list of cities along the shortest route (e.g., Київ -> Житомир -> Вінниця).
   * Render tentative/final distance table for visited cities.
   * Display execution time and number of relaxation cycles.

3. **Wire up `SearchRunner` in `RoadsWorkspace` (`src/workspaces/roads/index.ts`):**
   * Instantiate `SearchRunner<DijkstraStepEvent>`.
   * Instantiate `PlaybackBar` attached to `context.playbackContainer`.
   * On step: update node and edge visual states in `MapModel` (`state = 'path' | 'active' | 'visited'`) and render.
   * On finish: display summary metrics in the sidebar metrics panel.

---

## 4. Critical Files

* `instructions/lab-work-5.md`: Lab requirements, Table 1 with 50 routes, and theoretical questions.
* `src/workspaces/roads/presets.ts`: Complete list of 29 Ukrainian cities, 50 highways, and calibrated `INITIAL_CITY_COORDINATES`.
* `src/workspaces/roads/model.ts`: `MapModel` extending `GraphModel`, with `getRoadDistance` helper.
* `src/workspaces/roads/drawing/roads-renderer.ts`: Canvas renderer displaying map underlay, road distance badges, and city nodes.
* `src/workspaces/roads/index.ts`: Workspace orchestrator implementing `WorkspaceModule`.
* `src/workspaces/roads/ui/params-tab.html`: Sidebar template for Start/Goal selection and view controls.
* `src/workspaces/roads/ui/params-tab.ts`: Controller for the parameters tab.
* `src/common/engine/search-runner.ts`: Execution runner and stepper interface (`RunnableAlgorithm<T>`).
* `src/common/ui/playback-bar.ts`: Playback control widget (play, pause, step forward/back, speed slider).

---

## 5. Potential Gotchas

* **Edge Weights:** `GraphEdge.weight` is a number representing kilometers. When exploring neighbors via `model.getNeighbors(currentId)`, always look up the edge weight via `model.getRoadDistance(currentId, neighborId)`.
* **Goal Test Timing:** Do not check goal condition when relaxing an edge. Only check goal condition when extracting the node from the priority queue.
* **Canvas Coordinate System:** World coordinates are based on the scaled image dimensions ($880 \times 613$). Do not reset image scaling or alter `INITIAL_CITY_COORDINATES` in `presets.ts`.
* **Zero Emojis:** Do not reintroduce emojis into HTML templates, button labels, context menu items, or console outputs.
