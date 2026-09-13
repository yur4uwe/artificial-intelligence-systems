export type StepStatus = 'idle' | 'running' | 'found' | 'not-found'

export interface StepEvent {
    stepIndex: number
    actionDescription: string
    status: StepStatus
}

export interface WorkspaceManifest {
    id: string
    title: string
    shortTitle: string
    description: string
    loader: () => Promise<WorkspaceModule>
}

export interface WorkspaceContext {
    canvas: HTMLCanvasElement
    canvasContainer: HTMLElement
    playbackContainer: HTMLElement
    paramsContainer: HTMLElement
    metricsContainer: HTMLElement
    sidebar: HTMLElement
    switchSidebarTab: (tab: 'params' | 'metrics') => void
    setSidebarVisible: (visible: boolean) => void
}

export interface WorkspaceModule {
    id: string
    mount: (context: WorkspaceContext) => Promise<void> | void
    unmount: () => void
    onResize?: () => void
    exportData?: () => { filename: string; content: string; mimeType: string }
    exportScreenshot?: () => HTMLCanvasElement | null
}
