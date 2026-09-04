import { LabModule, LabMetrics, StepEvent } from '../../types';
import { GraphModel, NeighborSortingStrategy } from '../../common/graph/graph-model';
import { CanvasRenderer, CanvasInteractionMode } from '../../common/graph/canvas-renderer';
import { SearchRunner } from '../../common/engine/search-runner';
import { PlaybackBar } from '../../common/ui/playback-bar';
import { MetricsPanel } from '../../common/ui/metrics-panel';
import { Lab1UI } from './lab1-ui';
import { createTreePreset, createUndirectedPreset, createDirectedPreset } from './presets';
import { runBFS } from './bfs';
import { exportMetricsToCSV } from '../../common/graph/export-utils';

export default class BlindSearchLab implements LabModule {
  public id = '1-blind-search';

  private container!: HTMLElement;
  private model!: GraphModel;
  private renderer!: CanvasRenderer;
  private runner!: SearchRunner;
  private playbackBar!: PlaybackBar;
  private metricsPanel!: MetricsPanel;
  private labUI!: Lab1UI;

  private startId: number = 1;
  private goalId: number = 31;
  private sortingStrategy: NeighborSortingStrategy = 'ascending-id';
  private lastMetrics: LabMetrics | null = null;
  private activePreset: 'tree' | 'undirected' | 'directed' = 'tree';

  public async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.container.innerHTML = `
      <div class="flex-1 flex overflow-hidden w-full h-full">
        <!-- Canvas Area & Floating Playback Bar -->
        <div class="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          <canvas id="l1-canvas" class="w-full h-full block touch-none cursor-crosshair"></canvas>

          <!-- Floating Bottom Playback Controller -->
          <div class="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto z-20" id="l1-playback-container"></div>
        </div>

        <!-- Right Control & Metrics Sidebar -->
        <aside class="w-96 border-l border-slate-800 bg-slate-950 flex flex-col h-full z-10 shrink-0">
          <!-- Sidebar Header / Tabs -->
          <div class="flex border-b border-slate-800 bg-slate-900/50 p-1 shrink-0 text-xs">
            <button id="tab-btn-params" class="flex-1 py-1.5 rounded-lg font-medium bg-slate-800 text-slate-100 text-center transition">
              Параметри
            </button>
            <button id="tab-btn-metrics" class="flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 text-center transition">
              Результати
            </button>
          </div>

          <!-- Sidebar Panels -->
          <div class="flex-1 overflow-y-auto p-3">
            <div id="l1-params-panel" class="flex flex-col gap-3"></div>
            <div id="l1-metrics-panel" class="hidden flex flex-col gap-3"></div>
          </div>
        </aside>
      </div>
    `;

    // 1. Initialize Graph Model
    this.model = new GraphModel(createTreePreset());

    // 2. Initialize Canvas Renderer
    const canvasEl = this.container.querySelector('#l1-canvas') as HTMLCanvasElement;
    this.renderer = new CanvasRenderer(canvasEl, this.model, {
      onNodeClick: (nodeId) => this.handleCanvasNodeClick(nodeId),
      onCanvasChange: () => this.handleCanvasChange(),
      onSelectionChange: () => {},
    });

    // 3. Initialize Search Runner Engine
    this.runner = new SearchRunner(
      () => runBFS({
        model: this.model,
        startId: this.startId,
        goalId: this.goalId,
        sortingStrategy: this.sortingStrategy,
      }),
      {
        onStep: (event) => this.handleStep(event),
        onFinish: (event) => this.handleFinish(event),
        onReset: () => this.handleReset(),
      }
    );

    // 4. Initialize Playback Bar
    const playbackContainer = this.container.querySelector('#l1-playback-container') as HTMLElement;
    this.playbackBar = new PlaybackBar({
      container: playbackContainer,
      runner: this.runner,
      onStateChange: () => this.renderer.requestRender(),
    });

