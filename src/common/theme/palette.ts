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
        bgHeader: 'rgba(15, 23, 42, 0.95)',
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
        grid: 'rgba(51, 65, 85, 0.18)',
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
                glow: 'rgba(16, 185, 129, 0.35)',
                badgeBg: '#10b981',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#e11d48',
                fillGradientEnd: '#881337',
                stroke: '#f43f5e',
                glow: 'rgba(244, 63, 94, 0.35)',
                badgeBg: '#f43f5e',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#d97706',
                fillGradientEnd: '#78350f',
                stroke: '#f59e0b',
                glow: 'rgba(245, 158, 11, 0.45)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#0284c7',
                fillGradientEnd: '#0c4a6e',
                stroke: '#38bdf8',
                glow: 'rgba(56, 189, 248, 0.3)',
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
                glow: 'rgba(56, 189, 248, 0.5)',
                text: '#ffffff',
            },
        },
    },
};

export const CYBERPUNK_NEON_THEME: ThemePalette = {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    ui: {
        bgApp: '#080512',
        bgHeader: 'rgba(18, 9, 36, 0.95)',
        bgSurface: '#120924',
        bgSurfaceElevated: '#200f3d',
        borderSubtle: '#2e1452',
        borderMuted: '#582194',
        textPrimary: '#f5f3ff',
        textSecondary: '#c084fc',
        textMuted: '#7e22ce',
        accentPrimary: '#ec4899',
        accentPrimaryHover: '#db2777',
        accentPrimaryGlow: 'rgba(236, 72, 153, 0.35)',
    },
    graph: {
        background: '#06030e',
        grid: 'rgba(147, 51, 234, 0.15)',
        selectionOutline: '#f43f5e',
        tempEdgeLine: '#ec4899',
        edges: {
            idle: 'rgba(168, 85, 247, 0.4)',
            active: '#facc15',
            traversed: '#581c87',
            path: '#06b6d4',
        },
        nodes: {
            idle: {
                fillGradientStart: '#2e1065',
                fillGradientEnd: '#170638',
                stroke: '#9333ea',
                strokeHover: '#c084fc',
                text: '#f5f3ff',
            },
            start: {
                fillGradientStart: '#059669',
                fillGradientEnd: '#064e3b',
                stroke: '#10b981',
                glow: 'rgba(16, 185, 129, 0.5)',
                badgeBg: '#10b981',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#db2777',
                fillGradientEnd: '#831843',
                stroke: '#f43f5e',
                glow: 'rgba(244, 63, 94, 0.55)',
                badgeBg: '#f43f5e',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#ca8a04',
                fillGradientEnd: '#713f12',
                stroke: '#facc15',
                glow: 'rgba(250, 204, 21, 0.6)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#0891b2',
                fillGradientEnd: '#164e63',
                stroke: '#22d3ee',
                glow: 'rgba(34, 211, 238, 0.45)',
                badgeBg: '#0891b2',
                text: '#ffffff',
            },
            visited: {
                fillGradientStart: '#3b0764',
                fillGradientEnd: '#1e0536',
                stroke: '#7e22ce',
                badgeBg: '#6b21a8',
                text: '#e9d5ff',
            },
            path: {
                fillGradientStart: '#0284c7',
                fillGradientEnd: '#075985',
                stroke: '#38bdf8',
                glow: 'rgba(56, 189, 248, 0.65)',
                text: '#ffffff',
            },
        },
    },
};

