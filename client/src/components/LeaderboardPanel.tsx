/**
 * LeaderboardPanel Component
 * 排行榜展示组件
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LeaderboardEntry,
  LeaderboardType,
  LEADERBOARD_TYPE_ICONS,
  getLevelTier,
} from '../types/werewolf';

interface LeaderboardPanelProps {
  getLeaderboard: (
    type?: LeaderboardType,
    limit?: number,
    offset?: number
  ) => Promise<{
    leaderboard: LeaderboardEntry[];
    myRank: LeaderboardEntry | null;
    type: string;
    total: number;
  } | null>;
  currentUserId?: string;
  onClose?: () => void;
  showModal?: boolean;
}

// 获取等级称号信息
function getLevelTitle(level: number): { title: string; color: string } {
  const tier = getLevelTier(level);
  return { title: `Lv.${level} ${tier.tier}`, color: tier.color };
}

// 获取排名对应的奖牌图标
function getRankMedal(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
}

// 获取排名背景色
function getRankBgClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-600/30';
    case 2:
      return 'bg-gradient-to-r from-gray-600/40 to-gray-500/20 border-gray-400/30';
    case 3:
      return 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 border-amber-600/30';
    default:
      return 'bg-gray-800/50 border-gray-700/30';
  }
}

// 排行榜类型标签
function LeaderboardTypeTab({
  type,
  isActive,
  onClick,
}: {
  type: LeaderboardType;
  isActive: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span>{LEADERBOARD_TYPE_ICONS[type]}</span>
      <span>{t(`leaderboard.${type}`)}</span>
    </motion.button>
  );
}

// 排行榜条目组件
function LeaderboardEntryRow({
  entry,
  type,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  type: LeaderboardType;
  isCurrentUser: boolean;
  index: number;
}) {
  const { t } = useTranslation();
  const medal = getRankMedal(entry.rank);
  const bgClass = getRankBgClass(entry.rank);
  const levelInfo = getLevelTitle(entry.level);

  // 根据类型显示不同的值
  const displayValue = () => {
    switch (type) {
      case 'level':
        return (
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold" style={{ color: levelInfo.color }}>
              Lv.{entry.level}
            </span>
            <span className="text-xs text-gray-400">{levelInfo.title}</span>
          </div>
        );
      case 'wins':
        return (
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-green-400">{entry.wins}</span>
            <span className="text-xs text-gray-400">{t('leaderboard.entry.winsLabel')}</span>
          </div>
        );
      case 'winRate':
        return (
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-blue-400">
              {entry.winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-400">{entry.totalGames} {t('leaderboard.entry.gamesLabel')}</span>
          </div>
        );
      case 'winStreak':
        return (
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-orange-400">{entry.maxWinStreak}</span>
            <span className="text-xs text-gray-400">{t('leaderboard.entry.streakLabel')}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-4 p-3 rounded-lg border ${bgClass} ${
        isCurrentUser ? 'ring-2 ring-indigo-500/50' : ''
      }`}
    >
      {/* 排名 */}
      <div className="w-12 flex justify-center">
        {medal ? (
          <span className="text-2xl">{medal}</span>
        ) : (
          <span className="text-lg font-bold text-gray-500">#{entry.rank}</span>
        )}
      </div>

      {/* 玩家信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
            {entry.displayName || entry.username}
          </span>
          {isCurrentUser && (
            <span className="px-2 py-0.5 text-xs bg-indigo-600/50 text-indigo-200 rounded-full">
              {t('leaderboard.entry.me')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span style={{ color: levelInfo.color }}>Lv.{entry.level}</span>
          <span>•</span>
          <span>{t('leaderboard.entry.winsGames', { wins: entry.wins, games: entry.totalGames })}</span>
          <span>•</span>
          <span>{t('leaderboard.entry.winRatePercent', { rate: entry.winRate.toFixed(0) })}</span>
        </div>
      </div>

      {/* 排名值 */}
      {displayValue()}
    </motion.div>
  );
}

