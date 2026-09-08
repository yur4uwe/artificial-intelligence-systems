import { LabMetrics, StepEvent } from '@/types';

export interface SearchRunnerCallbacks {
    onStep: (event: StepEvent) => void;
    onFinish: (lastEvent: StepEvent, metrics?: LabMetrics | null) => void;
    onReset: () => void;
}

export enum RunnerStatus {
    Zero = 'zero',
    Running = 'running',
    Paused = 'paused',
    Finished = 'finished',
}

export class SearchRunner {
    private generatorFactory: () => Generator<StepEvent, LabMetrics, unknown>;
    private generator: Generator<StepEvent, LabMetrics, unknown> | null = null;
    private callbacks: SearchRunnerCallbacks;

    private runnerStatus: RunnerStatus = RunnerStatus.Zero;
    private speedMs: number = 250;
    private timerId: number | null = null;
    private history: StepEvent[] = [];
    private currentStepIndex: number = -1;

    constructor(
        generatorFactory: () => Generator<StepEvent, LabMetrics, unknown>,
        callbacks: SearchRunnerCallbacks
    ) {
        this.generatorFactory = generatorFactory;
        this.callbacks = callbacks;
    }

    public setGeneratorFactory(factory: () => Generator<StepEvent, LabMetrics, unknown>): void {
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
        if (this.runnerStatus === RunnerStatus.Finished) {
            this.reset();
        }

        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        if (!this.generator) {
            this.generator = this.generatorFactory();
            this.history = [];
            this.currentStepIndex = -1;
        }

        this.runnerStatus = RunnerStatus.Running;
        this.scheduleNextStep();
    }

    public pause(): void {
        this.runnerStatus = RunnerStatus.Paused;
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    public stepForward(): StepEvent | null {
        if (this.runnerStatus === RunnerStatus.Finished) {
            this.reset();
        }

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
            this.runnerStatus = RunnerStatus.Finished;
            if (this.timerId !== null) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            return null;
        }

        const event = next.value;
        this.history.push(event);
        this.currentStepIndex = this.history.length - 1;

        this.callbacks.onStep(event);

        if (event.status === 'found' || event.status === 'not-found') {
            this.runnerStatus = RunnerStatus.Finished;
            if (this.timerId !== null) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            const returnResult = this.generator.next();
            const metrics: LabMetrics | null = returnResult.done ? (returnResult.value as LabMetrics) : null;
            this.callbacks.onFinish(event, metrics);
        } else if (this.runnerStatus === RunnerStatus.Zero) {
            this.runnerStatus = RunnerStatus.Paused;
        }

        return event;
    }

    public reset(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.runnerStatus = RunnerStatus.Zero;
        this.generator = null;
        this.history = [];
        this.currentStepIndex = -1;
        this.callbacks.onReset();
    }

    public runInstant(): StepEvent | null {
        this.reset();
        this.generator = this.generatorFactory();
        let lastEvent: StepEvent | null = null;
        let metrics: LabMetrics | null = null;

        while (true) {
            const next = this.generator.next();
            if (next.done) {
                metrics = next.value as LabMetrics;
                break;
            }
            lastEvent = next.value;
            this.history.push(lastEvent);
        }

        if (lastEvent) {
            this.runnerStatus = RunnerStatus.Finished;
            this.currentStepIndex = this.history.length - 1;
            this.callbacks.onStep(lastEvent);
            this.callbacks.onFinish(lastEvent, metrics);
        }

        return lastEvent;
    }

    private scheduleNextStep(): void {
        if (this.runnerStatus !== RunnerStatus.Running) return;

        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        this.timerId = window.setTimeout(() => {
            this.timerId = null;
            if (this.runnerStatus !== RunnerStatus.Running) return;

            const event = this.stepForward();
            if (event && this.runnerStatus === RunnerStatus.Running) {
                this.scheduleNextStep();
            }
        }, this.speedMs);
    }

    public getStatus(): RunnerStatus {
        return this.runnerStatus;
    }
}
