export interface MazeRenderTokens {
    background: string
    gridBorder: string
    cellPassable: string
    cellWall: string
    cellWallBorder: string
    startFill: string
    startStroke: string
    startText: string
    goalFill: string
    goalStroke: string
    goalText: string
    waveForwardFill: string
    waveForwardText: string
    waveBackwardFill: string
    waveBackwardText: string
    meetingFill: string
    meetingStroke: string
    meetingText: string
    pathFill: string
    pathStroke: string
    pathLine: string
    currentStroke: string
    frontierStroke: string
    hoverCell: string
}

export const DEFAULT_MAZE_TOKENS: MazeRenderTokens = {
    background: '#090d16',
    gridBorder: 'rgba(255, 255, 255, 0.07)',
    cellPassable: 'rgba(255, 255, 255, 0.02)',
    cellWall: '#1e2638',
    cellWallBorder: '#2e384d',
    startFill: 'rgba(16, 185, 129, 0.25)',
    startStroke: '#10b981',
    startText: '#34d399',
    goalFill: 'rgba(239, 68, 68, 0.25)',
    goalStroke: '#ef4444',
    goalText: '#f87171',
    waveForwardFill: 'rgba(56, 189, 248, 0.18)',
    waveForwardText: '#7dd3fc',
    waveBackwardFill: 'rgba(168, 85, 247, 0.18)',
    waveBackwardText: '#c084fc',
    meetingFill: 'rgba(245, 158, 11, 0.35)',
    meetingStroke: '#f59e0b',
    meetingText: '#fbbf24',
    pathFill: 'rgba(245, 158, 11, 0.22)',
    pathStroke: '#fbbf24',
    pathLine: '#f59e0b',
    currentStroke: '#ffffff',
    frontierStroke: '#38bdf8',
    hoverCell: 'rgba(255, 255, 255, 0.08)',
}
