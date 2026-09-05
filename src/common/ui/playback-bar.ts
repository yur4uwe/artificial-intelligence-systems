import { SearchRunner } from '../engine/search-runner';

export interface PlaybackBarOptions {
  container: HTMLElement;
  runner: SearchRunner;
  onStateChange?: () => void;
}

export class PlaybackBar {
  private container: HTMLElement;
  private runner: SearchRunner;
  private onStateChange?: () => void;

  private btnPlay!: HTMLButtonElement;
  private btnStep!: HTMLButtonElement;
  private btnPause!: HTMLButtonElement;
  private btnInstant!: HTMLButtonElement;
  private btnReset!: HTMLButtonElement;
  private speedInput!: HTMLInputElement;
  private speedLabel!: HTMLSpanElement;

  constructor(options: PlaybackBarOptions) {
    this.container = options.container;
    this.runner = options.runner;
    this.onStateChange = options.onStateChange;

    this.render();
    this.attachEvents();
    this.updateButtons();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg backdrop-blur">
        <!-- Playback Buttons -->
        <div class="flex items-center gap-1.5">
          <button id="pb-btn-play" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition active:scale-95">
            <span>▶</span>
            <span>Запуск</span>
          </button>
          
          <button id="pb-btn-pause" class="hidden items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25 transition active:scale-95">
            <span>⏸</span>
            <span>Пауза</span>
          </button>

          <button id="pb-btn-step" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95">
            <span>⏭</span>
            <span>Крок</span>
          </button>

          <button id="pb-btn-instant" title="Виконати пошук миттєво для отримання метрик" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95">
            <span>⚡</span>
            <span>Миттєво</span>
          </button>

          <button id="pb-btn-reset" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 transition active:scale-95">
            <span>↺</span>
            <span>Скинути</span>
          </button>
        </div>

        <!-- Speed Slider -->
        <div class="flex items-center gap-2.5 min-w-[200px]">
          <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Швидкість:</span>
          <input 
            type="range" 
            id="pb-speed-slider" 
            min="10" 
            max="1000" 
            step="10" 
            value="${this.runner.getSpeed()}" 
            class="flex-1 cursor-pointer"
          >
          <span id="pb-speed-val" class="text-xs font-mono font-semibold text-blue-400 w-12 text-right">
            ${this.runner.getSpeed()}ms
          </span>
        </div>
      </div>
    `;

    this.btnPlay = this.container.querySelector('#pb-btn-play')!;
    this.btnPause = this.container.querySelector('#pb-btn-pause')!;
    this.btnStep = this.container.querySelector('#pb-btn-step')!;
    this.btnInstant = this.container.querySelector('#pb-btn-instant')!;
    this.btnReset = this.container.querySelector('#pb-btn-reset')!;
    this.speedInput = this.container.querySelector('#pb-speed-slider')!;
    this.speedLabel = this.container.querySelector('#pb-speed-val')!;
  }

  private attachEvents(): void {
    this.btnPlay.addEventListener('click', () => {
      this.runner.start();
      this.updateButtons();
      this.onStateChange?.();
    });

    this.btnPause.addEventListener('click', () => {
      this.runner.pause();
      this.updateButtons();
      this.onStateChange?.();
    });

    this.btnStep.addEventListener('click', () => {
      this.runner.stepForward();
      this.updateButtons();
      this.onStateChange?.();
    });

    this.btnInstant.addEventListener('click', () => {
      this.runner.runInstant();
      this.updateButtons();
      this.onStateChange?.();
    });

    this.btnReset.addEventListener('click', () => {
      this.runner.reset();
      this.updateButtons();
      this.onStateChange?.();
    });

    this.speedInput.addEventListener('input', () => {
      const val = parseInt(this.speedInput.value, 10);
      this.runner.setSpeed(val);
      this.speedLabel.textContent = `${val}ms`;
    });
  }

  public updateButtons(): void {
    const status = this.runner.getStatus();

    if (status.isRunning) {
      this.btnPlay.classList.add('hidden');
      this.btnPause.classList.remove('hidden');
      this.btnPause.classList.add('flex');
    } else {
      this.btnPause.classList.add('hidden');
      this.btnPlay.classList.remove('hidden');
      this.btnPlay.classList.add('flex');
    }
  }
}
