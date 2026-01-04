/**
 * ThemeToggle - 主题切换组件
 * 支持暗黑/光明/跟随系统三种模式
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, type Theme, themeNames } from '../hooks/useTheme';

// 主题选项图标 SVG
const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const getThemeIcon = (theme: Theme) => {
  switch (theme) {
    case 'dark':
      return <MoonIcon />;
    case 'light':
      return <SunIcon />;
    case 'system':
      return <SystemIcon />;
  }
};

interface ThemeToggleProps {
  // 显示模式：icon-only 仅图标，dropdown 下拉菜单，button 切换按钮
  variant?: 'icon-only' | 'dropdown' | 'toggle';
  // 尺寸
  size?: 'sm' | 'md' | 'lg';
  // 额外的 className
  className?: string;
  // 显示标签
  showLabel?: boolean;
}

/**
 * 主题切换按钮（仅图标，点击切换）
 */
export function ThemeToggleButton({
  size = 'md',
  className = '',
}: Pick<ThemeToggleProps, 'size' | 'className'>) {
  const { appliedTheme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded-full
        bg-gray-800/50 dark:bg-gray-700/50 light:bg-white/50
        hover:bg-gray-700/70 dark:hover:bg-gray-600/70 light:hover:bg-gray-200/70
        border border-gray-600/50 dark:border-gray-500/50 light:border-gray-300/50
        text-yellow-400 dark:text-yellow-400 light:text-yellow-500
        transition-colors duration-200
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isDark ? '切换到光明模式' : '切换到暗黑模式'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={appliedTheme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * 主题切换开关（带滑块动画）
 */
export function ThemeSwitch({
  size = 'md',
  className = '',
  showLabel = false,
}: Pick<ThemeToggleProps, 'size' | 'className' | 'showLabel'>) {
  const { isDark, toggleTheme } = useTheme();

  const trackSizes = {
    sm: 'w-12 h-6',
    md: 'w-14 h-7',
    lg: 'w-16 h-8',
  };

  const thumbSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  // 计算滑块位移值
  const getTranslateX = () => {
    if (isDark) return 0;
    return size === 'sm' ? 24 : size === 'md' ? 28 : 32;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {isDark ? '暗黑' : '光明'}
        </span>
      )}
      <button
        onClick={toggleTheme}
        className={`
          ${trackSizes[size]}
          relative rounded-full p-0.5
          ${isDark
            ? 'bg-gradient-to-r from-indigo-900 to-purple-900'
            : 'bg-gradient-to-r from-yellow-400 to-orange-400'
          }
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${isDark ? 'focus:ring-purple-500' : 'focus:ring-yellow-500'}
        `}
        title={isDark ? '切换到光明模式' : '切换到暗黑模式'}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {/* 星星（暗黑模式） */}
          {isDark && (
            <>
              <div className="absolute w-1 h-1 bg-white rounded-full top-1 right-2 animate-pulse" />
              <div className="absolute w-0.5 h-0.5 bg-white rounded-full top-2 right-4 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute w-1 h-1 bg-white rounded-full bottom-1 right-3 animate-pulse" style={{ animationDelay: '0.3s' }} />
            </>
          )}
          {/* 云朵（光明模式） */}
          {!isDark && (
            <>
              <div className="absolute w-2 h-1 bg-white/60 rounded-full top-1.5 left-2" />
              <div className="absolute w-3 h-1.5 bg-white/60 rounded-full bottom-1.5 left-3" />
            </>
          )}
        </div>

        {/* 滑块 */}
        <motion.div
          className={`
            ${thumbSizes[size]}
            rounded-full flex items-center justify-center
            ${isDark
              ? 'bg-indigo-100 text-indigo-900'
              : 'bg-yellow-50 text-yellow-600'
            }
            shadow-lg
          `}
          animate={{ x: getTranslateX() }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {isDark ? (
            <MoonIcon />
          ) : (
            <SunIcon />
          )}
        </motion.div>
      </button>
    </div>
  );
}

/**
 * 主题下拉选择器
 */
export function ThemeDropdown({
  size = 'md',
  className = '',
}: Pick<ThemeToggleProps, 'size' | 'className'>) {
  const { theme, setTheme, appliedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const buttonSizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-2.5 text-lg',
  };

  const themes: Theme[] = ['dark', 'light', 'system'];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${buttonSizes[size]}
          flex items-center gap-2 rounded-lg
          bg-[var(--color-bg-card)] border border-[var(--color-border)]
          text-[var(--color-text-primary)]
          hover:bg-[var(--color-bg-tertiary)]
          transition-colors duration-200
        `}
      >
        <span className="w-5 h-5 flex items-center justify-center">
          {getThemeIcon(appliedTheme)}
        </span>
        <span>{themeNames[theme]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full left-0 mt-2 w-full min-w-[150px]
              bg-[var(--color-bg-card)] border border-[var(--color-border)]
              rounded-lg shadow-lg overflow-hidden z-50
            "
          >
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 flex items-center gap-3
                  text-left text-[var(--color-text-primary)]
                  hover:bg-[var(--color-bg-tertiary)]
                  transition-colors duration-150
                  ${theme === t ? 'bg-[var(--color-bg-secondary)]' : ''}
                `}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  {getThemeIcon(t)}
                </span>
                <span className="flex-1">{themeNames[t]}</span>
                {theme === t && (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 主题设置面板（完整设置界面）
 */
export function ThemeSettingsPanel({ className = '' }: { className?: string }) {
  const { theme, setTheme, appliedTheme, isDark } = useTheme();
  const themes: Theme[] = ['dark', 'light', 'system'];

  const themeDescriptions = {
    dark: '深色背景，保护眼睛，适合夜间游戏',
    light: '明亮背景，清晰可见，适合日间使用',
    system: '自动跟随设备系统设置切换主题',
  };

  return (
    <div className={`p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] ${className}`}>
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
        <span className="text-xl">{isDark ? '🌙' : '☀️'}</span>
        主题设置
      </h3>

      <div className="space-y-3">
        {themes.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTheme(t)}
            className={`
              w-full p-3 rounded-lg flex items-start gap-3
              border-2 transition-all duration-200
              ${theme === t
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)]'
              }
            `}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* 图标 */}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${t === 'dark' ? 'bg-indigo-900/50 text-indigo-300' : ''}
                ${t === 'light' ? 'bg-yellow-100 text-yellow-600' : ''}
                ${t === 'system' ? 'bg-gray-600/50 text-gray-300' : ''}
              `}
            >
              {getThemeIcon(t)}
            </div>

            {/* 内容 */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {themeNames[t]}
                </span>
                {theme === t && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                    当前
                  </span>
                )}
                {t === 'system' && theme === t && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                    {appliedTheme === 'dark' ? '暗黑' : '光明'}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {themeDescriptions[t]}
              </p>
            </div>

            {/* 选中指示 */}
            {theme === t && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* 预览提示 */}
      <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          提示：主题设置会自动保存，下次打开游戏时会自动应用。
        </p>
      </div>
    </div>
  );
}

/**
 * 浮动主题切换按钮（固定在角落）
 */
export function FloatingThemeToggle({
  position = 'bottom-left',
}: {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <ThemeToggleButton size="md" />
    </div>
  );
}

// 默认导出
export default function ThemeToggle(props: ThemeToggleProps) {
  const { variant = 'toggle', ...rest } = props;

  switch (variant) {
    case 'icon-only':
      return <ThemeToggleButton {...rest} />;
    case 'dropdown':
      return <ThemeDropdown {...rest} />;
    case 'toggle':
    default:
      return <ThemeSwitch {...rest} />;
  }
}
