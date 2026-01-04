/**
 * UserStats Component
 * 用户统计数据展示组件
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserStats as UserStatsType, LevelInfo } from '../types/werewolf';
import { LevelCard, WinStreakBadge } from './LevelDisplay';

// 角色图标映射
const ROLE_ICONS: Record<string, string> = {
  villager: '👨‍🌾',
  werewolf: '🐺',
  seer: '🔮',
  witch: '🧪',
  hunter: '🔫',
  guard: '🛡️',
  idiot: '🤡',
  alpha_wolf: '👑',
  cupid: '💘',
};

// 角色键名到翻译键的映射
const ROLE_TRANSLATION_KEYS: Record<string, string> = {
  villager: 'roles.villager.name',
  werewolf: 'roles.werewolf.name',
  seer: 'roles.seer.name',
  witch: 'roles.witch.name',
  hunter: 'roles.hunter.name',
  guard: 'roles.guard.name',
  idiot: 'roles.idiot.name',
  alpha_wolf: 'roles.alphaWolf.name',
  cupid: 'roles.cupid.name',
};

interface UserStatsProps {
  stats: UserStatsType | null;
  isLoading?: boolean;
  onClose?: () => void;
  showModal?: boolean;
  compact?: boolean;
}

// 进度条组件
function ProgressBar({ value, max, color = 'bg-blue-500', showLabel = true }: {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{value}</span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}

// 统计卡片组件
function StatCard({ icon, label, value, subValue, color = 'text-white' }: {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}) {
  return (
    <motion.div
      className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-gray-500">{subValue}</div>
      )}
    </motion.div>
  );
}

// 角色统计组件
function RoleStatItem({ role, played, wins }: {
  role: string;
  played: number;
  wins: number;
}) {
  const { t } = useTranslation();
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const roleName = ROLE_TRANSLATION_KEYS[role] ? t(ROLE_TRANSLATION_KEYS[role]) : role;

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg">
      <span className="text-xl w-8">{ROLE_ICONS[role] || '❓'}</span>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-300">{roleName}</span>
          <span className="text-xs text-gray-500">{played}{t('stats.games')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-gray-400 w-10 text-right">{winRate}%</span>
        </div>
      </div>
    </div>
  );
}

// 紧凑模式统计展示
export function CompactStats({ stats }: { stats: UserStatsType | null }) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span>{t('stats.noStats')}</span>
      </div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-4 text-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-1">
        <span className="text-gray-400">{t('stats.totalGames')}:</span>
        <span className="text-white font-bold">{stats.totalGames}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-400">{t('stats.winRate')}:</span>
        <span className={`font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
          {stats.winRate}%
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-400">{t('stats.wins')}/{t('stats.losses')}:</span>
        <span className="text-green-400">{stats.wins}</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{stats.losses}</span>
      </div>
    </motion.div>
  );
}

// 统计面板组件
export function StatsPanel({ stats, isLoading, levelInfo }: {
  stats: UserStatsType | null;
  isLoading?: boolean;
  levelInfo?: LevelInfo | null;
}) {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <span className="text-4xl mb-2">🎮</span>
        <span>{t('stats.noGames')}</span>
        <span className="text-sm">{t('stats.startPlaying')}</span>
      </div>
    );
  }

  // Sort role stats by games played
  const sortedRoleStats = Object.entries(stats.roleStats || {})
    .sort(([, a], [, b]) => b.played - a.played);

  // Create level info from stats if not provided
  const displayLevelInfo: LevelInfo = levelInfo || {
    level: stats.level || 1,
    title: '初入狼村',
    titleColor: '#9CA3AF',
    currentXP: stats.currentXP || 0,
    requiredXP: 100,
    totalXP: stats.totalXP || 0,
    progress: 0,
  };

  // Date format based on locale
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <div className="space-y-4">
      {/* 等级信息 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <span>⭐</span>
          <span>{t('stats.levelInfo')}</span>
        </h3>
        <LevelCard levelInfo={displayLevelInfo} showProgress showXPBreakdown={false} />
        {/* 连胜显示 */}
        {(stats.winStreak || 0) >= 2 && (
          <div className="mt-2 flex items-center gap-2">
            <WinStreakBadge streak={stats.winStreak || 0} maxStreak={stats.maxWinStreak} />
            {stats.maxWinStreak && stats.maxWinStreak > 2 && (
              <span className="text-xs text-gray-500">{t('stats.maxWinStreak')}: {stats.maxWinStreak}</span>
            )}
          </div>
        )}
      </div>

      {/* 总体统计 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <span>📊</span>
          <span>{t('stats.overallStats')}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            icon="🎮"
            label={t('stats.totalGames')}
            value={stats.totalGames}
          />
          <StatCard
            icon="🏆"
            label={t('stats.winRate')}
            value={`${stats.winRate}%`}
            subValue={t('stats.winsCount', { wins: stats.wins, losses: stats.losses })}
            color={stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            icon="💀"
            label={t('stats.survivalRate')}
            value={`${stats.survivalRate || 0}%`}
            color={(stats.survivalRate || 0) >= 50 ? 'text-blue-400' : 'text-gray-400'}
          />
          <StatCard
            icon="👑"
            label={t('stats.sheriffGames')}
            value={stats.gamesAsSheriff}
            subValue={stats.gamesAsSheriff > 0 ? t('stats.sheriffWinRate', { rate: Math.round((stats.sheriffWins / stats.gamesAsSheriff) * 100) }) : t('stats.neverElected')}
          />
        </div>
      </div>

      {/* 阵营统计 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <span>⚔️</span>
          <span>{t('stats.byFaction')}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">👨‍🌾 {t('stats.villagerFaction')}</span>
              <span className="text-xs text-gray-500">{stats.villagerGames}{t('stats.games')}</span>
            </div>
            <ProgressBar
              value={stats.villagerWins}
              max={stats.villagerGames}
              color="bg-green-500"
            />
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">🐺 {t('stats.werewolfFaction')}</span>
              <span className="text-xs text-gray-500">{stats.werewolfGames}{t('stats.games')}</span>
            </div>
            <ProgressBar
              value={stats.werewolfWins}
              max={stats.werewolfGames}
              color="bg-red-500"
            />
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">💕 {t('stats.loversFaction')}</span>
              <span className="text-xs text-gray-500">{stats.loversGames}{t('stats.games')}</span>
            </div>
            <ProgressBar
              value={stats.loversWins}
              max={stats.loversGames}
              color="bg-pink-500"
            />
          </div>
        </div>
      </div>

      {/* 角色统计 */}
      {sortedRoleStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <span>🎭</span>
            <span>{t('stats.byRole')}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {sortedRoleStats.map(([role, stat]) => (
              <RoleStatItem
                key={role}
                role={role}
                played={stat.played}
                wins={stat.wins}
              />
            ))}
          </div>
        </div>
      )}

      {/* 时间信息 */}
      {stats.firstGameAt > 0 && (
        <div className="text-xs text-gray-500 text-center border-t border-gray-700 pt-2">
          {t('stats.firstGame')}: {new Date(stats.firstGameAt).toLocaleDateString(dateLocale)}
          {' · '}
          {t('stats.lastGame')}: {new Date(stats.lastGameAt).toLocaleDateString(dateLocale)}
        </div>
      )}
    </div>
  );
}

// 统计弹窗组件
export function StatsModal({ stats, isLoading, onClose, levelInfo }: {
  stats: UserStatsType | null;
  isLoading?: boolean;
  onClose: () => void;
  levelInfo?: LevelInfo | null;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />

        {/* 弹窗内容 */}
        <motion.div
          className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* 标题 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>{t('stats.myStats')}</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 内容 */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <StatsPanel stats={stats} isLoading={isLoading} levelInfo={levelInfo} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 统计按钮组件（用于触发弹窗）
export function StatsButton({ onClick, hasStats }: { onClick: () => void; hasStats: boolean }) {
  const { t } = useTranslation();

  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
        ${hasStats
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
          : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-700'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span>📊</span>
      <span className="text-sm">{t('stats.myStats')}</span>
    </motion.button>
  );
}

// 主组件
export function UserStats({ stats, isLoading, onClose, showModal = false, compact = false }: UserStatsProps) {
  if (compact) {
    return <CompactStats stats={stats} />;
  }

  if (showModal && onClose) {
    return <StatsModal stats={stats} isLoading={isLoading} onClose={onClose} />;
  }

  return <StatsPanel stats={stats} isLoading={isLoading} />;
}

export default UserStats;
