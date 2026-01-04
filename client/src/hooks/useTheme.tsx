/**
 * useTheme hook - 主题管理系统
 * 支持暗黑/光明/跟随系统三种模式
 */

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// 主题类型
export type Theme = 'dark' | 'light' | 'system';

// 实际应用的主题（不含 system）
export type AppliedTheme = 'dark' | 'light';

// 主题配色方案
export interface ThemeColors {
  // 背景色
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    overlay: string;
  };
  // 文字颜色
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  // 边框颜色
  border: {
    default: string;
    subtle: string;
    strong: string;
  };
  // 游戏专用色
  game: {
    night: string;
    day: string;
    blood: string;
    wolf: string;
    villager: string;
    seer: string;
    witch: string;
    guard: string;
    hunter: string;
  };
  // 状态颜色
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

// 暗黑主题配色
const darkThemeColors: ThemeColors = {
  background: {
    primary: '#0f0f23',
    secondary: '#1a1a3a',
    tertiary: '#252550',
    card: '#1e1e3e',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#a0a0a0',
    muted: '#6b7280',
    inverse: '#1a1a2e',
  },
  border: {
    default: '#374151',
    subtle: '#1f2937',
    strong: '#4b5563',
  },
  game: {
    night: '#0f0f23',
    day: '#2a2a4a',
    blood: '#8b0000',
    wolf: '#4a4a4a',
    villager: '#2e7d32',
    seer: '#7b1fa2',
    witch: '#6a1b9a',
    guard: '#1565c0',
    hunter: '#f57c00',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
};

// 光明主题配色
const lightThemeColors: ThemeColors = {
  background: {
    primary: '#f8f4e8',
    secondary: '#fff8e6',
    tertiary: '#fffbf0',
    card: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  text: {
    primary: '#1a1a2e',
    secondary: '#374151',
    muted: '#6b7280',
    inverse: '#e0e0e0',
  },
  border: {
    default: '#d1d5db',
    subtle: '#e5e7eb',
    strong: '#9ca3af',
  },
  game: {
    night: '#1a1a3a',
    day: '#f8f4e8',
    blood: '#dc2626',
    wolf: '#6b7280',
    villager: '#16a34a',
    seer: '#9333ea',
    witch: '#7c3aed',
    guard: '#2563eb',
    hunter: '#ea580c',
  },
  status: {
    success: '#22c55e',
    warning: '#eab308',
    danger: '#dc2626',
    info: '#2563eb',
  },
};

// 存储键
const STORAGE_KEY = 'werewolf-theme';

// 获取系统主题
function getSystemTheme(): AppliedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 从 localStorage 读取主题
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored;
  }
  return 'dark'; // 默认暗黑主题（狼人杀游戏氛围）
}

// 保存主题到 localStorage
function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
}

// 应用主题到 DOM
function applyThemeToDOM(appliedTheme: AppliedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 移除旧主题类
  root.classList.remove('dark', 'light');
  // 添加新主题类
  root.classList.add(appliedTheme);

  // 更新 meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      appliedTheme === 'dark' ? '#0f0f23' : '#f8f4e8'
    );
  }

  // 更新 CSS 变量
  const colors = appliedTheme === 'dark' ? darkThemeColors : lightThemeColors;

  // 背景色
  root.style.setProperty('--color-bg-primary', colors.background.primary);
  root.style.setProperty('--color-bg-secondary', colors.background.secondary);
  root.style.setProperty('--color-bg-tertiary', colors.background.tertiary);
  root.style.setProperty('--color-bg-card', colors.background.card);
  root.style.setProperty('--color-bg-overlay', colors.background.overlay);

  // 文字颜色
  root.style.setProperty('--color-text-primary', colors.text.primary);
  root.style.setProperty('--color-text-secondary', colors.text.secondary);
  root.style.setProperty('--color-text-muted', colors.text.muted);
  root.style.setProperty('--color-text-inverse', colors.text.inverse);

  // 边框颜色
  root.style.setProperty('--color-border', colors.border.default);
  root.style.setProperty('--color-border-subtle', colors.border.subtle);
  root.style.setProperty('--color-border-strong', colors.border.strong);

  // 游戏专用色
  root.style.setProperty('--color-night', colors.game.night);
  root.style.setProperty('--color-day', colors.game.day);
  root.style.setProperty('--color-blood', colors.game.blood);
  root.style.setProperty('--color-wolf', colors.game.wolf);
  root.style.setProperty('--color-villager', colors.game.villager);
  root.style.setProperty('--color-seer', colors.game.seer);
  root.style.setProperty('--color-witch', colors.game.witch);
  root.style.setProperty('--color-guard', colors.game.guard);
  root.style.setProperty('--color-hunter', colors.game.hunter);

  // 状态颜色
  root.style.setProperty('--color-success', colors.status.success);
  root.style.setProperty('--color-warning', colors.status.warning);
  root.style.setProperty('--color-danger', colors.status.danger);
  root.style.setProperty('--color-info', colors.status.info);
}

// 主题上下文类型
interface ThemeContextValue {
  // 当前选择的主题（包含 system）
  theme: Theme;
  // 实际应用的主题（dark 或 light）
  appliedTheme: AppliedTheme;
  // 主题颜色
  colors: ThemeColors;
  // 设置主题
  setTheme: (theme: Theme) => void;
  // 切换主题（在 dark 和 light 之间切换）
  toggleTheme: () => void;
  // 是否暗黑主题
  isDark: boolean;
  // 是否光明主题
  isLight: boolean;
  // 是否跟随系统
  isSystem: boolean;
}

// 创建主题上下文
const ThemeContext = createContext<ThemeContextValue | null>(null);

// 主题 Provider
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => {
    const stored = getStoredTheme();
    return stored === 'system' ? getSystemTheme() : stored;
  });

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);

    const applied = newTheme === 'system' ? getSystemTheme() : newTheme;
    setAppliedTheme(applied);
    applyThemeToDOM(applied);
  }, []);

  // 切换主题（在 dark 和 light 之间切换）
  const toggleTheme = useCallback(() => {
    const newTheme = appliedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [appliedTheme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newApplied = e.matches ? 'dark' : 'light';
        setAppliedTheme(newApplied);
        applyThemeToDOM(newApplied);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // 初始化时应用主题
  useEffect(() => {
    applyThemeToDOM(appliedTheme);
  }, []);

  // 计算颜色
  const colors = useMemo(
    () => (appliedTheme === 'dark' ? darkThemeColors : lightThemeColors),
    [appliedTheme]
  );

  // 计算状态
  const isDark = appliedTheme === 'dark';
  const isLight = appliedTheme === 'light';
  const isSystem = theme === 'system';

  const value: ThemeContextValue = {
    theme,
    appliedTheme,
    colors,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    isSystem,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用主题 hook
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// 导出颜色常量（用于静态样式）
export { darkThemeColors, lightThemeColors };

// 主题图标映射
export const themeIcons = {
  dark: '🌙',
  light: '☀️',
  system: '💻',
};

// 主题名称映射
export const themeNames = {
  dark: '暗黑模式',
  light: '光明模式',
  system: '跟随系统',
};
