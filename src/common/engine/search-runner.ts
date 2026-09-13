import { StepEvent } from '@/types'

export interface RunnableAlgorithm<TStep> {
    step(): TStep | null
    reset(): void
    isFinished(): boolean
}

export interface SearchRunnerCallbacks<TStep = unknown> {
    onStep: (event: TStep) => void
    onFinish: (lastEvent: TStep) => void
    onReset: () => void
}

export enum RunnerStatus {
    Zero = 'zero',
    Running = 'running',
    Paused = 'paused',
    Finished = 'finished',
}

export class SearchRunner<TStep = unknown> {
    private algorithm: RunnableAlgorithm<TStep> | null = null
    private callbacks: SearchRunnerCallbacks<TStep>

    private runnerStatus: RunnerStatus = RunnerStatus.Zero
    private speedMs: number = 100
    private timerId: number | null = null
    private history: TStep[] = []
    private currentStepIndex: number = -1

    constructor(callbacks: SearchRunnerCallbacks<TStep>) {
        this.callbacks = callbacks
    }

    public setAlgorithm(algorithm: RunnableAlgorithm<TStep> | null): void {
        this.algorithm = algorithm
        this.reset()
    }

    public hasAlgorithm(): boolean {
        return this.algorithm !== null
    }

    public setSpeed(speedMs: number): void {
        this.speedMs = Math.max(10, speedMs)
    }

    public getSpeed(): number {
        return this.speedMs
    }

    public getHistory(): TStep[] {
        return this.history
    }

    public start(): void {
        if (this.algorithm === null) {
            console.warn('Algorithm is not set')
            return
        }

        if (this.runnerStatus === RunnerStatus.Finished) {
            this.reset()
        }

        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }

        this.runnerStatus = RunnerStatus.Running
        this.scheduleNextStep()
    }

    public pause(): void {
        this.runnerStatus = RunnerStatus.Paused
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
    }

    public stepForward(): TStep | null {
        if (this.algorithm === null) {
            console.warn('Algorithm is not set')
            return null
        }

        if (this.runnerStatus === RunnerStatus.Finished) {
            this.reset()
        }

        // If we are browsing past history
        if (this.currentStepIndex < this.history.length - 1) {
            this.currentStepIndex++
            const step = this.history[this.currentStepIndex]
            this.callbacks.onStep(step)
            return step
        }

        const stepEvent = this.algorithm.step()
        if (stepEvent === null) {
            this.runnerStatus = RunnerStatus.Finished
            if (this.timerId !== null) {
                clearTimeout(this.timerId)
                this.timerId = null
            }
            return null
        }

        this.history.push(stepEvent)
        this.currentStepIndex = this.history.length - 1

        this.callbacks.onStep(stepEvent)

        if (stepEvent.status === 'found' || stepEvent.status === 'not-found') {
            this.runnerStatus = RunnerStatus.Finished
            if (this.timerId !== null) {
                clearTimeout(this.timerId)
                this.timerId = null
            }
            this.callbacks.onFinish(stepEvent)
        } else if (this.runnerStatus === RunnerStatus.Zero) {
            this.runnerStatus = RunnerStatus.Paused
        }

        return stepEvent
    }

    public reset(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }
        this.runnerStatus = RunnerStatus.Zero
        this.algorithm?.reset()
        this.history = []
        this.currentStepIndex = -1
        this.callbacks.onReset()
    }

    public runInstant(): TStep | null {
        if (this.algorithm === null) {
            console.warn('Algorithm is not set')
            return null
        }

        this.reset()
        let lastEvent: TStep | null = null

        while (true) {
            const stepEvent = this.algorithm.step()
            if (stepEvent === null) {
                break
            }
            lastEvent = stepEvent
            this.history.push(stepEvent)
        }

        if (lastEvent) {
            this.runnerStatus = RunnerStatus.Finished
            this.currentStepIndex = this.history.length - 1
            this.callbacks.onStep(lastEvent)
            this.callbacks.onFinish(lastEvent)
        }

        return lastEvent
    }

    private scheduleNextStep(): void {
        if (this.runnerStatus !== RunnerStatus.Running) return

        if (this.timerId !== null) {
            clearTimeout(this.timerId)
            this.timerId = null
        }

        this.timerId = window.setTimeout(() => {
            this.timerId = null
            if (this.runnerStatus !== RunnerStatus.Running) return

            const event = this.stepForward()
            if (event && this.runnerStatus === RunnerStatus.Running) {
                this.scheduleNextStep()
            }
        }, this.speedMs)
    }

    public getStatus(): RunnerStatus {
        return this.runnerStatus
    }
}
