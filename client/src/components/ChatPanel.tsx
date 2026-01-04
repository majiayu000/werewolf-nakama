/**
 * ChatPanel 组件
 * 游戏内聊天面板，支持公共聊天、狼人密语和观战聊天
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { ChatMessage, Role, ROLE_INFO } from '../types/werewolf';
import { EmojiPicker, EmojiButton } from './EmojiPicker';
import { QuickPhrases, QuickPhraseBar, QuickPhraseButton, WolfPhraseBar } from './QuickPhrases';

type ChatTab = 'public' | 'wolf' | 'dead';

interface ChatPanelProps {
  onSendMessage: (content: string, chatType: 'public' | 'wolf' | 'dead') => void;
}

export function ChatPanel({ onSendMessage }: ChatPanelProps) {
  const { t } = useTranslation();
  const { messages, myRole, gameState, playerId, players } = useGameStore();
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<ChatTab>('public');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取当前玩家
  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;
  const isDead = !isAlive && gameState.phase !== 'waiting';

  // 判断是否为狼人
  const isWerewolf = myRole === Role.WEREWOLF || myRole === Role.ALPHA_WOLF;

  // 判断当前是否夜晚
  const isNight = gameState.phase.startsWith('night');

  // 判断是否可以发送消息
  const canSendPublic = isAlive && !isNight;
  const canSendWolf = isAlive && isWerewolf && isNight;
  const canSendDead = isDead; // 死亡玩家可以在观战频道聊天

  // 过滤消息
  const publicMessages = messages.filter((m) => m.type === 'public' || m.type === 'system');
  const wolfMessages = messages.filter((m) => m.type === 'wolf');
  const deadMessages = messages.filter((m) => m.type === 'dead');

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (activeTab === 'wolf') {
      if (!canSendWolf) return;
      onSendMessage(inputValue, 'wolf');
    } else if (activeTab === 'dead') {
      if (!canSendDead) return;
      onSendMessage(inputValue, 'dead');
    } else {
      if (!canSendPublic) return;
      onSendMessage(inputValue, 'public');
    }
    setInputValue('');
  };

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // ESC 关闭弹出面板
    if (e.key === 'Escape') {
      if (showEmojiPicker) setShowEmojiPicker(false);
      if (showQuickPhrases) setShowQuickPhrases(false);
    }
  };

  // 处理快捷短语选择
  const handlePhraseSelect = (phrase: string) => {
    if (activeTab === 'wolf') {
      if (!canSendWolf) return;
      onSendMessage(phrase, 'wolf');
    } else if (activeTab === 'dead') {
      if (!canSendDead) return;
      onSendMessage(phrase, 'dead');
    } else {
      if (!canSendPublic) return;
      onSendMessage(phrase, 'public');
    }
    setShowQuickPhrases(false);
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    // 插入表情到输入框当前光标位置
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? inputValue.length;
      const end = input.selectionEnd ?? inputValue.length;
      const newValue = inputValue.slice(0, start) + emoji + inputValue.slice(end);
      setInputValue(newValue);
      // 设置光标位置到表情后面
      setTimeout(() => {
        input.focus();
        const newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setInputValue((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // 获取当前标签页的消息
  const currentMessages = activeTab === 'wolf'
    ? wolfMessages
    : activeTab === 'dead'
      ? deadMessages
      : publicMessages;

  // 判断输入是否被禁用
  const isInputDisabled = activeTab === 'wolf'
    ? !canSendWolf
    : activeTab === 'dead'
      ? !canSendDead
      : !canSendPublic;

  // 获取输入占位符文本
  const getPlaceholder = () => {
    if (activeTab === 'dead') {
      if (!isDead) return t('chat.deadCantSpeak');
      return t('chat.sendMessage');
    }
    if (!isAlive) return t('chat.deadCantSpeak');
    if (activeTab === 'wolf') {
      if (!isWerewolf) return t('chat.cantSpeak');
      if (!isNight) return t('chat.cantSpeak');
      return t('chat.sendMessage');
    }
    if (isNight) return t('chat.cantSpeak');
    return t('chat.sendMessage');
  };

  // 死亡后自动切换到观战频道
  useEffect(() => {
    if (isDead && activeTab === 'public') {
      setActiveTab('dead');
    }
  }, [isDead]);

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border-l border-gray-700">
      {/* 标签页切换 */}
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'public'
              ? 'text-white bg-gray-700/50 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('public')}
        >
          {t('chat.public')}
        </button>
        {isWerewolf && (
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'wolf'
                ? 'text-red-400 bg-gray-700/50 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('wolf')}
          >
            🐺 {t('chat.wolf')}
          </button>
        )}
        {isDead && (
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'dead'
                ? 'text-purple-400 bg-gray-700/50 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('dead')}
          >
            👻 {t('chat.dead')}
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {currentMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {activeTab === 'wolf' ? `🐺 ${t('chat.wolf')}` :
             activeTab === 'dead' ? `👻 ${t('chat.dead')} - ${t('spectator.allInfo')}` :
             t('common.none')}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {currentMessages.map((msg) => (
              <MessageItem key={msg.id} message={msg} isOwnMessage={msg.senderId === playerId} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-3 border-t border-gray-700">
        {/* 快捷短语条 */}
        {!isInputDisabled && (
          <div className="mb-2">
            {activeTab === 'wolf' && isWerewolf ? (
              <WolfPhraseBar onSelect={handlePhraseSelect} disabled={isInputDisabled} />
            ) : (
              <QuickPhraseBar onSelect={handlePhraseSelect} disabled={isInputDisabled} />
            )}
          </div>
        )}

        {/* 弹出式选择器容器 */}
        <div className="relative">
          <AnimatePresence>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                position="top"
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showQuickPhrases && (
              <QuickPhrases
                onSelect={handlePhraseSelect}
                onClose={() => setShowQuickPhrases(false)}
                position="top"
                myRole={myRole ?? undefined}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 items-center">
          {/* 快捷短语按钮 */}
          <QuickPhraseButton
            onClick={() => {
              setShowQuickPhrases(!showQuickPhrases);
              setShowEmojiPicker(false);
            }}
            disabled={isInputDisabled}
            isActive={showQuickPhrases}
          />

          {/* 表情按钮 */}
          <EmojiButton
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowQuickPhrases(false);
            }}
            disabled={isInputDisabled}
          />

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm
              bg-gray-700 border border-gray-600
              focus:outline-none focus:border-gray-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === 'wolf' ? 'placeholder-red-400/50' :
                activeTab === 'dead' ? 'placeholder-purple-400/50' : ''}
            `}
          />
          <button
            onClick={handleSend}
            disabled={isInputDisabled || !inputValue.trim()}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === 'wolf'
                ? 'bg-red-700 hover:bg-red-600'
                : activeTab === 'dead'
                  ? 'bg-purple-700 hover:bg-purple-600'
                  : 'bg-blue-600 hover:bg-blue-500'}
            `}
          >
            {t('common.submit')}
          </button>
        </div>

        {/* 状态提示 */}
        {isNight && !isWerewolf && isAlive && activeTab === 'public' && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {t('chat.cantSpeak')}
          </div>
        )}
        {isNight && isWerewolf && activeTab === 'public' && isAlive && (
          <div className="mt-2 text-xs text-red-400 text-center">
            {t('chat.wolf')}
          </div>
        )}
        {isDead && activeTab !== 'dead' && (
          <div className="mt-2 text-xs text-purple-400 text-center">
            {t('chat.dead')}
          </div>
        )}
        {activeTab === 'dead' && (
          <div className="mt-2 text-xs text-purple-400/60 text-center">
            👻 {t('spectator.mode')}: {t('spectator.allInfo')}
          </div>
        )}
      </div>
    </div>
  );
}

