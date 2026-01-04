/**
 * LevelDisplay Component
 * 显示用户等级、称号和经验值进度
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LevelInfo, getLevelTier, XP_REWARDS } from '../types/werewolf';

// ============================================================================
// LevelBadge - 等级徽章组件
// ============================================================================

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTitle?: boolean;
  title?: string;
  titleColor?: string;
  animate?: boolean;
}

export function LevelBadge({
  level,
  size = 'md',
  showTitle = false,
  title,
  titleColor,
  animate = false
}: LevelBadgeProps) {
  const tier = getLevelTier(level);
  const color = titleColor || tier.color;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  const BadgeContent = (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold relative`}
      style={{
        background: `linear-gradient(135deg, ${color}33 0%, ${color}66 50%, ${color}33 100%)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 8px ${color}66`,
      }}
    >
      <span style={{ color }}>{level}</span>
      {/* 光效 */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle at 30% 30%, white 0%, transparent 50%)`,
        }}
      />
    </div>
  );

  if (animate) {
    return (
      <motion.div
        className="flex items-center gap-2"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 8px ${color}66`,
              `0 0 16px ${color}aa`,
              `0 0 8px ${color}66`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {BadgeContent}
        </motion.div>
        {showTitle && title && (
          <span className="font-medium" style={{ color }}>{title}</span>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {BadgeContent}
      {showTitle && title && (
        <span className="font-medium" style={{ color }}>{title}</span>
      )}
    </div>
  );
}

// ============================================================================
// LevelProgress - 经验值进度条
// ============================================================================