export const MIDNIGHT_OLED_THEME: ThemePalette = {
    id: 'midnight-oled',
    name: 'Midnight OLED',
    ui: {
        bgApp: '#000000',
        bgHeader: 'rgba(9, 9, 11, 0.95)',
        bgSurface: '#09090b',
        bgSurfaceElevated: '#18181b',
        borderSubtle: '#18181b',
        borderMuted: '#27272a',
        textPrimary: '#fafafa',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        accentPrimary: '#6366f1',
        accentPrimaryHover: '#4f46e5',
        accentPrimaryGlow: 'rgba(99, 102, 241, 0.3)',
    },
    graph: {
        background: '#000000',
        grid: 'rgba(39, 39, 42, 0.4)',
        selectionOutline: '#818cf8',
        tempEdgeLine: '#6366f1',
        edges: {
            idle: 'rgba(113, 113, 122, 0.4)',
            active: '#fbbf24',
            traversed: '#27272a',
            path: '#38bdf8',
        },
        nodes: {
            idle: {
                fillGradientStart: '#18181b',
                fillGradientEnd: '#09090b',
                stroke: '#3f3f46',
                strokeHover: '#71717a',
                text: '#f4f4f5',
            },
            start: {
                fillGradientStart: '#15803d',
                fillGradientEnd: '#14532d',
                stroke: '#22c55e',
                glow: 'rgba(34, 197, 94, 0.4)',
                badgeBg: '#22c55e',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#be123c',
                fillGradientEnd: '#881337',
                stroke: '#f43f5e',
                glow: 'rgba(244, 63, 94, 0.4)',
                badgeBg: '#f43f5e',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#b45309',
                fillGradientEnd: '#78350f',
                stroke: '#f59e0b',
                glow: 'rgba(245, 158, 11, 0.45)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#0369a1',
                fillGradientEnd: '#0c4a6e',
                stroke: '#38bdf8',
                glow: 'rgba(56, 189, 248, 0.35)',
                badgeBg: '#0284c7',
                text: '#ffffff',
            },
            visited: {
                fillGradientStart: '#27272a',
                fillGradientEnd: '#18181b',
                stroke: '#52525b',
                badgeBg: '#3f3f46',
                text: '#d4d4d8',
            },
            path: {
                fillGradientStart: '#4338ca',
                fillGradientEnd: '#312e81',
                stroke: '#818cf8',
                glow: 'rgba(129, 140, 248, 0.55)',
                text: '#ffffff',
            },
        },
    },
};

export const TOKYO_NIGHT_THEME: ThemePalette = {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    ui: {
        bgApp: '#1a1b26',
        bgHeader: 'rgba(36, 40, 59, 0.95)',
        bgSurface: '#24283b',
        bgSurfaceElevated: '#2f354f',
        borderSubtle: '#2f354f',
        borderMuted: '#414868',
        textPrimary: '#c0caf5',
        textSecondary: '#9aa5ce',
        textMuted: '#565f89',
        accentPrimary: '#7aa2f7',
        accentPrimaryHover: '#5d87e5',
        accentPrimaryGlow: 'rgba(122, 162, 247, 0.25)',
    },
    graph: {
        background: '#16161e',
        grid: 'rgba(65, 72, 104, 0.2)',
        selectionOutline: '#7aa2f7',
        tempEdgeLine: '#7aa2f7',
        edges: {
            idle: 'rgba(86, 95, 137, 0.5)',
            active: '#e0af68',
            traversed: '#343b58',
            path: '#7dcfff',
        },
        nodes: {
            idle: {
                fillGradientStart: '#2f354f',
                fillGradientEnd: '#1f2335',
                stroke: '#414868',
                strokeHover: '#565f89',
                text: '#c0caf5',
            },
            start: {
                fillGradientStart: '#41a6b5',
                fillGradientEnd: '#1e5f6e',
                stroke: '#73daca',
                glow: 'rgba(115, 218, 202, 0.35)',
                badgeBg: '#73daca',
                text: '#1a1b26',
            },
            goal: {
                fillGradientStart: '#c53b53',
                fillGradientEnd: '#7a1f33',
                stroke: '#f7768e',
                glow: 'rgba(247, 118, 142, 0.35)',
                badgeBg: '#f7768e',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#b07f35',
                fillGradientEnd: '#6e4b17',
                stroke: '#e0af68',
                glow: 'rgba(224, 175, 104, 0.4)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#2ac3de',
                fillGradientEnd: '#156a7d',
                stroke: '#7dcfff',
                glow: 'rgba(125, 207, 255, 0.3)',
                badgeBg: '#2ac3de',
                text: '#1a1b26',
            },
            visited: {
                fillGradientStart: '#414868',
                fillGradientEnd: '#24283b',
                stroke: '#565f89',
                badgeBg: '#414868',
                text: '#a9b1d6',
            },
            path: {
                fillGradientStart: '#5f4bb6',
                fillGradientEnd: '#3b2d7d',
                stroke: '#bb9af7',
                glow: 'rgba(187, 154, 247, 0.5)',
                text: '#ffffff',
            },
        },
    },
};