// 消息项组件
interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const isSystem = message.type === 'system';
  const isWolf = message.type === 'wolf';
  const isDead = message.type === 'dead';

  if (isSystem) {
    return (
      <motion.div
        className="text-center py-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
      >
        <span className="text-xs text-yellow-400 bg-yellow-900/20 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </motion.div>
    );
  }

  // 获取角色显示名
  const getRoleName = (role?: Role): string => {
    if (!role) return '';
    return ROLE_INFO[role]?.name || role;
  };

  // 获取角色颜色
  const getRoleColor = (role?: Role): string => {
    if (!role) return 'text-gray-400';
    const info = ROLE_INFO[role];
    if (!info) return 'text-gray-400';
    if (info.faction === 'werewolf') return 'text-red-400';
    if (info.faction === 'villager') return 'text-green-400';
    return 'text-purple-400'; // neutral
  };

  return (
    <motion.div
      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
      initial={{ opacity: 0, x: isOwnMessage ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* 发送者名称和角色 */}
      <div className="flex items-center gap-1.5 mb-0.5">
        {isWolf && <span className="text-red-400">🐺</span>}
        {isDead && <span className="text-purple-400">👻</span>}
        <span className={`text-xs ${
          isWolf ? 'text-red-400' : isDead ? 'text-purple-400' : 'text-gray-400'
        }`}>
          {message.seatNumber && `${message.seatNumber}号 `}
          {message.senderName}
        </span>
        {/* 在观战频道显示角色 */}
        {isDead && message.role && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleColor(message.role)} bg-gray-800/50`}>
            {getRoleName(message.role)}
          </span>
        )}
      </div>

      {/* 消息气泡 */}
      <div className={`
        max-w-[80%] px-3 py-2 rounded-lg text-sm
        ${isOwnMessage
          ? isWolf
            ? 'bg-red-900/50 text-red-100'
            : isDead
              ? 'bg-purple-900/50 text-purple-100'
              : 'bg-blue-600 text-white'
          : isWolf
            ? 'bg-red-900/30 text-red-200'
            : isDead
              ? 'bg-purple-900/30 text-purple-200'
              : 'bg-gray-700 text-gray-200'}
      `}>
        {message.content}
      </div>

      {/* 时间戳 */}
      <span className="text-xs text-gray-500 mt-0.5">
        {formatTime(message.timestamp)}
      </span>
    </motion.div>
  );
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default ChatPanel;
