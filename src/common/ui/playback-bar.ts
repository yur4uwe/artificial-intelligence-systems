import { RunnerStatus, SearchRunner } from '@common/engine/search-runner'
import playbackBarHtml from './playback_bar.html?raw'

export interface PlaybackBarOptions {
    container: HTMLElement
    runner: SearchRunner<any>
    onStateChange?: () => void
}

export class PlaybackBar {
    private container: HTMLElement
    private runner: SearchRunner<any>
    private onStateChange?: () => void

    private btnPlay!: HTMLButtonElement
    private btnStep!: HTMLButtonElement
    private btnPause!: HTMLButtonElement
    private btnInstant!: HTMLButtonElement
    private btnReset!: HTMLButtonElement
    private speedInput!: HTMLInputElement
    private speedLabel!: HTMLSpanElement

    constructor(options: PlaybackBarOptions) {
        this.container = options.container
        this.runner = options.runner
        this.onStateChange = options.onStateChange

        this.render()
        this.attachEvents()
        this.updateButtons()
    }

    private render(): void {
        this.container.innerHTML = playbackBarHtml

        this.btnPlay = this.container.querySelector('#pb-btn-play')!
        this.btnPause = this.container.querySelector('#pb-btn-pause')!
        this.btnStep = this.container.querySelector('#pb-btn-step')!
        this.btnInstant = this.container.querySelector('#pb-btn-instant')!
        this.btnReset = this.container.querySelector('#pb-btn-reset')!
        this.speedInput = this.container.querySelector('#pb-speed-slider')!
        this.speedLabel = this.container.querySelector('#pb-speed-val')!
    }

    private attachEvents(): void {
        this.btnPlay.addEventListener('click', () => {
            this.runner.start()
            this.updateButtons()
            this.onStateChange?.()
        })

        this.btnPause.addEventListener('click', () => {
            this.runner.pause()
            this.updateButtons()
            this.onStateChange?.()
        })

        this.btnStep.addEventListener('click', () => {
            if (this.runner.getStatus() === RunnerStatus.Running) {
                this.runner.pause()
            }
            this.runner.stepForward()
            this.updateButtons()
            this.onStateChange?.()
        })

        this.btnInstant.addEventListener('click', () => {
            this.runner.runInstant()
            this.updateButtons()
            this.onStateChange?.()
        })

        this.btnReset.addEventListener('click', () => {
            this.runner.reset()
            this.updateButtons()
            this.onStateChange?.()
        })

        this.speedInput.addEventListener('input', () => {
            const val = parseInt(this.speedInput.value, 10)
            this.runner.setSpeed(val)
            this.speedLabel.textContent = `${val}ms`
        })
    }

    public updateButtons(): void {
        const status = this.runner.getStatus()

        if (status === RunnerStatus.Running) {
            this.btnPlay.classList.add('hidden')
            this.btnPause.classList.remove('hidden')
            this.btnPause.classList.add('flex')
        } else {
            this.btnPause.classList.add('hidden')
            this.btnPlay.classList.remove('hidden')
            this.btnPlay.classList.add('flex')
        }
    }
}
