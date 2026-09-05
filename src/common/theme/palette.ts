export interface ThemePalette {
    id: string;
    name: string;
    ui: {
        bgApp: string;
        bgHeader: string;
        bgSurface: string;
        bgSurfaceElevated: string;
        borderSubtle: string;
        borderMuted: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        accentPrimary: string;
        accentPrimaryHover: string;
        accentPrimaryGlow: string;
    };
    graph: {
        background: string;
        grid: string;
        selectionOutline: string;
        tempEdgeLine: string;
        edges: {
            idle: string;
            active: string;
            traversed: string;
            path: string;
        };
        nodes: {
            idle: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                strokeHover: string;
                text: string;
            };
            start: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                badgeBg: string;
                text: string;
            };
            goal: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                badgeBg: string;
                text: string;
            };
            current: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                text: string;
            };
            inQueue: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                badgeBg: string;
                text: string;
            };
            visited: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                badgeBg: string;
                text: string;
            };
            path: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                text: string;
            };
        };
    };
}

export const CALM_MINIMAL_DARK_THEME: ThemePalette = {
    id: 'calm-dark',
    name: 'Calm Minimal Dark',
    ui: {
        bgApp: '#0b0f19',
        bgHeader: 'rgba(15, 23, 42, 0.9)',
        bgSurface: '#0f172a',
        bgSurfaceElevated: '#1e293b',
        borderSubtle: '#1e293b',
        borderMuted: '#334155',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        accentPrimary: '#3b82f6',
        accentPrimaryHover: '#2563eb',
        accentPrimaryGlow: 'rgba(59, 130, 246, 0.25)',
    },
    graph: {
        background: '#090d16',
        grid: 'rgba(51, 65, 85, 0.15)',
        selectionOutline: '#60a5fa',
        tempEdgeLine: '#3b82f6',
        edges: {
            idle: 'rgba(100, 116, 139, 0.45)',
            active: '#f59e0b',
            traversed: '#475569',
            path: '#38bdf8',
        },
        nodes: {
            idle: {
                fillGradientStart: '#1e293b',
                fillGradientEnd: '#0f172a',
                stroke: '#475569',
                strokeHover: '#64748b',
                text: '#f1f5f9',
            },
            start: {
                fillGradientStart: '#059669',
                fillGradientEnd: '#064e3b',
                stroke: '#10b981',
                glow: 'rgba(16, 185, 129, 0.3)',
                badgeBg: '#10b981',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#e11d48',
                fillGradientEnd: '#881337',
                stroke: '#f43f5e',
                glow: 'rgba(244, 63, 94, 0.3)',
                badgeBg: '#f43f5e',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#d97706',
                fillGradientEnd: '#78350f',
                stroke: '#f59e0b',
                glow: 'rgba(245, 158, 11, 0.4)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#0284c7',
                fillGradientEnd: '#0c4a6e',
                stroke: '#38bdf8',
                glow: 'rgba(56, 189, 248, 0.25)',
                badgeBg: '#0284c7',
                text: '#ffffff',
            },
            visited: {
                fillGradientStart: '#334155',
                fillGradientEnd: '#1e293b',
                stroke: '#64748b',
                badgeBg: '#475569',
                text: '#cbd5e1',
            },
            path: {
                fillGradientStart: '#0284c7',
                fillGradientEnd: '#0369a1',
                stroke: '#38bdf8',
                glow: 'rgba(56, 189, 248, 0.45)',
                text: '#ffffff',
            },
        },
    },
};

// Current Active Theme instance
let currentTheme: ThemePalette = CALM_MINIMAL_DARK_THEME;
type ThemeListener = (theme: ThemePalette) => void;
const themeListeners: ThemeListener[] = [];

/**
 * Get current active theme palette
 */
export function getActiveTheme(): ThemePalette {
    return currentTheme;
}

/**
 * Register a listener to be notified whenever the theme changes (e.g. CanvasRenderer)
 */
export function onThemeChange(listener: ThemeListener): () => void {
    themeListeners.push(listener);
    return () => {
        const idx = themeListeners.indexOf(listener);
        if (idx !== -1) themeListeners.splice(idx, 1);
    };
}

/**
 * Set active theme and synchronize CSS variables
 */
export function setActiveTheme(theme: ThemePalette): void {
    currentTheme = theme;
    applyThemeToCss(theme);
    themeListeners.forEach(listener => listener(theme));
}

/**
 * Synchronize theme tokens with CSS Custom Properties
 */
export function applyThemeToCss(theme: ThemePalette = currentTheme): void {
    const root = document.documentElement;

    // UI Tokens
    root.style.setProperty('--color-bg-app', theme.ui.bgApp);
    root.style.setProperty('--color-bg-header', theme.ui.bgHeader);
    root.style.setProperty('--color-bg-surface', theme.ui.bgSurface);
    root.style.setProperty('--color-bg-elevated', theme.ui.bgSurfaceElevated);
    root.style.setProperty('--color-border-subtle', theme.ui.borderSubtle);
    root.style.setProperty('--color-border-muted', theme.ui.borderMuted);
    root.style.setProperty('--color-text-primary', theme.ui.textPrimary);
    root.style.setProperty('--color-text-secondary', theme.ui.textSecondary);
    root.style.setProperty('--color-text-muted', theme.ui.textMuted);
    root.style.setProperty('--color-accent-primary', theme.ui.accentPrimary);
    root.style.setProperty('--color-accent-primary-hover', theme.ui.accentPrimaryHover);
    root.style.setProperty('--color-accent-primary-glow', theme.ui.accentPrimaryGlow);

    // Semantic Graph States for DOM badges / chips
    root.style.setProperty('--color-node-start', theme.graph.nodes.start.stroke);
    root.style.setProperty('--color-node-goal', theme.graph.nodes.goal.stroke);
    root.style.setProperty('--color-node-current', theme.graph.nodes.current.stroke);
    root.style.setProperty('--color-node-queue', theme.graph.nodes.inQueue.stroke);
    root.style.setProperty('--color-node-visited', theme.graph.nodes.visited.stroke);
    root.style.setProperty('--color-node-path', theme.graph.nodes.path.stroke);
}