    // 5. Initialize Sidebar Panels
    const paramsContainer = this.container.querySelector('#l1-params-panel') as HTMLElement;
    const metricsContainer = this.container.querySelector('#l1-metrics-panel') as HTMLElement;

    this.metricsPanel = new MetricsPanel(metricsContainer);

    this.labUI = new Lab1UI({
      container: paramsContainer,
      onPresetChange: (key) => this.loadPreset(key),
      onStartChange: (id) => this.setStartNode(id),
      onGoalChange: (id) => this.setGoalNode(id),
      onSwapStartGoal: () => this.swapStartAndGoal(),
      onSortingChange: (strat) => {
        this.sortingStrategy = strat;
        this.runner.reset();
      },
      onInteractionModeChange: (mode) => {
        this.renderer.setMode(mode);
      },
      onFitView: () => this.renderer.fitToScreen(),
      onResetView: () => this.renderer.resetView(),
    });

    this.initSidebarTabs();
    this.syncUIState();
    
    // Auto-fit initial graph view after a brief layout delay
    setTimeout(() => {
      this.renderer.resize();
      this.renderer.fitToScreen();
    }, 50);
  }

  public unmount(): void {
    this.runner.reset();
    this.renderer.destroy();
  }

  public exportData(): { filename: string; content: string; mimeType: string } {
    const history = this.runner.getHistory();
    const metrics = this.lastMetrics || {
      foundPath: null,
      pathLength: 0,
      openedVerticesCount: 0,
      cyclesCount: 0,
      executionTimeMs: 0,
      visitedOrder: [],
      isSuccess: false,
      statusText: 'Пошук не виконувався',
    };

    const csvContent = exportMetricsToCSV(metrics, history, 'Лабораторна 1: Пошук в ширину (BFS)');
    return {
      filename: `lab1-bfs-results-${Date.now()}.csv`,
      content: csvContent,
      mimeType: 'text/csv;charset=utf-8;',
    };
  }

  public exportScreenshot(): HTMLCanvasElement {
    return this.renderer.getCanvasElement();
  }

  // --- Handlers & Internal Logic ---

  private loadPreset(key: 'tree' | 'undirected' | 'directed'): void {
    this.activePreset = key;
    this.runner.reset();

    let data;
    switch (key) {
      case 'tree':
        data = createTreePreset();
        break;
      case 'undirected':
        data = createUndirectedPreset();
        break;
      case 'directed':
        data = createDirectedPreset();
        break;
    }

    this.model.loadData(data);
    this.renderer.setModel(this.model);
    this.startId = 1;
    this.goalId = 31;
    this.syncUIState();
    this.renderer.fitToScreen();
  }

  private handleCanvasNodeClick(nodeId: number): void {
    const mode = this.renderer.getMode();
    if (mode === 'set-start') {
      this.setStartNode(nodeId);
      this.renderer.setMode('select');
      this.labUI.setInteractionMode('select');
    } else if (mode === 'set-goal') {
      this.setGoalNode(nodeId);
      this.renderer.setMode('select');
      this.labUI.setInteractionMode('select');
    }
  }

  private handleCanvasChange(): void {
    this.runner.reset();
    this.syncUIState();
  }

  private setStartNode(id: number): void {
    this.startId = id;
    this.labUI.setStart(id);
    this.runner.reset();
    this.updateStartGoalColors();
  }

  private setGoalNode(id: number): void {
    this.goalId = id;
    this.labUI.setGoal(id);
    this.runner.reset();
    this.updateStartGoalColors();
  }

  private swapStartAndGoal(): void {
    const tmp = this.startId;
    this.startId = this.goalId;
    this.goalId = tmp;
    this.labUI.setStart(this.startId);
    this.labUI.setGoal(this.goalId);
    this.runner.reset();
    this.updateStartGoalColors();
  }

  private updateStartGoalColors(): void {
    this.model.resetVisualStates({ startId: this.startId, goalId: this.goalId });
    this.renderer.requestRender();
  }

  private syncUIState(): void {
    const nodeIds = this.model.getNodes().map(n => n.id);
    if (!nodeIds.includes(this.startId) && nodeIds.length > 0) this.startId = nodeIds[0];
    if (!nodeIds.includes(this.goalId) && nodeIds.length > 0) this.goalId = nodeIds[nodeIds.length - 1];

    this.labUI.updateNodeSelects(nodeIds, this.startId, this.goalId);
    this.updateStartGoalColors();
  }

  private handleStep(event: StepEvent): void {
    // 1. Reset node/edge states but keep Start/Goal markers
    this.model.resetVisualStates({ startId: this.startId, goalId: this.goalId });

    // 2. Mark visited nodes
    event.visited.forEach((id, index) => {
      if (id !== this.startId && id !== this.goalId) {
        this.model.setNodeState(id, 'visited', index + 1);
      }
    });

    // 3. Mark nodes currently in queue
    event.queue.forEach(id => {
      if (id !== this.startId && id !== this.goalId) {
        this.model.setNodeState(id, 'in-queue');
      }
    });

    // 4. Mark currently expanded node
    if (event.currentNodeId !== null) {
      if (event.currentNodeId !== this.startId && event.currentNodeId !== this.goalId) {
        this.model.setNodeState(event.currentNodeId, 'current');
      }
    }

    // 5. Mark active traversal edge
    if (event.activeEdge) {
      this.model.setEdgeState(event.activeEdge.from, event.activeEdge.to, 'active');
    }

    // 6. If found path, highlight it
    if (event.foundPath) {
      for (let i = 0; i < event.foundPath.length - 1; i++) {
        const u = event.foundPath[i];
        const v = event.foundPath[i + 1];
        this.model.setEdgeState(u, v, 'path');
      }
      event.foundPath.forEach(id => {
        if (id !== this.startId && id !== this.goalId) {
          this.model.setNodeState(id, 'path');
        }
      });
    }

    this.renderer.requestRender();
    this.metricsPanel.updateStep(event);
  }

  private handleFinish(event: StepEvent): void {
    this.playbackBar.updateButtons();
    // Auto switch to Results tab on finish
    this.switchSidebarTab('metrics');
  }

  private handleReset(): void {
    this.lastMetrics = null;
    this.model.resetVisualStates({ startId: this.startId, goalId: this.goalId });
    this.renderer.requestRender();
    this.metricsPanel.reset();
    this.playbackBar.updateButtons();
  }

  private initSidebarTabs(): void {
    const btnParams = this.container.querySelector('#tab-btn-params')!;
    const btnMetrics = this.container.querySelector('#tab-btn-metrics')!;

    btnParams.addEventListener('click', () => this.switchSidebarTab('params'));
    btnMetrics.addEventListener('click', () => this.switchSidebarTab('metrics'));
  }

  private switchSidebarTab(tab: 'params' | 'metrics'): void {
    const btnParams = this.container.querySelector('#tab-btn-params')!;
    const btnMetrics = this.container.querySelector('#tab-btn-metrics')!;
    const panelParams = this.container.querySelector('#l1-params-panel')!;
    const panelMetrics = this.container.querySelector('#l1-metrics-panel')!;

    if (tab === 'params') {
      btnParams.className = 'flex-1 py-1.5 rounded-lg font-medium bg-slate-800 text-slate-100 text-center transition shadow-sm';
      btnMetrics.className = 'flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 text-center transition';
      panelParams.classList.remove('hidden');
      panelMetrics.classList.add('hidden');
    } else {
      btnMetrics.className = 'flex-1 py-1.5 rounded-lg font-medium bg-slate-800 text-slate-100 text-center transition shadow-sm';
      btnParams.className = 'flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 text-center transition';
      panelMetrics.classList.remove('hidden');
      panelParams.classList.add('hidden');
    }
  }
}
