/**
 * useKeyboardShortcuts Hook
 * 键盘快捷键管理
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

// 快捷键定义
export interface ShortcutDefinition {
  key: string;
  code?: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: ShortcutCategory;
}

export type ShortcutCategory = 'general' | 'game' | 'chat' | 'navigation';

// 所有可用的快捷键
export const SHORTCUTS: Record<string, ShortcutDefinition> = {
  // 通用
  escape: { key: 'Escape', description: '取消选择/关闭弹窗', category: 'general' },
  enter: { key: 'Enter', description: '确认操作', category: 'general' },
  space: { key: ' ', code: 'Space', description: '确认当前选择', category: 'general' },
  help: { key: '?', shift: true, description: '显示快捷键帮助', category: 'general' },

  // 游戏操作
  ready: { key: 'r', description: '准备/取消准备', category: 'game' },
  confirm: { key: 'y', description: '确认技能/投票', category: 'game' },
  skip: { key: 'n', description: '跳过/放弃技能', category: 'game' },

  // 快速选择玩家 (1-9, 0 代表10号位)
  selectPlayer1: { key: '1', description: '选择1号玩家', category: 'game' },
  selectPlayer2: { key: '2', description: '选择2号玩家', category: 'game' },
  selectPlayer3: { key: '3', description: '选择3号玩家', category: 'game' },
  selectPlayer4: { key: '4', description: '选择4号玩家', category: 'game' },
  selectPlayer5: { key: '5', description: '选择5号玩家', category: 'game' },
  selectPlayer6: { key: '6', description: '选择6号玩家', category: 'game' },
  selectPlayer7: { key: '7', description: '选择7号玩家', category: 'game' },
  selectPlayer8: { key: '8', description: '选择8号玩家', category: 'game' },
  selectPlayer9: { key: '9', description: '选择9号玩家', category: 'game' },
  selectPlayer10: { key: '0', description: '选择10号玩家', category: 'game' },

  // 聊天
  focusChat: { key: 't', description: '聚焦聊天输入框', category: 'chat' },
  switchChannel: { key: 'Tab', description: '切换聊天频道', category: 'chat' },
  sendMessage: { key: 'Enter', description: '发送消息', category: 'chat' },

  // 导航
  toggleChat: { key: 'c', description: '打开/关闭聊天面板', category: 'navigation' },
  toggleVote: { key: 'v', description: '打开/关闭投票面板', category: 'navigation' },
  toggleSound: { key: 's', description: '切换音效', category: 'navigation' },
  toggleSheriff: { key: 'h', description: '打开警长面板', category: 'navigation' },
};

// 按分类获取快捷键
export function getShortcutsByCategory(): Record<ShortcutCategory, ShortcutDefinition[]> {
  const result: Record<ShortcutCategory, ShortcutDefinition[]> = {
    general: [],
    game: [],
    chat: [],
    navigation: [],
  };

  Object.values(SHORTCUTS).forEach((shortcut) => {
    result[shortcut.category].push(shortcut);
  });

  return result;
}

// 格式化快捷键显示
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  let keyDisplay = shortcut.key;
  if (shortcut.key === ' ') keyDisplay = 'Space';
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'Tab') keyDisplay = 'Tab';
  if (shortcut.key === 'Enter') keyDisplay = 'Enter';

  parts.push(keyDisplay.toUpperCase());
  return parts.join(' + ');
}

// Hook 参数
interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onToggleChat?: () => void;
  onToggleVote?: () => void;
  onToggleSheriff?: () => void;
  onToggleSound?: () => void;
  onReady?: () => void;
  onConfirm?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  onSelectPlayer?: (seatNumber: number) => void;
  onFocusChat?: () => void;
  onSwitchChannel?: () => void;
  onShowHelp?: () => void;
}

// 检查是否在输入框中
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  const tagName = activeElement.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || (activeElement as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    onToggleChat,
    onToggleVote,
    onToggleSheriff,
    onToggleSound,
    onReady,
    onConfirm,
    onSkip,
    onCancel,
    onSelectPlayer,
    onFocusChat,
    onSwitchChannel,
    onShowHelp,
  } = options;

  const players = useGameStore((state) => state.players);

  // 记录上次按键时间，防止重复触发
  const lastKeyTime = useRef<Record<string, number>>({});

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 防抖：同一按键 100ms 内不重复触发
      const now = Date.now();
      const lastTime = lastKeyTime.current[event.key] || 0;
      if (now - lastTime < 100) return;
      lastKeyTime.current[event.key] = now;

      // 在输入框中时，只处理特定按键
      const inputFocused = isInputFocused();

      // Escape 总是可用 - 取消/关闭
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
        return;
      }

      // 输入框中时，Tab 用于切换频道（但不阻止默认行为）
      if (inputFocused) {
        if (event.key === 'Tab' && !event.shiftKey) {
          // 让 Tab 处理频道切换，但需要手动阻止默认行为
          // 为了不破坏表单导航，只在聊天面板中生效
          // 这里不处理，让组件自己处理
        }
        // 输入框中不处理其他快捷键
        return;
      }

      // 显示帮助 (Shift + ?)
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        onShowHelp?.();
        return;
      }

      // 导航快捷键
      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          onToggleChat?.();
          return;
        case 'v':
          event.preventDefault();
          onToggleVote?.();
          return;
        case 'h':
          event.preventDefault();
          onToggleSheriff?.();
          return;
        case 's':
          event.preventDefault();
          onToggleSound?.();
          return;
        case 't':
          event.preventDefault();
          onFocusChat?.();
          return;
        case 'r':
          event.preventDefault();
          onReady?.();
          return;
        case 'y':
          event.preventDefault();
          onConfirm?.();
          return;
        case 'n':
          event.preventDefault();
          onSkip?.();
          return;
      }

      // 空格确认
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        onConfirm?.();
        return;
      }

      // Tab 切换频道
      if (event.key === 'Tab' && !inputFocused) {
        event.preventDefault();
        onSwitchChannel?.();
        return;
      }

      // 数字键选择玩家
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const seatNumber = event.key === '0' ? 10 : parseInt(event.key, 10);
        // 检查座位号是否有效
        if (seatNumber <= players.length) {
          onSelectPlayer?.(seatNumber);
        }
        return;
      }
    },
    [
      enabled,
      players.length,
      onToggleChat,
      onToggleVote,
      onToggleSheriff,
      onToggleSound,
      onReady,
      onConfirm,
      onSkip,
      onCancel,
      onSelectPlayer,
      onFocusChat,
      onSwitchChannel,
      onShowHelp,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: SHORTCUTS,
    getShortcutsByCategory,
    formatShortcut,
  };
}

// 快捷键上下文 - 用于禁用快捷键
export function useDisableShortcuts() {
  // 返回一个 ref，当聚焦到该元素时禁用快捷键
  // 实际上通过 isInputFocused 自动处理
  return null;
}
