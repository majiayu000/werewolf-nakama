/**
 * VoteAnimation 组件
 * 投票动画系统：飞行动画、连线可视化、票数弹跳、结果揭示
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type { Player } from '../types/werewolf';

// 投票飞行事件（用于触发飞行动画）
export interface VoteFlyEvent {
  id: string;
  voterId: string;
  targetId: string;
  timestamp: number;
}

// 投票连线数据
interface VoteLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  voterId: string;
  targetId: string;
}

// 座位位置接口
interface SeatPosition {
  x: number;
  y: number;
}

// ========================
// 投票飞行动画（飘飞的票据）
// ========================
interface VoteBallotProps {
  from: SeatPosition;
  to: SeatPosition;
  onComplete: () => void;
  delay?: number;
}

function VoteBallot({ from, to, onComplete, delay = 0 }: VoteBallotProps) {
  const controls = useAnimation();

  useEffect(() => {
    const animate = async () => {
      await controls.start({
        x: [0, (to.x - from.x) * 0.5, to.x - from.x],
        y: [0, (to.y - from.y) * 0.3 - 30, to.y - from.y],
        scale: [0, 1.2, 1, 0.8],
        rotate: [0, -15, 15, 0],
        opacity: [0, 1, 1, 0],
        transition: {
          duration: 0.8,
          delay,
          ease: 'easeOut',
          times: [0, 0.3, 0.7, 1],
        },
      });
      onComplete();
    };
    animate();
  }, [from, to, controls, onComplete, delay]);

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${from.x}%`,
        top: `${from.y}%`,
      }}
      animate={controls}
      initial={{ scale: 0, opacity: 0 }}
    >
      <div className="relative">
        {/* 票据主体 */}
        <div className="w-8 h-6 bg-gradient-to-br from-amber-200 to-amber-400 rounded-sm
                        shadow-lg border border-amber-500/50 flex items-center justify-center">
          <span className="text-xs">🗳️</span>
        </div>
        {/* 拖尾光效 */}
        <motion.div
          className="absolute inset-0 bg-amber-300/30 rounded-sm blur-md"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
        />
      </div>
    </motion.div>
  );
}

// ========================
// 投票连线可视化
// ========================
interface VoteLinesProps {
  votes: Record<string, string[]>;
  players: Player[];
  seatPositions: SeatPosition[];
  showAnimation?: boolean;
}

