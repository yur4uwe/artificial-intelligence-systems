import { StepEvent } from '../../types';

export interface SearchRunnerCallbacks {
  onStep: (event: StepEvent) => void;
  onFinish: (lastEvent: StepEvent) => void;
  onReset: () => void;
}

export class SearchRunner {
  private generatorFactory: () => Generator<StepEvent, void, unknown>;
  private generator: Generator<StepEvent, void, unknown> | null = null;
  private callbacks: SearchRunnerCallbacks;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private isFinished: boolean = false;
  private speedMs: number = 250;
  private timerId: number | null = null;
  private history: StepEvent[] = [];
  private currentStepIndex: number = -1;

  constructor(
    generatorFactory: () => Generator<StepEvent, void, unknown>,
    callbacks: SearchRunnerCallbacks
  ) {
    this.generatorFactory = generatorFactory;
    this.callbacks = callbacks;
  }

  public setGeneratorFactory(factory: () => Generator<StepEvent, void, unknown>): void {
    this.generatorFactory = factory;
    this.reset();
  }

  public setSpeed(speedMs: number): void {
    this.speedMs = Math.max(10, speedMs);
  }

  public getSpeed(): number {
    return this.speedMs;
  }

  public getHistory(): StepEvent[] {
    return this.history;
  }

  public start(): void {
    if (this.isFinished) {
      this.reset();
    }

    if (!this.generator) {
      this.generator = this.generatorFactory();
      this.history = [];
      this.currentStepIndex = -1;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextStep();
  }

  public pause(): void {
    this.isRunning = false;
    this.isPaused = true;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public stepForward(): StepEvent | null {
    if (this.isFinished) return null;

    if (!this.generator) {
      this.generator = this.generatorFactory();
      this.history = [];
      this.currentStepIndex = -1;
    }

    // If we are browsing past history
    if (this.currentStepIndex < this.history.length - 1) {
      this.currentStepIndex++;
      const step = this.history[this.currentStepIndex];
      this.callbacks.onStep(step);
      return step;
    }

    const next = this.generator.next();
    if (next.done) {
      this.isFinished = true;
      this.isRunning = false;
      return null;
    }

    const event = next.value;
    this.history.push(event);
    this.currentStepIndex = this.history.length - 1;

    this.callbacks.onStep(event);

    if (event.status === 'found' || event.status === 'not-found') {
      this.isFinished = true;
      this.isRunning = false;
      this.callbacks.onFinish(event);
    }

    return event;
  }

  public reset(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.isFinished = false;
    this.generator = null;
    this.history = [];
    this.currentStepIndex = -1;
    this.callbacks.onReset();
  }

  public runInstant(): StepEvent | null {
    this.reset();
    this.generator = this.generatorFactory();
    let lastEvent: StepEvent | null = null;

    while (true) {
      const next = this.generator.next();
      if (next.done) break;
      lastEvent = next.value;
      this.history.push(lastEvent);
    }

    if (lastEvent) {
      this.isFinished = true;
      this.currentStepIndex = this.history.length - 1;
      this.callbacks.onStep(lastEvent);
      this.callbacks.onFinish(lastEvent);
    }

    return lastEvent;
  }

  private scheduleNextStep(): void {
    if (!this.isRunning) return;

    this.timerId = window.setTimeout(() => {
      this.timerId = null;
      const event = this.stepForward();
      if (event && !this.isFinished && this.isRunning) {
        this.scheduleNextStep();
      }
    }, this.speedMs);
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean; isFinished: boolean } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isFinished: this.isFinished,
    };
  }
}
