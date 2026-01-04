/**
 * AchievementPanel Component
 * 成就系统展示面板
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AchievementCategory,
  AchievementRarity,
  AchievementDefinition,
  AchievementProgress,
  UserAchievements,
  ACHIEVEMENT_RARITY_COLORS,
} from '../types/werewolf';

// 分类到翻译键的映射
const CATEGORY_TRANSLATION_KEYS: Record<AchievementCategory, string> = {
  [AchievementCategory.BEGINNER]: 'beginner',
  [AchievementCategory.GAMES]: 'games',
  [AchievementCategory.WINS]: 'wins',
  [AchievementCategory.STREAK]: 'streak',
  [AchievementCategory.ROLE_MASTER]: 'roleMaster',
  [AchievementCategory.SKILL]: 'skill',
  [AchievementCategory.SHERIFF]: 'sheriff',
  [AchievementCategory.SPECIAL]: 'special',
  [AchievementCategory.SURVIVAL]: 'survival',
  [AchievementCategory.LEVEL]: 'level',
  [AchievementCategory.SOCIAL]: 'social',
};

// 稀有度到翻译键的映射
const RARITY_TRANSLATION_KEYS: Record<AchievementRarity, string> = {
  [AchievementRarity.COMMON]: 'common',
  [AchievementRarity.UNCOMMON]: 'uncommon',
  [AchievementRarity.RARE]: 'rare',
  [AchievementRarity.EPIC]: 'epic',
  [AchievementRarity.LEGENDARY]: 'legendary',
};

// ============================================================================
// Achievement Card Component
// ============================================================================

interface AchievementCardProps {
  definition: AchievementDefinition;
  progress: AchievementProgress;
  size?: 'sm' | 'md' | 'lg';
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  definition,
  progress,
  size = 'md',
}) => {
  const { t, i18n } = useTranslation();
  const isCompleted = progress.completed;
  const rarityColor = ACHIEVEMENT_RARITY_COLORS[definition.rarity];
  const rarityKey = RARITY_TRANSLATION_KEYS[definition.rarity];
  const rarityName = t(`achievements.rarity.${rarityKey}`);

  const sizeClasses = {
    sm: 'p-2 gap-2',
    md: 'p-3 gap-3',
    lg: 'p-4 gap-4',
  };

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const progressPercent = Math.min((progress.current / progress.required) * 100, 100);

  return (
    <motion.div
      className={`relative rounded-lg border ${sizeClasses[size]} ${
        isCompleted
          ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-opacity-50'
          : 'bg-gray-900/50 border-gray-700/50'
      }`}
      style={{
        borderColor: isCompleted ? rarityColor : undefined,
        boxShadow: isCompleted ? `0 0 20px ${rarityColor}20` : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Rarity indicator */}
      <div
        className="absolute top-0 right-0 px-2 py-0.5 text-xs rounded-bl-lg rounded-tr-lg"
        style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
      >
        {rarityName}
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`${iconSizes[size]} ${isCompleted ? '' : 'grayscale opacity-50'}`}
        >
          {definition.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
            {definition.name}
          </h4>
          <p className="text-sm text-gray-500 line-clamp-2">{definition.description}</p>

          {/* Progress bar */}
          {!isCompleted && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('achievements.progress')}</span>
                <span>
                  {progress.current} / {progress.required}
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: rarityColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Completed info */}
          {isCompleted && progress.unlockedAt && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-400">{t('achievements.unlocked')}</span>
              <span className="text-gray-500">
                {new Date(progress.unlockedAt).toLocaleDateString(
                  i18n.language === 'zh' ? 'zh-CN' : 'en-US'
                )}
              </span>
              <span className="text-yellow-400">+{definition.xpReward} XP</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Category Tab Component
// ============================================================================

interface CategoryTabProps {
  category: AchievementCategory;
  isActive: boolean;
  count: { unlocked: number; total: number };
  onClick: () => void;
}

const CategoryTab: React.FC<CategoryTabProps> = ({
  category,
  isActive,
  count,
  onClick,
}) => {
  const { t } = useTranslation();
  const categoryIcons: Record<AchievementCategory, string> = {
    [AchievementCategory.BEGINNER]: '🌟',
    [AchievementCategory.GAMES]: '🎮',
    [AchievementCategory.WINS]: '🏆',
    [AchievementCategory.STREAK]: '🔥',
    [AchievementCategory.ROLE_MASTER]: '👑',
    [AchievementCategory.SKILL]: '✨',
    [AchievementCategory.SHERIFF]: '🎖️',
    [AchievementCategory.SPECIAL]: '💎',
    [AchievementCategory.SURVIVAL]: '💪',
    [AchievementCategory.LEVEL]: '📈',
    [AchievementCategory.SOCIAL]: '🤝',
  };
  const categoryKey = CATEGORY_TRANSLATION_KEYS[category];
  const categoryName = t(`achievements.categories.${categoryKey}`);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
        isActive
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <span>{categoryIcons[category]}</span>
      <span className="text-sm">{categoryName}</span>
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${
          isActive ? 'bg-purple-500' : 'bg-gray-700'
        }`}
      >
        {count.unlocked}/{count.total}
      </span>
    </button>
  );
};

// ============================================================================
// Achievement Stats Component
// ============================================================================

interface AchievementStatsProps {
  totalUnlocked: number;
  totalAchievements: number;
  totalXP: number;
}

const AchievementStats: React.FC<AchievementStatsProps> = ({
  totalUnlocked,
  totalAchievements,
  totalXP,
}) => {
  const { t } = useTranslation();
  const completionPercent = Math.round((totalUnlocked / totalAchievements) * 100);

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/20">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-white">{totalUnlocked}</div>
          <div className="text-xs text-gray-400">{t('achievements.unlocked')}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-400">{completionPercent}%</div>
          <div className="text-xs text-gray-400">{t('achievements.completion')}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-400">+{totalXP}</div>
          <div className="text-xs text-gray-400">{t('achievements.xpReward')}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Achievement Panel Component
// ============================================================================

interface AchievementPanelProps {
  achievements: UserAchievements;
  totalAchievements: number;
  unlockedAchievements: number;
  byCategory: Record<
    string,
    Array<{ definition: AchievementDefinition; progress: AchievementProgress }>
  >;
}

export const AchievementPanel: React.FC<AchievementPanelProps> = ({
  achievements,
  totalAchievements,
  unlockedAchievements,
  byCategory,
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>(
    AchievementCategory.BEGINNER
  );

  // Calculate counts for each category
  const categoryCounts = Object.entries(byCategory).reduce(
    (acc, [category, items]) => {
      acc[category as AchievementCategory] = {
        unlocked: items.filter((i) => i.progress.completed).length,
        total: items.length,
      };
      return acc;
    },
    {} as Record<AchievementCategory, { unlocked: number; total: number }>
  );

  // Get all available categories
  const availableCategories = Object.keys(byCategory) as AchievementCategory[];

  // Current category items
  const currentItems = byCategory[activeCategory] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <AchievementStats
        totalUnlocked={unlockedAchievements}
        totalAchievements={totalAchievements}
        totalXP={achievements.totalXPFromAchievements}
      />

      {/* Category tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
        {availableCategories.map((category) => (
          <CategoryTab
            key={category}
            category={category}
            isActive={activeCategory === category}
            count={categoryCounts[category] || { unlocked: 0, total: 0 }}
            onClick={() => setActiveCategory(category)}
          />
        ))}
      </div>

      {/* Achievement grid */}
      <div className="mt-4 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {currentItems.map((item) => (
              <AchievementCard
                key={item.definition.id}
                definition={item.definition}
                progress={item.progress}
              />
            ))}
            {currentItems.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                {t('achievements.noAchievements')}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================================
// Achievement Modal Component
// ============================================================================

interface AchievementData {
  achievements: UserAchievements;
  totalAchievements: number;
  unlockedAchievements: number;
  byCategory: Record<
    string,
    Array<{ definition: AchievementDefinition; progress: AchievementProgress }>
  >;
  definitions: Record<string, AchievementDefinition>;
}

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievementData: AchievementData | null;
  isLoading?: boolean;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  onClose,
  achievementData,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const achievements = achievementData?.achievements ?? null;
  const totalAchievements = achievementData?.totalAchievements ?? 0;
  const unlockedAchievements = achievementData?.unlockedAchievements ?? 0;
  const byCategory = achievementData?.byCategory ?? {};
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] m-4 flex flex-col border border-purple-500/30"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏆</span>
            <span>{t('achievements.title')}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : achievements ? (
            <AchievementPanel
              achievements={achievements}
              totalAchievements={totalAchievements}
              unlockedAchievements={unlockedAchievements}
              byCategory={byCategory}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {t('achievements.loadError')}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// Achievement Button Component
// ============================================================================

interface AchievementButtonProps {
  onClick: () => void;
  unlockedCount?: number;
  totalCount?: number;
}

export const AchievementButton: React.FC<AchievementButtonProps> = ({
  onClick,
  unlockedCount = 0,
  totalCount = 0,
}) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white transition-all shadow-lg hover:shadow-purple-500/25"
    >
      <span>🏆</span>
      <span className="text-sm font-medium">{t('achievements.title')}</span>
      {totalCount > 0 && (
        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
          {unlockedCount}/{totalCount}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// Achievement Unlock Notification Component
// ============================================================================

interface AchievementUnlockNotificationProps {
  achievement: AchievementDefinition;
  onClose: () => void;
}

export const AchievementUnlockNotification: React.FC<
  AchievementUnlockNotificationProps
> = ({ achievement, onClose }) => {
  const { t } = useTranslation();
  const rarityColor = ACHIEVEMENT_RARITY_COLORS[achievement.rarity];

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="fixed top-4 right-4 z-50 bg-gray-900 rounded-xl shadow-2xl p-4 border-2 max-w-sm"
      style={{ borderColor: rarityColor }}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
    >
      <div className="flex items-center gap-3">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-xl opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${rarityColor}40 0%, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <div className="text-4xl relative z-10">{achievement.icon}</div>

        {/* Content */}
        <div className="relative z-10">
          <div className="text-xs text-yellow-400 font-bold">{t('achievements.achievementUnlocked')}</div>
          <div className="text-white font-bold">{achievement.name}</div>
          <div className="text-xs text-gray-400">{achievement.description}</div>
          <div className="text-xs text-yellow-400 mt-1">
            +{achievement.xpReward} XP
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-white"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Compact Achievement Display
// ============================================================================

interface CompactAchievementDisplayProps {
  unlockedCount: number;
  totalCount: number;
  recentAchievement?: AchievementDefinition;
}

export const CompactAchievementDisplay: React.FC<CompactAchievementDisplayProps> = ({
  unlockedCount,
  totalCount,
  recentAchievement,
}) => {
  const { t } = useTranslation();
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="text-2xl">🏆</div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{t('achievements.achievementProgress')}</span>
          <span className="text-white">
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {recentAchievement && (
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <span>{t('achievements.recentUnlock')}:</span>
            <span className="text-purple-400">{recentAchievement.icon}</span>
            <span className="text-white">{recentAchievement.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementPanel;
