/**
 * DeathEffect 组件
 * 玩家死亡时的视觉特效系统
 * 包含：灵魂飘散、屏幕闪烁、死亡公告、头像过渡动画
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Role } from '../types/werewolf';
import { ROLE_INFO, Faction } from '../types/werewolf';

// 死因类型
export type DeathCause = 'wolf' | 'poison' | 'vote' | 'hunter' | 'alpha_wolf' | 'lover';

// 死亡事件
export interface DeathEvent {
  playerId: string;
  playerName: string;
  seatNumber: number;
  role?: Role;
  cause: DeathCause;
  position: { x: number; y: number }; // 玩家座位位置（百分比）
  timestamp: number;
}

// 死因配置
const DEATH_CAUSE_CONFIG: Record<DeathCause, {
  color: string;
  icon: string;
  text: string;
  flashColor: string;
  particleColor: string;
}> = {
  wolf: {
    color: 'text-red-500',
    icon: '🐺',
    text: '被狼人击杀',
    flashColor: 'rgba(220, 38, 38, 0.3)',
    particleColor: '#ef4444',
  },
  poison: {
    color: 'text-purple-500',
    icon: '☠️',
    text: '被女巫毒死',
    flashColor: 'rgba(147, 51, 234, 0.3)',
    particleColor: '#a855f7',
  },
  vote: {
    color: 'text-yellow-500',
    icon: '⚖️',
    text: '被投票处决',
    flashColor: 'rgba(234, 179, 8, 0.3)',
    particleColor: '#eab308',
  },
  hunter: {
    color: 'text-orange-500',
    icon: '🏹',
    text: '被猎人开枪击杀',
    flashColor: 'rgba(249, 115, 22, 0.3)',
    particleColor: '#f97316',
  },
  alpha_wolf: {
    color: 'text-red-700',
    icon: '👹',
    text: '被狼王带走',
    flashColor: 'rgba(185, 28, 28, 0.3)',
    particleColor: '#b91c1c',
  },
  lover: {
    color: 'text-pink-500',
    icon: '💔',
    text: '殉情而亡',
    flashColor: 'rgba(236, 72, 153, 0.3)',
    particleColor: '#ec4899',
  },
};

// 角色图标
const ROLE_ICONS: Record<Role, string> = {
  villager: '👨‍🌾',
  werewolf: '🐺',
  seer: '🔮',
  witch: '🧙‍♀️',
  hunter: '🏹',
  guard: '🛡️',
  idiot: '🤡',
  alpha_wolf: '👹',
  cupid: '💘',
  lover: '💕',
};

// ============================================================
// SoulParticle 组件 - 单个灵魂粒子
// ============================================================
interface SoulParticleProps {
  startX: number;
  startY: number;
  delay: number;
  color: string;
  size: 'small' | 'medium' | 'large';
}

function SoulParticle({ startX, startY, delay, color, size }: SoulParticleProps) {
  const sizeMap = { small: 4, medium: 8, large: 12 };
  const particleSize = sizeMap[size];

  // 随机方向和距离
  const angle = Math.random() * Math.PI * 2;
  const distance = 50 + Math.random() * 100;
  const endX = startX + Math.cos(angle) * distance;
  const endY = startY - distance * 0.8 - Math.random() * 50; // 主要向上飘

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: particleSize,
        height: particleSize,
        backgroundColor: color,
        left: `${startX}%`,
        top: `${startY}%`,
        boxShadow: `0 0 ${particleSize}px ${color}`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        x: [0, (endX - startX) * 3],
        y: [0, (endY - startY) * 3],
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 0.8, 0],
      }}
      transition={{
        duration: 2 + Math.random(),
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

// ============================================================
// SoulParticles 组件 - 灵魂粒子群
// ============================================================
interface SoulParticlesProps {
  position: { x: number; y: number };
  color: string;
  count?: number;
}

function SoulParticles({ position, color, count = 20 }: SoulParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      size: (['small', 'medium', 'large'] as const)[Math.floor(Math.random() * 3)],
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <SoulParticle
          key={particle.id}
          startX={position.x}
          startY={position.y}
          delay={particle.delay}
          color={color}
          size={particle.size}
        />
      ))}
    </div>
  );
}

// ============================================================
// DeathFlash 组件 - 屏幕闪烁效果
// ============================================================
interface DeathFlashProps {
  color: string;
  onComplete: () => void;
}

function DeathFlash({ color, onComplete }: DeathFlashProps) {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-40"
      style={{ backgroundColor: color }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.8, 0.4, 0.6, 0],
      }}
      transition={{
        duration: 0.6,
        times: [0, 0.1, 0.3, 0.5, 1],
        ease: 'easeOut',
      }}
      onAnimationComplete={onComplete}
    />
  );
}

// ============================================================
// SkullExplosion 组件 - 骷髅爆炸效果
// ============================================================
interface SkullExplosionProps {
  position: { x: number; y: number };
}

function SkullExplosion({ position }: SkullExplosionProps) {
  const skulls = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      return {
        id: i,
        angle,
        distance: 40 + Math.random() * 30,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {skulls.map((skull) => (
        <motion.div
          key={skull.id}
          className="absolute text-2xl"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            x: Math.cos(skull.angle) * skull.distance,
            y: Math.sin(skull.angle) * skull.distance - 20,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 0.8, 0],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 1.2,
            ease: 'easeOut',
          }}
        >
          💀
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// HeartBreak 组件 - 心碎效果（殉情专用）
// ============================================================
interface HeartBreakProps {
  position: { x: number; y: number };
}

function HeartBreak({ position }: HeartBreakProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 左半心 */}
      <motion.div
        className="absolute text-5xl"
        style={{ filter: 'drop-shadow(0 0 10px #ec4899)' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0, 1.5, 1.2, 0],
          x: [-10, -40],
          y: [0, 30],
          rotate: [-30],
        }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        💔
      </motion.div>

      {/* 碎片 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: (Math.random() - 0.5) * 100,
            y: -30 - Math.random() * 50,
          }}
          transition={{
            duration: 1,
            delay: 0.2 + i * 0.1,
            ease: 'easeOut',
          }}
        >
          ❤️
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================
// BloodSplatter 组件 - 血迹飞溅效果（狼人击杀）
// ============================================================
interface BloodSplatterProps {
  position: { x: number; y: number };
}

function BloodSplatter({ position }: BloodSplatterProps) {
  const splatters = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      angle: Math.random() * Math.PI * 2,
      distance: 20 + Math.random() * 60,
      size: 5 + Math.random() * 15,
      delay: Math.random() * 0.3,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {splatters.map((splatter) => (
        <motion.div
          key={splatter.id}
          className="absolute rounded-full bg-red-600"
          style={{
            width: splatter.size,
            height: splatter.size,
            left: `${position.x}%`,
            top: `${position.y}%`,
            boxShadow: '0 0 4px rgba(220, 38, 38, 0.8)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            x: Math.cos(splatter.angle) * splatter.distance,
            y: Math.sin(splatter.angle) * splatter.distance,
            opacity: [0, 0.8, 0.6, 0],
            scale: [0, 1, 1.2, 0],
          }}
          transition={{
            duration: 0.8,
            delay: splatter.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// PoisonMist 组件 - 毒雾效果（女巫毒杀）
// ============================================================
interface PoisonMistProps {
  position: { x: number; y: number };
}

function PoisonMist({ position }: PoisonMistProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 毒雾圆环 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-4 border-purple-500"
          style={{
            width: 20,
            height: 20,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 3, 4],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* 毒气泡 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`bubble-${i}`}
          className="absolute text-lg"
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [-10, -50 - Math.random() * 30],
            x: (Math.random() - 0.5) * 40,
          }}
          transition={{
            duration: 1.2,
            delay: 0.1 + i * 0.1,
            ease: 'easeOut',
          }}
        >
          {i % 2 === 0 ? '☠️' : '💀'}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================
// GavelStrike 组件 - 法槌敲击效果（投票处决）
// ============================================================
interface GavelStrikeProps {
  position: { x: number; y: number };
}

function GavelStrike({ position }: GavelStrikeProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 法槌 */}
      <motion.div
        className="absolute text-5xl"
        style={{
          filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))',
        }}
        initial={{ y: -50, rotate: 45, opacity: 0 }}
        animate={{
          y: [null, 0],
          rotate: [45, -15, 0],
          opacity: [0, 1, 1],
          scale: [1.5, 1, 1.2],
        }}
        transition={{
          duration: 0.5,
          times: [0, 0.5, 1],
          ease: 'easeIn',
        }}
      >
        ⚖️
      </motion.div>

      {/* 冲击波 */}
      <motion.div
        className="absolute w-8 h-8 border-4 border-yellow-500 rounded-full"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 3, 4],
        }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: 'easeOut',
        }}
      />
    </motion.div>
  );
}

