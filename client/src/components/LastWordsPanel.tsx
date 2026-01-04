/**
 * LastWordsPanel 组件
 * 遗言系统 - 被处决玩家发表遗言
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Role, ROLE_INFO, Faction } from '../types/werewolf';

interface LastWordsPanelProps {
  onSpeak: (content: string) => void;
  onSkip: () => void;
  compact?: boolean;
}

// 死因文字映射
const DEATH_CAUSE_TEXT: Record<string, string> = {
  vote: '被投票出局',
  wolf: '被狼人杀害',
  poison: '被女巫毒死',
  hunter: '被猎人带走',
  alpha_wolf: '被狼王带走',
  lover: '殉情而亡',
  unknown: '意外死亡',
};

// 获取角色图标
function getRoleIcon(role: Role): string {
  switch (role) {
    case Role.WEREWOLF:
      return '🐺';
    case Role.ALPHA_WOLF:
      return '👹';
    case Role.SEER:
      return '🔮';
    case Role.WITCH:
      return '🧙‍♀️';
    case Role.HUNTER:
      return '🏹';
    case Role.GUARD:
      return '🛡️';
    case Role.IDIOT:
      return '🤡';
    case Role.CUPID:
      return '💘';
    default:
      return '👨‍🌾';
  }
}

// 获取阵营颜色
function getFactionColor(faction: Faction): string {
  switch (faction) {
    case Faction.WEREWOLF:
      return 'text-red-500';
    case Faction.VILLAGER:
      return 'text-green-500';
    case Faction.NEUTRAL:
      return 'text-purple-500';
    case Faction.LOVERS:
      return 'text-pink-500';
    default:
      return 'text-gray-400';
  }
}

// 主面板组件
export function LastWordsPanel({ onSpeak, onSkip, compact = false }: LastWordsPanelProps) {
  const {
    lastWordsInfo,
    lastWordsMessage,
    isMyLastWords,
    gameState,
  } = useGameStore();

  const [inputContent, setInputContent] = useState('');
  const [hasSent, setHasSent] = useState(false);

  // 发表遗言
  const handleSpeak = useCallback(() => {
    if (!inputContent.trim() || hasSent) return;
    onSpeak(inputContent.trim());
    setHasSent(true);
  }, [inputContent, hasSent, onSpeak]);

  // 放弃遗言
  const handleSkip = useCallback(() => {
    if (hasSent) return;
    onSkip();
    setHasSent(true);
  }, [hasSent, onSkip]);

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSpeak();
    }
  };

  // 没有遗言信息时显示提示
  if (!lastWordsInfo) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <span className="text-4xl mb-2 block">🎭</span>
          <p>没有遗言信息</p>
        </div>
      </div>
    );
  }

  const roleInfo = lastWordsInfo.speakerId && ROLE_INFO[lastWordsInfo.speakerId as Role]
    ? ROLE_INFO[lastWordsInfo.speakerId as Role]
    : null;

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : 'min-h-[300px]'} p-4`}>
      {/* 被处决玩家信息 */}
      <motion.div
        className="bg-gray-800/80 rounded-lg p-4 mb-4 border border-gray-700"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          {/* 角色头像 */}
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-3xl border-2 border-gray-600"
              animate={{
                borderColor: ['rgb(75, 85, 99)', 'rgb(220, 38, 38)', 'rgb(75, 85, 99)'],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {getRoleIcon(lastWordsInfo.speakerId as Role)}
            </motion.div>
            {/* 死亡标记 */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-sm">
              ☠️
            </div>
          </div>

          {/* 玩家信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {lastWordsInfo.seatNumber}号
              </span>
              <span className="text-white font-medium">
                {lastWordsInfo.speakerName}
              </span>
            </div>
            <div className={`text-sm ${getFactionColor(roleInfo?.faction || Faction.NEUTRAL)}`}>
              {roleInfo?.name || '未知'}
            </div>
            <div className="text-xs text-red-400 mt-1">
              {DEATH_CAUSE_TEXT[lastWordsInfo.deathCause] || DEATH_CAUSE_TEXT.unknown}
            </div>
          </div>

          {/* 倒计时 */}
          {gameState.timer !== undefined && (
            <motion.div
              className={`text-3xl font-bold ${
                gameState.timer <= 10 ? 'text-red-500' : 'text-yellow-500'
              }`}
              animate={gameState.timer <= 10 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {gameState.timer}s
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 遗言内容区域 */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* 如果是我在发表遗言 */}
          {isMyLastWords && !lastWordsMessage ? (
            <motion.div
              key="input"
              className="flex-1 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center text-yellow-500 mb-3">
                <span className="text-lg font-bold">你正在发表遗言</span>
                <p className="text-sm text-gray-400">留下你的遗言，给场上的玩家一些提示...</p>
              </div>

              {/* 输入框 */}
              <textarea
                className="flex-1 w-full p-3 bg-gray-700 border border-gray-600 rounded-lg
                           text-white placeholder-gray-500 resize-none focus:outline-none
                           focus:border-yellow-500 transition-colors"
                placeholder="输入你的遗言..."
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                disabled={hasSent}
                autoFocus
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{inputContent.length}/500</span>
                <div className="flex gap-2">
                  <motion.button
                    className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg
                               hover:bg-gray-500 transition-colors disabled:opacity-50"
                    onClick={handleSkip}
                    disabled={hasSent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    放弃发言
                  </motion.button>
                  <motion.button
                    className={`px-4 py-2 rounded-lg font-bold transition-colors
                               ${inputContent.trim()
                                 ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                                 : 'bg-gray-600 text-gray-500 cursor-not-allowed'}`}
                    onClick={handleSpeak}
                    disabled={!inputContent.trim() || hasSent}
                    whileHover={inputContent.trim() ? { scale: 1.05 } : {}}
                    whileTap={inputContent.trim() ? { scale: 0.95 } : {}}
                  >
                    发表遗言
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : lastWordsMessage ? (
            /* 显示已发表的遗言 */
            <motion.div
              key="message"
              className="flex-1 bg-gray-800/50 rounded-lg p-4 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                <span className="text-xl">💬</span>
                <span className="font-bold text-white">{lastWordsInfo.speakerName} 的遗言</span>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {lastWordsMessage}
              </p>
            </motion.div>
          ) : (
            /* 等待发表遗言 */
            <motion.div
              key="waiting"
              className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <motion.span
                  className="text-5xl block mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ⏳
                </motion.span>
                <p className="text-gray-400">
                  等待 <span className="text-white font-bold">{lastWordsInfo.speakerName}</span> 发表遗言...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 遗言弹窗组件（全屏覆盖）
export function LastWordsModal({ onSpeak, onSkip }: LastWordsPanelProps) {
  const { lastWordsInfo, isMyLastWords } = useGameStore();

  if (!lastWordsInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0 bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* 模态框 */}
        <motion.div
          className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          {/* 标题 */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <span className="text-2xl">⚰️</span>
            <div>
              <h2 className="text-xl font-bold text-white">遗言时间</h2>
              <p className="text-sm text-gray-400">
                {isMyLastWords ? '你可以发表你的遗言' : `${lastWordsInfo.speakerName} 正在发表遗言`}
              </p>
            </div>
          </div>

          {/* 内容 */}
          <LastWordsPanel onSpeak={onSpeak} onSkip={onSkip} compact />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 遗言状态栏（顶部显示）
export function LastWordsStatusBar() {
  const { lastWordsInfo, gameState } = useGameStore();

  if (!lastWordsInfo) return null;

  return (
    <motion.div
      className="bg-gray-800/90 border-b border-gray-700 px-4 py-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚰️</span>
          <div>
            <span className="text-yellow-500 font-bold">遗言时间</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-white">
              {lastWordsInfo.seatNumber}号 {lastWordsInfo.speakerName}
            </span>
            <span className="text-red-400 text-sm ml-2">
              ({DEATH_CAUSE_TEXT[lastWordsInfo.deathCause] || '死亡'})
            </span>
          </div>
        </div>

        {gameState.timer !== undefined && (
          <div className={`text-lg font-bold ${gameState.timer <= 10 ? 'text-red-500' : 'text-white'}`}>
            {gameState.timer}s
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default LastWordsPanel;
