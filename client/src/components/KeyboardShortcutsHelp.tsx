/**
 * KeyboardShortcutsHelp 组件
 * 显示键盘快捷键帮助信息
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  SHORTCUTS,
  getShortcutsByCategory,
  formatShortcut,
} from '../hooks/useKeyboardShortcuts';
import type { ShortcutCategory, ShortcutDefinition } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

// 分类标题和图标
const CATEGORY_INFO: Record<ShortcutCategory, { label: string; icon: string; color: string }> = {
  general: { label: '通用', icon: '⌨️', color: 'from-gray-500 to-gray-600' },
  game: { label: '游戏操作', icon: '🎮', color: 'from-blue-500 to-indigo-600' },
  chat: { label: '聊天', icon: '💬', color: 'from-green-500 to-emerald-600' },
  navigation: { label: '导航', icon: '🧭', color: 'from-purple-500 to-pink-600' },
};

// 单个快捷键显示
function ShortcutItem({ shortcut }: { shortcut: ShortcutDefinition }) {
  const keyDisplay = formatShortcut(shortcut);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <span className="text-gray-300 text-sm">{shortcut.description}</span>
      <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-yellow-400 shadow-sm">
        {keyDisplay}
      </kbd>
    </div>
  );
}

// 快捷键分类组
function ShortcutCategoryGroup({
  category,
  shortcuts,
}: {
  category: ShortcutCategory;
  shortcuts: ShortcutDefinition[];
}) {
  const info = CATEGORY_INFO[category];

  // 过滤掉数字键选择玩家的重复项，只显示一个代表
  const filteredShortcuts = shortcuts.filter((s) => {
    // 只保留 1-9, 0 中的第一个作为示例
    if (s.key === '2' || s.key === '3' || s.key === '4' || s.key === '5' ||
        s.key === '6' || s.key === '7' || s.key === '8' || s.key === '9' || s.key === '0') {
      return false;
    }
    return true;
  });

  // 添加一个合并的数字键说明
  const hasNumberKeys = shortcuts.some((s) => /^[0-9]$/.test(s.key));
  if (hasNumberKeys) {
    filteredShortcuts.push({
      key: '1-9, 0',
      description: '快速选择对应座位号的玩家',
      category: 'game',
    });
  }

  return (
    <div className="mb-4">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${info.color} mb-2`}
      >
        <span>{info.icon}</span>
        <span className="font-medium text-white">{info.label}</span>
      </div>
      <div className="space-y-1">
        {filteredShortcuts.map((shortcut, index) => (
          <ShortcutItem key={`${shortcut.key}-${index}`} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const shortcutsByCategory = getShortcutsByCategory();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 帮助弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:w-[600px] md:max-h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl
                       shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⌨️</span>
                <h2 className="text-xl font-bold text-white">键盘快捷键</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 快捷键列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {/* 提示信息 */}
              <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  💡 <strong>提示：</strong>在输入框内时，大部分快捷键会被禁用，只有 <kbd className="px-1 bg-gray-700 rounded text-xs">Esc</kbd> 键可用。
                </p>
              </div>

              {/* 按分类显示快捷键 */}
              {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
                <ShortcutCategoryGroup
                  key={category}
                  category={category as ShortcutCategory}
                  shortcuts={shortcuts}
                />
              ))}
            </div>

            {/* 底部 */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  按 <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-yellow-400">?</kbd> 随时查看帮助
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600
                           hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg
                           font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
                >
                  知道了
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 快捷键提示条 - 显示在底部的简短提示
export function ShortcutHint() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900/90
                    border border-gray-700 rounded-full text-sm text-gray-400
                    backdrop-blur-sm shadow-lg z-40 pointer-events-none">
      按 <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-600 rounded text-xs text-yellow-400 mx-1">?</kbd> 查看快捷键
    </div>
  );
}

// 单个快捷键提示徽章
export function ShortcutBadge({ shortcut, className = '' }: { shortcut: keyof typeof SHORTCUTS; className?: string }) {
  const def = SHORTCUTS[shortcut];
  if (!def) return null;

  return (
    <span className={`text-xs text-gray-500 ml-2 ${className}`}>
      (<kbd className="px-1 bg-gray-800 rounded">{formatShortcut(def)}</kbd>)
    </span>
  );
}