export function VoteLines({ votes, players, seatPositions, showAnimation = true }: VoteLinesProps) {
  const lines = useMemo(() => {
    const result: VoteLine[] = [];

    Object.entries(votes).forEach(([targetId, voterIds]) => {
      voterIds.forEach((voterId) => {
        const voterIndex = players.findIndex((p) => p.id === voterId);
        const targetIndex = players.findIndex((p) => p.id === targetId);

        if (voterIndex >= 0 && targetIndex >= 0) {
          result.push({
            from: seatPositions[voterIndex],
            to: seatPositions[targetIndex],
            voterId,
            targetId,
          });
        }
      });
    });

    return result;
  }, [votes, players, seatPositions]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* 渐变定义 */}
        <linearGradient id="voteLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(239, 68, 68, 0.6)" />
          <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" />
        </linearGradient>
        {/* 箭头标记 */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="rgba(239, 68, 68, 0.8)"
          />
        </marker>
        {/* 发光滤镜 */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {lines.map((line, index) => (
        <motion.line
          key={`${line.voterId}-${line.targetId}`}
          x1={`${line.from.x}%`}
          y1={`${line.from.y}%`}
          x2={`${line.to.x}%`}
          y2={`${line.to.y}%`}
          stroke="url(#voteLineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd="url(#arrowhead)"
          filter="url(#glow)"
          initial={showAnimation ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: 'easeOut',
          }}
        />
      ))}
    </svg>
  );
}

// ========================
// 票数弹跳动画
// ========================
interface VoteCountBubbleProps {
  count: number;
  isNew?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function VoteCountBubble({ count, isNew = false, size = 'md' }: VoteCountBubbleProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  return (
    <motion.div
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        bg-gradient-to-br from-red-500 to-red-700 text-white font-bold
        shadow-lg border border-red-400/50
      `}
      key={count}
      initial={isNew ? { scale: 0, rotate: -180 } : { scale: 1 }}
      animate={{
        scale: isNew ? [0, 1.4, 1] : [1, 1.2, 1],
        rotate: isNew ? [-180, 10, 0] : 0,
      }}
      transition={{
        duration: 0.4,
        ease: 'easeOut',
      }}
    >
      {count}
    </motion.div>
  );
}

// ========================
// 投票目标高亮环
// ========================
interface VoteTargetRingProps {
  isActive: boolean;
  voteCount: number;
}

export function VoteTargetRing({ isActive, voteCount }: VoteTargetRingProps) {
  if (!isActive && voteCount === 0) return null;

  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* 外圈光晕 */}
      <motion.div
        className="absolute inset-[-4px] rounded-full border-2 border-red-500/50"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* 内圈 */}
      <div className="absolute inset-[-2px] rounded-full border-2 border-red-400" />

      {/* 票数指示器 */}
      {voteCount > 0 && (
        <motion.div
          className="absolute -top-2 -right-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <VoteCountBubble count={voteCount} size="sm" isNew />
        </motion.div>
      )}
    </motion.div>
  );
}

// ========================
// 投票结果揭示动画
// ========================
interface VoteResultRevealProps {
  executed?: string;
  isTie: boolean;
  votes: Record<string, string[]>;
  players: Player[];
  onComplete?: () => void;
}

export function VoteResultReveal({
  executed,
  isTie,
  votes,
  players,
  onComplete,
}: VoteResultRevealProps) {
  const [phase, setPhase] = useState<'counting' | 'reveal' | 'complete'>('counting');
  const [currentIndex, setCurrentIndex] = useState(0);

  // 按票数排序的玩家
  const sortedResults = useMemo(() => {
    return Object.entries(votes)
      .map(([targetId, voterIds]) => ({
        targetId,
        player: players.find((p) => p.id === targetId),
        count: voterIds.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [votes, players]);

  useEffect(() => {
    if (phase === 'counting' && sortedResults.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= sortedResults.length - 1) {
            clearInterval(timer);
            setTimeout(() => setPhase('reveal'), 500);
            return prev;
          }
          return prev + 1;
        });
      }, 300);
      return () => clearInterval(timer);
    }
  }, [phase, sortedResults.length]);

  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => {
        setPhase('complete');
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  if (sortedResults.length === 0) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900/95 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* 标题 */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-3xl">🗳️</span>
          <h2 className="text-xl font-bold text-white mt-2">投票结果</h2>
        </motion.div>

        {/* 计票过程 */}
        <div className="space-y-3 mb-6">
          {sortedResults.map((result, index) => (
            <motion.div
              key={result.targetId}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${index <= currentIndex ? 'opacity-100' : 'opacity-30'}
                ${result.targetId === executed
                  ? 'bg-red-900/50 border border-red-500'
                  : 'bg-gray-800/50'}
              `}
              initial={{ x: -50, opacity: 0 }}
              animate={{
                x: index <= currentIndex ? 0 : -50,
                opacity: index <= currentIndex ? 1 : 0.3,
              }}
              transition={{ delay: index * 0.15 }}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold">
                  {result.player?.seatNumber}
                </span>
                <span className="font-medium">{result.player?.name}</span>
              </div>
              <motion.div
                className="flex items-center gap-2"
                initial={{ scale: 0 }}
                animate={{ scale: index <= currentIndex ? 1 : 0 }}
                transition={{ delay: index * 0.15 + 0.2 }}
              >
                <VoteCountBubble count={result.count} isNew={index === currentIndex} />
                <span className="text-gray-400 text-sm">票</span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* 结果公布 */}
        <AnimatePresence>
          {phase === 'reveal' && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {isTie ? (
                <div className="flex items-center justify-center gap-3 text-yellow-400">
                  <motion.span
                    className="text-4xl"
                    animate={{ rotate: [-10, 10, -10] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                  >
                    ⚖️
                  </motion.span>
                  <span className="text-2xl font-bold">平票！无人出局</span>
                </div>
              ) : executed ? (
                <div className="space-y-2">
                  <motion.div
                    className="text-red-400 text-2xl font-bold flex items-center justify-center gap-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.span
                      animate={{ rotate: [0, -20, 20, 0] }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      ⚔️
                    </motion.span>
                    {players.find((p) => p.id === executed)?.name}
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      被处决
                    </motion.span>
                  </motion.div>
                  {/* 死亡效果 */}
                  <motion.div
                    className="text-4xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    ☠️
                  </motion.div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ========================
// 投票飞行动画容器（管理多个飞行票据）
// ========================
interface VoteFlightContainerProps {
  events: VoteFlyEvent[];
  players: Player[];
  seatPositions: SeatPosition[];
  onEventComplete: (eventId: string) => void;
}

export function VoteFlightContainer({
  events,
  players,
  seatPositions,
  onEventComplete,
}: VoteFlightContainerProps) {
  const getPosition = useCallback(
    (playerId: string): SeatPosition | null => {
      const index = players.findIndex((p) => p.id === playerId);
      return index >= 0 ? seatPositions[index] : null;
    },
    [players, seatPositions]
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {events.map((event, index) => {
          const from = getPosition(event.voterId);
          const to = getPosition(event.targetId);

          if (!from || !to) return null;

          return (
            <VoteBallot
              key={event.id}
              from={from}
              to={to}
              delay={index * 0.1}
              onComplete={() => onEventComplete(event.id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ========================
// 投票动画 Hook
// ========================
export function useVoteAnimation() {
  const [flyEvents, setFlyEvents] = useState<VoteFlyEvent[]>([]);
  const [showResultReveal, setShowResultReveal] = useState(false);

  // 添加飞行事件
  const addFlyEvent = useCallback((voterId: string, targetId: string) => {
    const event: VoteFlyEvent = {
      id: `${voterId}-${targetId}-${Date.now()}`,
      voterId,
      targetId,
      timestamp: Date.now(),
    };
    setFlyEvents((prev) => [...prev, event]);
  }, []);

  // 移除已完成的飞行事件
  const removeFlyEvent = useCallback((eventId: string) => {
    setFlyEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  // 清除所有飞行事件
  const clearFlyEvents = useCallback(() => {
    setFlyEvents([]);
  }, []);

  // 显示结果揭示
  const triggerResultReveal = useCallback(() => {
    setShowResultReveal(true);
  }, []);

  // 隐藏结果揭示
  const hideResultReveal = useCallback(() => {
    setShowResultReveal(false);
  }, []);

  return {
    flyEvents,
    addFlyEvent,
    removeFlyEvent,
    clearFlyEvents,
    showResultReveal,
    triggerResultReveal,
    hideResultReveal,
  };
}

// ========================
// 投票进度条动画
// ========================
interface VoteProgressBarProps {
  current: number;
  total: number;
  timeLeft?: number;
  isUrgent?: boolean;
}

export function VoteProgressBar({ current, total, timeLeft, isUrgent }: VoteProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* 进度条 */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 to-red-400'
              : 'bg-gradient-to-r from-red-600 via-amber-500 to-red-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* 光效 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          已投票: <span className="text-white font-bold">{current}</span> / {total}
        </span>
        {timeLeft !== undefined && (
          <motion.span
            className={`font-mono font-bold ${
              isUrgent ? 'text-red-400' : 'text-gray-300'
            }`}
            animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
          >
            {timeLeft}s
          </motion.span>
        )}
      </div>
    </div>
  );
}

// ========================
// 投票确认动画按钮
// ========================
interface VoteConfirmButtonProps {
  targetName: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export function VoteConfirmButton({ targetName, onConfirm, disabled }: VoteConfirmButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.button
      className={`
        relative w-full py-4 rounded-xl font-bold text-lg overflow-hidden
        ${disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600'}
      `}
      onClick={disabled ? undefined : onConfirm}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {/* 背景动画 */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* 点击波纹 */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-xl"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <span className="relative z-10 flex items-center justify-center gap-2">
        <span>🗳️</span>
        <span>投票给 {targetName}</span>
      </span>
    </motion.button>
  );
}

export default VoteFlightContainer;