// 我的排名卡片
function MyRankCard({
  entry,
  type,
}: {
  entry: LeaderboardEntry;
  type: LeaderboardType;
}) {
  const { t } = useTranslation();
  const levelInfo = getLevelTitle(entry.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-indigo-300 mb-1">{t('leaderboard.myRank')}</div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">#{entry.rank}</span>
            <div>
              <div className="text-white font-medium">{entry.displayName || entry.username}</div>
              <div className="text-xs text-gray-400">
                <span style={{ color: levelInfo.color }}>Lv.{entry.level} {levelInfo.title}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400 mb-1">{t(`leaderboard.${type}`)}</div>
          {type === 'level' && (
            <div className="text-2xl font-bold" style={{ color: levelInfo.color }}>
              Lv.{entry.level}
            </div>
          )}
          {type === 'wins' && (
            <div className="text-2xl font-bold text-green-400">{entry.wins}</div>
          )}
          {type === 'winRate' && (
            <div className="text-2xl font-bold text-blue-400">{entry.winRate.toFixed(1)}%</div>
          )}
          {type === 'winStreak' && (
            <div className="text-2xl font-bold text-orange-400">{entry.maxWinStreak}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-indigo-500/20">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{entry.totalGames}</div>
          <div className="text-xs text-gray-400">{t('leaderboard.entry.totalGamesLabel')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{entry.wins}</div>
          <div className="text-xs text-gray-400">{t('leaderboard.entry.winsLabel')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{entry.winRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-400">{t('leaderboard.entry.winRateLabel')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">{entry.maxWinStreak}</div>
          <div className="text-xs text-gray-400">{t('leaderboard.entry.maxStreakLabel')}</div>
        </div>
      </div>
    </motion.div>
  );
}

// 加载骨架屏
function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 bg-gray-800/50 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

// 空状态
function EmptyLeaderboard() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="text-6xl mb-4">📊</div>
      <div className="text-xl font-medium text-gray-300 mb-2">{t('leaderboard.empty.title')}</div>
      <div className="text-sm text-gray-500">{t('leaderboard.empty.description')}</div>
    </motion.div>
  );
}

// 主排行榜面板
export function LeaderboardPanel({
  getLeaderboard,
  currentUserId,
  onClose,
  showModal = false,
}: LeaderboardPanelProps) {
  const { t } = useTranslation();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('level');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getLeaderboard(leaderboardType, limit, offset);
      if (result) {
        setEntries(result.leaderboard);
        setMyRank(result.myRank);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getLeaderboard, leaderboardType, offset]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleTypeChange = (type: LeaderboardType) => {
    setLeaderboardType(type);
    setOffset(0);
  };

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* 类型选择标签 */}
      <div className="flex flex-wrap gap-2">
        {(['level', 'wins', 'winRate', 'winStreak'] as LeaderboardType[]).map((type) => (
          <LeaderboardTypeTab
            key={type}
            type={type}
            isActive={leaderboardType === type}
            onClick={() => handleTypeChange(type)}
          />
        ))}
      </div>

      {/* 类型描述 */}
      <div className="text-sm text-gray-400 px-1">
        {t(`leaderboard.descriptions.${leaderboardType}`)}
      </div>

      {/* 我的排名 */}
      {myRank && !isLoading && (
        <MyRankCard entry={myRank} type={leaderboardType} />
      )}

      {/* 排行榜列表 */}
      <div className="space-y-2">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : entries.length === 0 ? (
          <EmptyLeaderboard />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${leaderboardType}-${offset}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {entries.map((entry, index) => (
                <LeaderboardEntryRow
                  key={entry.userId}
                  entry={entry}
                  type={leaderboardType}
                  isCurrentUser={entry.userId === currentUserId}
                  index={index}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 分页控制 */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              offset === 0
                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {t('leaderboard.pagination.prev')}
          </button>
          <span className="text-sm text-gray-400">
            {offset + 1}-{Math.min(offset + limit, total)} / {total}
          </span>
          <button
            onClick={handleNextPage}
            disabled={offset + limit >= total}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              offset + limit >= total
                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {t('leaderboard.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );

  if (!showModal) {
    return content;
  }

  // 模态框模式
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <h2 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {content}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 排行榜按钮组件
export function LeaderboardButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600/80 to-orange-600/80 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-medium shadow-lg transition-all ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-lg">🏆</span>
      <span>{t('leaderboard.title')}</span>
    </motion.button>
  );
}

// 紧凑排行榜展示（用于侧边栏等）
export function CompactLeaderboard({
  getLeaderboard,
  currentUserId,
  onViewAll,
}: {
  getLeaderboard: LeaderboardPanelProps['getLeaderboard'];
  currentUserId?: string;
  onViewAll?: () => void;
}) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await getLeaderboard('level', 5, 0);
        if (result) {
          setEntries(result.leaderboard);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [getLeaderboard]);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-24 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-700/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-medium text-white">{t('leaderboard.compact.levelRanking')}</span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t('leaderboard.compact.viewAll')}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const levelInfo = getLevelTitle(entry.level);
          const isCurrentUser = entry.userId === currentUserId;

          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isCurrentUser ? 'bg-indigo-900/30 border border-indigo-500/30' : 'bg-gray-700/30'
              }`}
            >
              <span className="w-6 text-center">
                {getRankMedal(entry.rank) || <span className="text-gray-500">#{entry.rank}</span>}
              </span>
              <span className={`flex-1 truncate ${isCurrentUser ? 'text-indigo-300' : 'text-gray-300'}`}>
                {entry.displayName || entry.username}
              </span>
              <span className="text-sm font-medium" style={{ color: levelInfo.color }}>
                Lv.{entry.level}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeaderboardPanel;
