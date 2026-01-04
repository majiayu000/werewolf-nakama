/**
 * DayTimer 组件
 * 白天阶段发言计时器，支持顺序发言和自由发言模式
 */

import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types/werewolf';

interface DayTimerProps {
  /** 总时间（秒） */
  totalTime: number;
  /** 剩余时间（秒） */
  remainingTime: number;
  /** 当前发言者（顺序发言模式） */
  currentSpeaker?: Player | null;
  /** 发言顺序列表（顺序发言模式） */
  speakingOrder?: Player[];
  /** 当前发言者索引 */
  currentSpeakerIndex?: number;
  /** 是否是自由发言模式 */
  isFreeDiscussion?: boolean;
  /** 是否暂停 */
  isPaused?: boolean;
  /** 紧急时间阈值（秒），低于此值显示紧急状态 */
  urgentThreshold?: number;
  /** 发言结束回调 */
  onSpeakEnd?: () => void;
  /** 跳过发言回调 */
  onSkipSpeaker?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示控制按钮 */
  showControls?: boolean;
}

// 圆形进度条 SVG 组件
function CircularProgress({
  progress,
  size,
  strokeWidth,
  isUrgent,
  isPaused,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  isUrgent: boolean;
  isPaused: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="transform -rotate-90"
    >
      {/* 背景圆环 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* 进度圆环 */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={isUrgent ? '#EF4444' : isPaused ? '#9CA3AF' : '#22C55E'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        initial={{ strokeDashoffset: circumference }}
        animate={{
          strokeDashoffset: offset,
          stroke: isUrgent ? '#EF4444' : isPaused ? '#9CA3AF' : '#22C55E',
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}`;
}

// 尺寸配置
const sizeConfig = {
  sm: { containerSize: 80, strokeWidth: 4, fontSize: 'text-xl', labelSize: 'text-xs' },
  md: { containerSize: 120, strokeWidth: 6, fontSize: 'text-3xl', labelSize: 'text-sm' },
  lg: { containerSize: 160, strokeWidth: 8, fontSize: 'text-4xl', labelSize: 'text-base' },
};

export function DayTimer({
  totalTime,
  remainingTime,
  currentSpeaker,
  speakingOrder = [],
  currentSpeakerIndex = 0,
  isFreeDiscussion = false,
  isPaused = false,
  urgentThreshold = 10,
  onSpeakEnd,
  onSkipSpeaker,
  size = 'md',
  showControls = false,
}: DayTimerProps) {
  const { t } = useTranslation();
  const [isBlinking, setIsBlinking] = useState(false);

  // 计算进度百分比
  const progress = useMemo(() => {
    if (totalTime <= 0) return 0;
    return (remainingTime / totalTime) * 100;
  }, [remainingTime, totalTime]);

  // 是否处于紧急状态
  const isUrgent = remainingTime <= urgentThreshold && remainingTime > 0;

  // 紧急状态闪烁效果
  useEffect(() => {
    if (isUrgent && !isPaused) {
      const interval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setIsBlinking(false);
    }
  }, [isUrgent, isPaused]);

  // 时间耗尽触发回调
  useEffect(() => {
    if (remainingTime === 0 && onSpeakEnd) {
      onSpeakEnd();
    }
  }, [remainingTime, onSpeakEnd]);

  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 发言模式标签 */}
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isFreeDiscussion
              ? 'bg-blue-900/50 text-blue-300 border border-blue-600/50'
              : 'bg-amber-900/50 text-amber-300 border border-amber-600/50'
          }`}
        >
          {isFreeDiscussion ? t('dayTimer.freeDiscussion') : t('dayTimer.orderedSpeech')}
        </span>
        {isPaused && (
          <motion.span
            className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {t('dayTimer.paused')}
          </motion.span>
        )}
      </div>

      {/* 圆形计时器 */}
      <motion.div
        className="relative"
        animate={{
          scale: isUrgent && isBlinking ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <CircularProgress
          progress={progress}
          size={config.containerSize}
          strokeWidth={config.strokeWidth}
          isUrgent={isUrgent}
          isPaused={isPaused}
        />

        {/* 中心时间显示 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-mono font-bold ${config.fontSize} ${
              isUrgent ? 'text-red-400' : isPaused ? 'text-gray-400' : 'text-white'
            }`}
            animate={{
              opacity: isUrgent && isBlinking ? 0.5 : 1,
            }}
          >
            {formatTime(remainingTime)}
          </motion.span>
          <span className={`${config.labelSize} text-gray-500`}>
            {remainingTime > 0 ? t('dayTimer.remaining') : t('dayTimer.ended')}
          </span>
        </div>

        {/* 紧急状态光晕 */}
        <AnimatePresence>
          {isUrgent && !isPaused && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.1, 1],
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* 当前发言者信息（顺序发言模式） */}
      {!isFreeDiscussion && currentSpeaker && (
        <motion.div
          className="flex flex-col items-center gap-2 p-3 bg-gray-800/80 rounded-lg
                     border border-gray-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={currentSpeaker.id}
        >
          {/* 发言者头像和名称 */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center
                         text-lg font-bold ${
                           currentSpeaker.isAlive
                             ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                             : 'bg-gray-600'
                         }`}
            >
              {currentSpeaker.seatNumber}
            </div>
            <div className="text-left">
              <div className="font-bold text-white flex items-center gap-2">
                {currentSpeaker.name}
                <motion.span
                  className="text-amber-400"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  🎤
                </motion.span>
              </div>
              <div className="text-xs text-gray-400">
                {t('dayTimer.speaking')}
              </div>
            </div>
          </div>

          {/* 发言顺序进度 */}
          {speakingOrder.length > 1 && (
            <div className="flex items-center gap-1 mt-1">
              {speakingOrder.map((player, index) => (
                <motion.div
                  key={player.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index < currentSpeakerIndex
                      ? 'bg-green-500'
                      : index === currentSpeakerIndex
                      ? 'bg-amber-400'
                      : 'bg-gray-600'
                  }`}
                  animate={
                    index === currentSpeakerIndex
                      ? { scale: [1, 1.3, 1] }
                      : {}
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                  title={t('dayTimer.seatFormat', { seat: player.seatNumber, name: player.name })}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 下一个发言者预告 */}
      {!isFreeDiscussion && speakingOrder.length > 1 && currentSpeakerIndex < speakingOrder.length - 1 && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>{t('dayTimer.nextSpeaker')}</span>
          <span className="text-gray-400">
            {t('dayTimer.seatFormat', {
              seat: speakingOrder[currentSpeakerIndex + 1]?.seatNumber,
              name: speakingOrder[currentSpeakerIndex + 1]?.name
            })}
          </span>
        </div>
      )}

      {/* 控制按钮 */}
      {showControls && (
        <div className="flex items-center gap-2 mt-2">
          {!isFreeDiscussion && onSkipSpeaker && (
            <motion.button
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-gray-700 hover:bg-gray-600 text-gray-300
                        transition-colors flex items-center gap-1"
              onClick={onSkipSpeaker}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('dayTimer.skip')}
            </motion.button>
          )}
          {onSpeakEnd && (
            <motion.button
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-green-700 hover:bg-green-600 text-white
                        transition-colors flex items-center gap-1"
              onClick={onSpeakEnd}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('dayTimer.endSpeaking')}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

// 简化版计时器（用于顶部状态栏）
interface CompactTimerProps {
  remainingTime: number;
  totalTime: number;
  isUrgent?: boolean;
  label?: string;
}

export function CompactTimer({
  remainingTime,
  totalTime,
  isUrgent = false,
  label,
}: CompactTimerProps) {
  const { t } = useTranslation();
  const [blink, setBlink] = useState(false);
  const displayLabel = label ?? t('dayTimer.remainingTime');

  // 紧急闪烁
  useEffect(() => {
    if (isUrgent) {
      const interval = setInterval(() => setBlink((prev) => !prev), 500);
      return () => clearInterval(interval);
    }
    setBlink(false);
  }, [isUrgent]);

  const progress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full
                 ${isUrgent ? 'bg-red-900/50' : 'bg-gray-800'}
                 border ${isUrgent ? 'border-red-600' : 'border-gray-700'}`}
      animate={{
        scale: isUrgent && blink ? 1.05 : 1,
      }}
    >
      {/* 迷你进度条 */}
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* 时间文字 */}
      <motion.span
        className={`font-mono text-sm font-bold ${
          isUrgent ? 'text-red-400' : 'text-white'
        }`}
        animate={{ opacity: isUrgent && blink ? 0.5 : 1 }}
      >
        {formatTime(remainingTime)}
      </motion.span>

      {/* 标签 */}
      <span className="text-xs text-gray-500">{displayLabel}</span>
    </motion.div>
  );
}

// 发言队列组件（显示所有待发言玩家）
interface SpeakingQueueProps {
  speakingOrder: Player[];
  currentSpeakerIndex: number;
  onSelectSpeaker?: (index: number) => void;
}

export function SpeakingQueue({
  speakingOrder,
  currentSpeakerIndex,
  onSelectSpeaker,
}: SpeakingQueueProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <span>{t('dayTimer.speakingOrder')}</span>
        <span className="text-gray-600">
          {t('dayTimer.progressFormat', { current: currentSpeakerIndex + 1, total: speakingOrder.length })}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {speakingOrder.map((player, index) => {
          const isPast = index < currentSpeakerIndex;
          const isCurrent = index === currentSpeakerIndex;

          return (
            <motion.button
              key={player.id}
              className={`
                relative px-2 py-1 rounded-lg text-xs font-medium
                transition-colors flex items-center gap-1
                ${isPast
                  ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                  : isCurrent
                  ? 'bg-amber-700 text-white border border-amber-500'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'}
                ${onSelectSpeaker && !isPast ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
              `}
              onClick={() => onSelectSpeaker && !isPast && onSelectSpeaker(index)}
              whileHover={onSelectSpeaker && !isPast ? { scale: 1.05 } : {}}
              layout
            >
              {/* 座位号 */}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center
                           text-[10px] font-bold ${
                             isPast
                               ? 'bg-green-600'
                               : isCurrent
                               ? 'bg-amber-500'
                               : 'bg-gray-600'
                           }`}
              >
                {player.seatNumber}
              </span>

              {/* 名称 */}
              <span className="truncate max-w-[60px]">{player.name}</span>

              {/* 状态图标 */}
              {isPast && <span className="text-green-400">✓</span>}
              {isCurrent && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🎤
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default DayTimer;
