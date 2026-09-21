import { CALM_MINIMAL_DARK_THEME } from '@common/theme/available/calm_minimal_dark';
import { LIGHT_STUDIO_THEME } from '@common/theme/available/light_studio';

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
            secondWave: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                glow: string;
                badgeBg: string;
                text: string;
            };
            wall: {
                fillGradientStart: string;
                fillGradientEnd: string;
                stroke: string;
                strokeHover: string;
                text: string;
            };
        };
    };
}

export const PRESET_THEMES: ThemePalette[] = [
    CALM_MINIMAL_DARK_THEME,
    LIGHT_STUDIO_THEME,
];

// Current Active Theme instance
let currentTheme: ThemePalette = LIGHT_STUDIO_THEME;
type ThemeListener = (theme: ThemePalette) => void;
const themeListeners: ThemeListener[] = [];

/**
 * Get current active theme palette
 */
export function getActiveTheme(): ThemePalette {
    return currentTheme;
}

/**
 * Deep clone a theme palette
 */
export function cloneTheme(theme: ThemePalette): ThemePalette {
    return JSON.parse(JSON.stringify(theme));
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
    root.style.setProperty('--color-node-second-wave', theme.graph.nodes.secondWave.stroke);
    root.style.setProperty('--color-node-wall', theme.graph.nodes.wall.fillGradientStart);
    root.style.setProperty('--color-graph-bg', theme.graph.background);
}