interface LevelProgressProps {
  currentXP: number;
  requiredXP: number;
  progress: number;
  level: number;
  titleColor?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LevelProgress({
  currentXP,
  requiredXP,
  progress,
  level,
  titleColor,
  showLabels = true,
  size = 'md',
}: LevelProgressProps) {
  const { t } = useTranslation();
  const tier = getLevelTier(level);
  const color = titleColor || tier.color;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const isMaxLevel = level >= 100;

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{isMaxLevel ? t('level.maxLevel') : `${currentXP} ${t('level.xp')}`}</span>
          <span>{isMaxLevel ? '' : `${requiredXP} ${t('level.xp')}`}</span>
        </div>
      )}
      <div
        className={`${heightClasses[size]} bg-gray-700 rounded-full overflow-hidden relative`}
      >
        {/* 进度条 */}
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${isMaxLevel ? 100 : progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* 光效动画 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </div>
      {showLabels && !isMaxLevel && (
        <div className="text-center text-xs text-gray-500 mt-1">
          {progress}% ({t('level.xpToNext', { xp: requiredXP - currentXP })})
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LevelCard - 完整等级卡片
// ============================================================================

interface LevelCardProps {
  levelInfo: LevelInfo;
  showProgress?: boolean;
  showXPBreakdown?: boolean;
  compact?: boolean;
}

export function LevelCard({
  levelInfo,
  showProgress = true,
  showXPBreakdown = false,
  compact = false,
}: LevelCardProps) {
  const { t } = useTranslation();
  const tier = getLevelTier(levelInfo.level);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <LevelBadge
          level={levelInfo.level}
          size="md"
          titleColor={levelInfo.titleColor}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: levelInfo.titleColor }}>
              {levelInfo.title}
            </span>
            <span className="text-xs text-gray-500">{t('level.lvFormat', { level: levelInfo.level })}</span>
          </div>
          {showProgress && (
            <LevelProgress
              {...levelInfo}
              showLabels={false}
              size="sm"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: `linear-gradient(135deg, ${levelInfo.titleColor}11 0%, ${levelInfo.titleColor}22 100%)`,
        border: `1px solid ${levelInfo.titleColor}44`,
      }}
    >
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-4">
        <LevelBadge
          level={levelInfo.level}
          size="xl"
          titleColor={levelInfo.titleColor}
          animate
        />
        <div>
          <div className="text-lg font-bold" style={{ color: levelInfo.titleColor }}>
            {levelInfo.title}
          </div>
          <div className="text-sm text-gray-400">
            {t('level.tierFormat', { tier: tier.tier })} · {t('level.lvFormat', { level: levelInfo.level })}
          </div>
        </div>
      </div>

      {/* 进度条 */}
      {showProgress && (
        <LevelProgress {...levelInfo} size="md" />
      )}

      {/* 经验值详情 */}
      {showXPBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">{t('level.xpRewards')}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.gameCompleted')}</span>
              <span className="text-green-400">+{XP_REWARDS.GAME_COMPLETED}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.gameWon')}</span>
              <span className="text-green-400">+{XP_REWARDS.GAME_WON}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.survived')}</span>
              <span className="text-green-400">+{XP_REWARDS.SURVIVED}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.sheriffElected')}</span>
              <span className="text-green-400">+{XP_REWARDS.SHERIFF_ELECTED}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.firstWinOfDay')}</span>
              <span className="text-yellow-400">+{XP_REWARDS.FIRST_WIN_OF_DAY}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('level.rewards.winStreakBonus')}</span>
              <span className="text-yellow-400">+{XP_REWARDS.WIN_STREAK_3}~{XP_REWARDS.WIN_STREAK_10}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LevelUpAnimation - 升级动画
// ============================================================================

interface LevelUpAnimationProps {
  show: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  titleColor: string;
  onComplete?: () => void;
}

export function LevelUpAnimation({
  show,
  oldLevel,
  newLevel,
  newTitle,
  titleColor,
  onComplete
}: LevelUpAnimationProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={() => {
            setTimeout(() => onComplete?.(), 2000);
          }}
        >
          {/* 背景粒子效果 */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: titleColor,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  y: [0, -100],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>

          {/* 主内容 */}
          <motion.div
            className="text-center relative z-10"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
          >
            {/* 升级文字 */}
            <motion.div
              className="text-4xl font-bold text-yellow-400 mb-4"
              animate={{
                textShadow: [
                  '0 0 10px #FFD700',
                  '0 0 30px #FFD700',
                  '0 0 10px #FFD700',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {t('level.levelUp')}
            </motion.div>

            {/* 等级变化 */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <motion.div
                className="text-3xl text-gray-500"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Lv.{oldLevel}
              </motion.div>
              <motion.div
                className="text-4xl"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                →
              </motion.div>
              <motion.div
                className="text-5xl font-bold"
                style={{ color: titleColor }}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Lv.{newLevel}
              </motion.div>
            </div>

            {/* 新称号 */}
            <motion.div
              className="text-2xl font-medium"
              style={{ color: titleColor }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {newTitle}
            </motion.div>

            {/* 等级徽章 */}
            <motion.div
              className="mt-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
            >
              <LevelBadge
                level={newLevel}
                size="xl"
                titleColor={titleColor}
                animate
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// CompactLevelDisplay - 紧凑等级显示（用于顶部栏）
// ============================================================================

interface CompactLevelDisplayProps {
  level: number;
  title: string;
  titleColor: string;
  progress: number;
  onClick?: () => void;
}

export function CompactLevelDisplay({
  level,
  title,
  titleColor,
  progress,
  onClick
}: CompactLevelDisplayProps) {
  return (
    <motion.button
      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <LevelBadge level={level} size="sm" titleColor={titleColor} />
      <div className="flex flex-col items-start">
        <span className="text-xs font-medium" style={{ color: titleColor }}>
          {title}
        </span>
        <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: titleColor,
            }}
          />
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================================
// WinStreakBadge - 连胜标志
// ============================================================================

interface WinStreakBadgeProps {
  streak: number;
  maxStreak?: number;
}

export function WinStreakBadge({ streak, maxStreak }: WinStreakBadgeProps) {
  const { t } = useTranslation();

  if (streak < 2) return null;

  const color = streak >= 10 ? '#FFD700' : streak >= 5 ? '#FB923C' : '#60A5FA';

  return (
    <motion.div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}`,
        color,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <span>🔥</span>
      <span>{t('level.winStreak', { count: streak })}</span>
      {maxStreak && streak === maxStreak && streak >= 3 && (
        <span className="text-yellow-400">✨</span>
      )}
    </motion.div>
  );
}

export default LevelCard;