// ============================================================
// BulletImpact 组件 - 子弹冲击效果（猎人/狼王开枪）
// ============================================================
interface BulletImpactProps {
  position: { x: number; y: number };
  isAlphaWolf?: boolean;
}

function BulletImpact({ position, isAlphaWolf }: BulletImpactProps) {
  const color = isAlphaWolf ? '#b91c1c' : '#f97316';
  const icon = isAlphaWolf ? '👹' : '🏹';

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 子弹轨迹 */}
      <motion.div
        className="absolute h-1 rounded-full"
        style={{
          width: 100,
          backgroundColor: color,
          left: -150,
          top: '50%',
          boxShadow: `0 0 10px ${color}`,
        }}
        initial={{ opacity: 0, scaleX: 0, x: 0 }}
        animate={{
          opacity: [0, 1, 0],
          scaleX: [0, 1, 0.5],
          x: [0, 100, 150],
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* 冲击点 */}
      <motion.div
        className="absolute text-4xl"
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0],
        }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          ease: 'easeOut',
        }}
      >
        {icon}
      </motion.div>

      {/* 碎片飞溅 */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI - Math.PI / 2;
        const distance = 30 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 4px ${color}`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 0.5,
              delay: 0.2 + i * 0.02,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </motion.div>
  );
}

// ============================================================
// DeathBanner 组件 - 死亡公告横幅
// ============================================================
interface DeathBannerProps {
  event: DeathEvent;
  showRole?: boolean;
  onComplete: () => void;
}

function DeathBanner({ event, showRole = true, onComplete }: DeathBannerProps) {
  const config = DEATH_CAUSE_CONFIG[event.cause];
  const roleInfo = event.role ? ROLE_INFO[event.role] : null;
  const roleIcon = event.role ? ROLE_ICONS[event.role] : '👤';

  // 阵营颜色
  const factionColor = roleInfo
    ? roleInfo.faction === Faction.WEREWOLF
      ? 'text-red-400'
      : roleInfo.faction === Faction.VILLAGER
        ? 'text-green-400'
        : 'text-purple-400'
    : 'text-gray-400';

  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="relative">
        {/* 背景 */}
        <motion.div
          className="absolute inset-0 bg-gray-900/90 rounded-xl blur-sm"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* 内容 */}
        <div className="relative px-8 py-4 rounded-xl border-2 border-gray-700
                        bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95">
          {/* 装饰线 */}
          <motion.div
            className={`absolute top-0 left-0 h-1 rounded-t-xl ${config.color.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.5 }}
          />

          <div className="flex items-center gap-4">
            {/* 死因图标 */}
            <motion.span
              className="text-4xl"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
              }}
            >
              {config.icon}
            </motion.span>

            {/* 玩家信息 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">#{event.seatNumber}</span>
                <span className="text-xl font-bold text-white">{event.playerName}</span>
                {showRole && event.role && (
                  <span className={`${factionColor}`}>
                    {roleIcon} {roleInfo?.name}
                  </span>
                )}
              </div>
              <span className={`${config.color} font-medium`}>
                {config.text}
              </span>
            </div>

            {/* 骷髅装饰 */}
            <motion.span
              className="text-3xl ml-4"
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              💀
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// PlayerDeathMask 组件 - 玩家座位死亡遮罩效果
// ============================================================
interface PlayerDeathMaskProps {
  position: { x: number; y: number };
  cause: DeathCause;
}