export const NORD_POLAR_THEME: ThemePalette = {
    id: 'nord-polar',
    name: 'Nord Polar Frost',
    ui: {
        bgApp: '#2e3440',
        bgHeader: 'rgba(59, 66, 82, 0.95)',
        bgSurface: '#3b4252',
        bgSurfaceElevated: '#434c5e',
        borderSubtle: '#434c5e',
        borderMuted: '#4c566a',
        textPrimary: '#eceff4',
        textSecondary: '#d8dee9',
        textMuted: '#7b88a1',
        accentPrimary: '#88c0d0',
        accentPrimaryHover: '#81a1c1',
        accentPrimaryGlow: 'rgba(136, 192, 208, 0.3)',
    },
    graph: {
        background: '#242933',
        grid: 'rgba(76, 86, 106, 0.25)',
        selectionOutline: '#88c0d0',
        tempEdgeLine: '#81a1c1',
        edges: {
            idle: 'rgba(94, 129, 172, 0.4)',
            active: '#ebcb8b',
            traversed: '#434c5e',
            path: '#88c0d0',
        },
        nodes: {
            idle: {
                fillGradientStart: '#434c5e',
                fillGradientEnd: '#3b4252',
                stroke: '#4c566a',
                strokeHover: '#7b88a1',
                text: '#eceff4',
            },
            start: {
                fillGradientStart: '#8fbcbb',
                fillGradientEnd: '#4c7a79',
                stroke: '#a3be8c',
                glow: 'rgba(163, 190, 140, 0.35)',
                badgeBg: '#a3be8c',
                text: '#2e3440',
            },
            goal: {
                fillGradientStart: '#bf616a',
                fillGradientEnd: '#78353d',
                stroke: '#d08770',
                glow: 'rgba(191, 97, 106, 0.35)',
                badgeBg: '#bf616a',
                text: '#eceff4',
            },
            current: {
                fillGradientStart: '#d08770',
                fillGradientEnd: '#8c4e3a',
                stroke: '#ebcb8b',
                glow: 'rgba(235, 203, 139, 0.45)',
                text: '#2e3440',
            },
            inQueue: {
                fillGradientStart: '#5e81ac',
                fillGradientEnd: '#395373',
                stroke: '#81a1c1',
                glow: 'rgba(129, 161, 193, 0.35)',
                badgeBg: '#5e81ac',
                text: '#eceff4',
            },
            visited: {
                fillGradientStart: '#4c566a',
                fillGradientEnd: '#3b4252',
                stroke: '#5e6982',
                badgeBg: '#4c566a',
                text: '#d8dee9',
            },
            path: {
                fillGradientStart: '#88c0d0',
                fillGradientEnd: '#508999',
                stroke: '#8fbcbb',
                glow: 'rgba(136, 192, 208, 0.55)',
                text: '#2e3440',
            },
        },
    },
};

export const SOLARIZED_DARK_THEME: ThemePalette = {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    ui: {
        bgApp: '#002b36',
        bgHeader: 'rgba(7, 54, 66, 0.95)',
        bgSurface: '#073642',
        bgSurfaceElevated: '#0d4857',
        borderSubtle: '#0e4f5f',
        borderMuted: '#586e75',
        textPrimary: '#fdf6e3',
        textSecondary: '#93a1a1',
        textMuted: '#657b83',
        accentPrimary: '#268bd2',
        accentPrimaryHover: '#1c72ae',
        accentPrimaryGlow: 'rgba(38, 139, 210, 0.3)',
    },
    graph: {
        background: '#00212b',
        grid: 'rgba(88, 110, 117, 0.18)',
        selectionOutline: '#2aa198',
        tempEdgeLine: '#268bd2',
        edges: {
            idle: 'rgba(101, 123, 131, 0.45)',
            active: '#b58900',
            traversed: '#073642',
            path: '#2aa198',
        },
        nodes: {
            idle: {
                fillGradientStart: '#0e4f5f',
                fillGradientEnd: '#073642',
                stroke: '#586e75',
                strokeHover: '#839496',
                text: '#eee8d5',
            },
            start: {
                fillGradientStart: '#5b6900',
                fillGradientEnd: '#333b00',
                stroke: '#859900',
                glow: 'rgba(133, 153, 0, 0.4)',
                badgeBg: '#859900',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#a82320',
                fillGradientEnd: '#661210',
                stroke: '#dc322f',
                glow: 'rgba(220, 50, 47, 0.4)',
                badgeBg: '#dc322f',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#826200',
                fillGradientEnd: '#4c3900',
                stroke: '#b58900',
                glow: 'rgba(181, 137, 0, 0.45)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#1a6f69',
                fillGradientEnd: '#0d403c',
                stroke: '#2aa198',
                glow: 'rgba(42, 161, 152, 0.35)',
                badgeBg: '#2aa198',
                text: '#ffffff',
            },
            visited: {
                fillGradientStart: '#0d4857',
                fillGradientEnd: '#073642',
                stroke: '#586e75',
                badgeBg: '#073642',
                text: '#93a1a1',
            },
            path: {
                fillGradientStart: '#4a4ea8',
                fillGradientEnd: '#292b69',
                stroke: '#6c71c4',
                glow: 'rgba(108, 113, 196, 0.55)',
                text: '#ffffff',
            },
        },
    },
};

