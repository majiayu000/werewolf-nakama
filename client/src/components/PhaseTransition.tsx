/**
 * PhaseTransition 组件
 * 夜晚/白天阶段切换过渡动画
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePhase } from '../types/werewolf';

export type TransitionType = 'day-to-night' | 'night-to-day' | null;

interface PhaseTransitionProps {
  transitionType: TransitionType;
  dayCount: number;
  onComplete?: () => void;
}

// 星星组件
function Stars({ count = 30 }: { count?: number }) {
  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60 + 5, // 上部区域
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 1,
    }));
  }, [count]);

  return (
    <>
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.5, 1, 0],
            scale: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: 3,
            delay: star.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
}

// 云朵组件
function Clouds() {
  const clouds = useMemo(() => [
    { id: 1, x: -20, y: 20, scale: 1, delay: 0 },
    { id: 2, x: 110, y: 35, scale: 0.8, delay: 0.3 },
    { id: 3, x: -30, y: 50, scale: 1.2, delay: 0.6 },
  ], []);

  return (
    <>
      {clouds.map((cloud) => (
        <motion.div
          key={cloud.id}
          className="absolute flex gap-2"
          style={{
            top: `${cloud.y}%`,
            transform: `scale(${cloud.scale})`,
          }}
          initial={{ x: cloud.x > 50 ? '120%' : '-40%', opacity: 0 }}
          animate={{
            x: cloud.x > 50 ? '-40%' : '120%',
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 4,
            delay: cloud.delay,
            ease: 'linear',
          }}
        >
          <div className="w-16 h-10 bg-gray-300/60 rounded-full" />
          <div className="w-20 h-12 bg-gray-300/70 rounded-full -mt-2 -ml-6" />
          <div className="w-14 h-9 bg-gray-300/50 rounded-full -mt-1 -ml-4" />
        </motion.div>
      ))}
    </>
  );
}

// 月亮组件
function Moon({ isRising }: { isRising: boolean }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2"
      initial={{ y: isRising ? 400 : -100 }}
      animate={{ y: isRising ? -100 : 400 }}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
    >
      <motion.div
        className="relative w-24 h-24"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: 1 }}
      >
        {/* 月亮本体 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fcd34d 100%)',
            boxShadow: '0 0 60px rgba(253, 230, 138, 0.8), 0 0 100px rgba(253, 230, 138, 0.4)',
          }}
        />
        {/* 月亮阴影（月牙效果） */}
        <div
          className="absolute rounded-full"
          style={{
            width: '85%',
            height: '85%',
            top: '5%',
            left: '15%',
            background: 'linear-gradient(135deg, transparent 40%, rgba(251, 191, 36, 0.3) 100%)',
          }}
        />
        {/* 月亮纹理 */}
        <div
          className="absolute w-4 h-4 rounded-full bg-yellow-300/30"
          style={{ top: '25%', left: '30%' }}
        />
        <div
          className="absolute w-3 h-3 rounded-full bg-yellow-300/20"
          style={{ top: '50%', left: '55%' }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-yellow-300/25"
          style={{ top: '65%', left: '35%' }}
        />
      </motion.div>
    </motion.div>
  );
}