function PlayerDeathMask({ position, cause }: PlayerDeathMaskProps) {
  const config = DEATH_CAUSE_CONFIG[cause];

  return (
    <motion.div
      className="absolute w-24 h-28 pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 死亡光环 */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(circle, ${config.particleColor}40 0%, transparent 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0, 1, 0.6],
          scale: [0.5, 1.5, 1.2],
        }}
        transition={{ duration: 0.8 }}
      />

      {/* 灰度渐变 */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gray-900/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7] }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />

      {/* 死亡 X 标记 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0, rotate: -90 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: 0,
        }}
        transition={{ duration: 0.5, delay: 0.4, type: 'spring' }}
      >
        <span className="text-5xl text-gray-400 opacity-80">✖</span>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// DeathEffectOverlay 组件 - 完整死亡特效
// ============================================================
interface DeathEffectOverlayProps {
  event: DeathEvent | null;
  showRole?: boolean;
  onComplete: () => void;
}

export function DeathEffectOverlay({
  event,
  showRole = true,
  onComplete,
}: DeathEffectOverlayProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showMask, setShowMask] = useState(false);

  useEffect(() => {
    if (!event) return;

    // 触发效果序列
    setShowFlash(true);
    setShowParticles(true);

    const bannerTimer = setTimeout(() => setShowBanner(true), 300);
    const maskTimer = setTimeout(() => setShowMask(true), 500);

    return () => {
      clearTimeout(bannerTimer);
      clearTimeout(maskTimer);
    };
  }, [event]);

  const handleFlashComplete = useCallback(() => {
    setShowFlash(false);
  }, []);

  const handleBannerComplete = useCallback(() => {
    setShowBanner(false);
    // 延迟后完成整个特效
    setTimeout(() => {
      setShowParticles(false);
      setShowMask(false);
      onComplete();
    }, 500);
  }, [onComplete]);

  if (!event) return null;

  const config = DEATH_CAUSE_CONFIG[event.cause];

  return (
    <>
      {/* 屏幕闪烁 */}
      <AnimatePresence>
        {showFlash && (
          <DeathFlash color={config.flashColor} onComplete={handleFlashComplete} />
        )}
      </AnimatePresence>

      {/* 死因特效 */}
      <AnimatePresence>
        {showParticles && (
          <>
            {/* 通用灵魂粒子 */}
            <SoulParticles
              position={event.position}
              color={config.particleColor}
              count={25}
            />

            {/* 骷髅爆炸 */}
            <SkullExplosion position={event.position} />

            {/* 死因专属效果 */}
            {event.cause === 'wolf' && <BloodSplatter position={event.position} />}
            {event.cause === 'poison' && <PoisonMist position={event.position} />}
            {event.cause === 'vote' && <GavelStrike position={event.position} />}
            {event.cause === 'hunter' && <BulletImpact position={event.position} />}
            {event.cause === 'alpha_wolf' && (
              <BulletImpact position={event.position} isAlphaWolf />
            )}
            {event.cause === 'lover' && <HeartBreak position={event.position} />}
          </>
        )}
      </AnimatePresence>

      {/* 座位死亡遮罩 */}
      <AnimatePresence>
        {showMask && (
          <PlayerDeathMask position={event.position} cause={event.cause} />
        )}
      </AnimatePresence>

      {/* 死亡公告 */}
      <AnimatePresence>
        {showBanner && (
          <DeathBanner
            event={event}
            showRole={showRole}
            onComplete={handleBannerComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// useDeathEffect Hook - 管理死亡事件状态
// ============================================================
export function useDeathEffect() {
  const [deathEvents, setDeathEvents] = useState<DeathEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<DeathEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 添加死亡事件
  const triggerDeathEffect = useCallback((event: Omit<DeathEvent, 'timestamp'>) => {
    const newEvent: DeathEvent = {
      ...event,
      timestamp: Date.now(),
    };
    setDeathEvents((prev) => [...prev, newEvent]);
  }, []);

  // 批量添加死亡事件（夜晚多人死亡）
  const triggerMultipleDeaths = useCallback(
    (events: Omit<DeathEvent, 'timestamp'>[]) => {
      const newEvents: DeathEvent[] = events.map((event, index) => ({
        ...event,
        timestamp: Date.now() + index * 100, // 稍微错开时间戳
      }));
      setDeathEvents((prev) => [...prev, ...newEvents]);
    },
    []
  );

  // 处理事件队列
  useEffect(() => {
    if (isPlaying || deathEvents.length === 0) return;

    // 取出第一个事件
    const [nextEvent, ...remaining] = deathEvents;
    setCurrentEvent(nextEvent);
    setDeathEvents(remaining);
    setIsPlaying(true);
  }, [deathEvents, isPlaying]);

  // 事件完成回调
  const handleEventComplete = useCallback(() => {
    setCurrentEvent(null);
    setIsPlaying(false);
  }, []);

  // 清除所有事件
  const clearEvents = useCallback(() => {
    setDeathEvents([]);
    setCurrentEvent(null);
    setIsPlaying(false);
  }, []);

  return {
    currentEvent,
    isPlaying,
    triggerDeathEffect,
    triggerMultipleDeaths,
    handleEventComplete,
    clearEvents,
    pendingCount: deathEvents.length,
  };
}

// ============================================================
// 导出便捷组件
// ============================================================

// 小型死亡通知（用于侧边栏或状态栏）
interface DeathNotificationProps {
  event: DeathEvent;
  compact?: boolean;
}

export function DeathNotification({ event, compact = false }: DeathNotificationProps) {
  const config = DEATH_CAUSE_CONFIG[event.cause];

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-2 text-sm"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
      >
        <span>{config.icon}</span>
        <span className="text-gray-400">#{event.seatNumber}</span>
        <span className="text-gray-300">{event.playerName}</span>
        <span className={config.color}>{config.text}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800/80 rounded-lg p-3 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">#{event.seatNumber}</span>
            <span className="font-medium text-white">{event.playerName}</span>
          </div>
          <span className={`text-sm ${config.color}`}>{config.text}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default DeathEffectOverlay;