export const LIGHT_STUDIO_THEME: ThemePalette = {
    id: 'light-studio',
    name: 'Light Studio Pro',
    ui: {
        bgApp: '#f8fafc',
        bgHeader: 'rgba(255, 255, 255, 0.95)',
        bgSurface: '#ffffff',
        bgSurfaceElevated: '#f1f5f9',
        borderSubtle: '#e2e8f0',
        borderMuted: '#cbd5e1',
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        accentPrimary: '#2563eb',
        accentPrimaryHover: '#1d4ed8',
        accentPrimaryGlow: 'rgba(37, 99, 235, 0.2)',
    },
    graph: {
        background: '#f8fafc',
        grid: 'rgba(203, 213, 225, 0.5)',
        selectionOutline: '#3b82f6',
        tempEdgeLine: '#2563eb',
        edges: {
            idle: 'rgba(148, 163, 184, 0.65)',
            active: '#d97706',
            traversed: '#cbd5e1',
            path: '#0284c7',
        },
        nodes: {
            idle: {
                fillGradientStart: '#ffffff',
                fillGradientEnd: '#f1f5f9',
                stroke: '#94a3b8',
                strokeHover: '#64748b',
                text: '#0f172a',
            },
            start: {
                fillGradientStart: '#10b981',
                fillGradientEnd: '#059669',
                stroke: '#047857',
                glow: 'rgba(16, 185, 129, 0.3)',
                badgeBg: '#059669',
                text: '#ffffff',
            },
            goal: {
                fillGradientStart: '#f43f5e',
                fillGradientEnd: '#e11d48',
                stroke: '#be123c',
                glow: 'rgba(244, 63, 94, 0.3)',
                badgeBg: '#e11d48',
                text: '#ffffff',
            },
            current: {
                fillGradientStart: '#f59e0b',
                fillGradientEnd: '#d97706',
                stroke: '#b45309',
                glow: 'rgba(245, 158, 11, 0.35)',
                text: '#ffffff',
            },
            inQueue: {
                fillGradientStart: '#0284c7',
                fillGradientEnd: '#0369a1',
                stroke: '#075985',
                glow: 'rgba(2, 132, 199, 0.25)',
                badgeBg: '#0284c7',
                text: '#ffffff',
            },
            visited: {
                fillGradientStart: '#e2e8f0',
                fillGradientEnd: '#cbd5e1',
                stroke: '#94a3b8',
                badgeBg: '#94a3b8',
                text: '#334155',
            },
            path: {
                fillGradientStart: '#38bdf8',
                fillGradientEnd: '#0284c7',
                stroke: '#0369a1',
                glow: 'rgba(56, 189, 248, 0.45)',
                text: '#ffffff',
            },
        },
    },
};

export const PRESET_THEMES: ThemePalette[] = [
    CALM_MINIMAL_DARK_THEME,
    CYBERPUNK_NEON_THEME,
    MIDNIGHT_OLED_THEME,
    TOKYO_NIGHT_THEME,
    NORD_POLAR_THEME,
    SOLARIZED_DARK_THEME,
    LIGHT_STUDIO_THEME,
];

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
}