// 太阳组件
function Sun({ isRising }: { isRising: boolean }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2"
      initial={{ y: isRising ? 400 : -100 }}
      animate={{ y: isRising ? -100 : 400 }}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
    >
      <motion.div
        className="relative w-28 h-28"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {/* 太阳光芒 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-gradient-to-t from-orange-400 to-transparent"
            style={{
              width: 4,
              height: 20,
              left: '50%',
              top: '50%',
              transformOrigin: '50% 0',
              transform: `translateX(-50%) translateY(-70px) rotate(${i * 30}deg)`,
            }}
            animate={{ height: [20, 28, 20] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
        {/* 太阳本体 */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #f59e0b 100%)',
            boxShadow: '0 0 80px rgba(251, 191, 36, 0.9), 0 0 120px rgba(245, 158, 11, 0.5)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// 粒子效果
function Particles({ type }: { type: 'night' | 'day' }) {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, []);

  const color = type === 'night' ? 'bg-indigo-400/40' : 'bg-orange-400/40';

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${color}`}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
          }}
          initial={{ y: '110%', opacity: 0 }}
          animate={{
            y: '-10%',
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

// 天黑请闭眼文字动画
function NightText({ dayCount }: { dayCount: number }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: 1 }}
        >
          🌙
        </motion.div>
        <motion.h1
          className="text-4xl font-bold text-white mb-2"
          style={{
            textShadow: '0 0 20px rgba(99, 102, 241, 0.8), 0 0 40px rgba(99, 102, 241, 0.4)',
          }}
        >
          天黑请闭眼
        </motion.h1>
        <motion.p
          className="text-xl text-indigo-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          第 {dayCount + 1} 夜
        </motion.p>
      </motion.div>

      {/* 眨眼动画 */}
      <motion.div
        className="absolute bottom-1/4 flex gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="w-12 h-6 border-4 border-white rounded-full overflow-hidden"
            animate={{ scaleY: [1, 0.1, 1] }}
            transition={{
              duration: 0.3,
              delay: 2 + i * 0.1,
              repeat: 2,
              repeatDelay: 0.5,
            }}
          >
            <div className="w-4 h-4 bg-white rounded-full mx-auto mt-0.5" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 天亮了文字动画
function DayText({ dayCount }: { dayCount: number }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: 1 }}
        >
          ☀️
        </motion.div>
        <motion.h1
          className="text-4xl font-bold text-white mb-2"
          style={{
            textShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(245, 158, 11, 0.4)',
          }}
        >
          天亮了
        </motion.h1>
        <motion.p
          className="text-xl text-orange-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          第 {dayCount} 天
        </motion.p>
      </motion.div>

      {/* 公鸡打鸣动画 */}
      <motion.div
        className="absolute bottom-1/4"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <motion.div
          className="text-5xl"
          animate={{ rotate: [-10, 10, -10] }}
          transition={{
            duration: 0.3,
            repeat: 3,
            repeatDelay: 0.3,
          }}
        >
          🐓
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function PhaseTransition({
  transitionType,
  dayCount,
  onComplete,
}: PhaseTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (transitionType) {
      setIsVisible(true);
      // 动画持续约3.5秒后结束
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [transitionType, onComplete]);

  if (!transitionType) return null;

  const isNightToDay = transitionType === 'night-to-day';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 渐变背景 */}
          <motion.div
            className="absolute inset-0"
            initial={{
              background: isNightToDay
                ? 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'
                : 'linear-gradient(180deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)',
            }}
            animate={{
              background: isNightToDay
                ? [
                    'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                    'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
                    'linear-gradient(180deg, #7c3aed 0%, #c084fc 50%, #f0abfc 100%)',
                    'linear-gradient(180deg, #fce7f3 0%, #fcd34d 50%, #f59e0b 100%)',
                    'linear-gradient(180deg, #fef3c7 0%, #7dd3fc 50%, #38bdf8 100%)',
                  ]
                : [
                    'linear-gradient(180deg, #fef3c7 0%, #7dd3fc 50%, #38bdf8 100%)',
                    'linear-gradient(180deg, #fcd34d 0%, #f97316 50%, #ef4444 100%)',
                    'linear-gradient(180deg, #ef4444 0%, #9333ea 50%, #6366f1 100%)',
                    'linear-gradient(180deg, #4c1d95 0%, #1e1b4b 50%, #0f172a 100%)',
                    'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                  ],
            }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />

          {/* 夜晚星星（白天到夜晚时显示） */}
          {!isNightToDay && <Stars count={40} />}

          {/* 云朵 */}
          <Clouds />

          {/* 太阳/月亮 */}
          {isNightToDay ? (
            <>
              <Moon isRising={false} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <Sun isRising={true} />
              </motion.div>
            </>
          ) : (
            <>
              <Sun isRising={false} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <Moon isRising={true} />
              </motion.div>
            </>
          )}

          {/* 粒子效果 */}
          <Particles type={isNightToDay ? 'day' : 'night'} />

          {/* 文字动画 */}
          {isNightToDay ? (
            <DayText dayCount={dayCount} />
          ) : (
            <NightText dayCount={dayCount} />
          )}

          {/* 底部渐变遮罩 */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: isNightToDay
                ? 'linear-gradient(to top, rgba(56, 189, 248, 0.3), transparent)'
                : 'linear-gradient(to top, rgba(49, 46, 129, 0.5), transparent)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 辅助 hook：检测阶段变化并返回过渡类型
export function usePhaseTransition(currentPhase: GamePhase, prevPhase: GamePhase | null): TransitionType {
  const [transitionType, setTransitionType] = useState<TransitionType>(null);

  useEffect(() => {
    if (!prevPhase || prevPhase === currentPhase) return;

    // 判断是否从白天进入夜晚
    const dayPhases = [
      GamePhase.DAY_ANNOUNCE,
      GamePhase.DAY_DISCUSSION,
      GamePhase.DAY_VOTING,
      GamePhase.DAY_EXECUTION,
      GamePhase.SHERIFF_CAMPAIGN,
      GamePhase.SHERIFF_SPEECH,
      GamePhase.SHERIFF_VOTING,
      GamePhase.LAST_WORDS,
    ];

    const nightPhases = [
      GamePhase.NIGHT,
      GamePhase.NIGHT_CUPID,
      GamePhase.NIGHT_WEREWOLF,
      GamePhase.NIGHT_SEER,
      GamePhase.NIGHT_WITCH,
      GamePhase.NIGHT_GUARD,
    ];

    const wasDayPhase = dayPhases.includes(prevPhase) || prevPhase === GamePhase.DEATH_SKILL;
    const wasNightPhase = nightPhases.includes(prevPhase);
    const isNowNightPhase = nightPhases.includes(currentPhase);
    const isNowDayPhase = currentPhase === GamePhase.DAY_ANNOUNCE;

    // 白天 -> 夜晚
    if (wasDayPhase && isNowNightPhase) {
      setTransitionType('day-to-night');
    }
    // 夜晚 -> 白天（天亮公布）
    else if (wasNightPhase && isNowDayPhase) {
      setTransitionType('night-to-day');
    }

    // 清除过渡状态
    const timer = setTimeout(() => {
      setTransitionType(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentPhase, prevPhase]);

  return transitionType;
}

export default PhaseTransition;
