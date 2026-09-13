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

export interface WorkspaceModule {
    id: string
    mount: (container: HTMLElement) => Promise<void> | void
    unmount: () => void
    exportData?: () => { filename: string; content: string; mimeType: string }
    exportScreenshot?: () => HTMLCanvasElement | null
}
