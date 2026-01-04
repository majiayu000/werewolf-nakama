/**
 * Lobby.tsx - 游戏大厅首页组件
 * 包含登录/注册、连接状态、进入游戏入口
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThemeToggleButton } from './ThemeToggle';
import { LanguageButton } from './LanguageSelector';
import { useTheme } from '../hooks/useTheme';
import { StatsModal, StatsButton } from './UserStats';
import { UserStats as UserStatsType, LevelInfo, UserAchievements, AchievementDefinition, AchievementProgress, LeaderboardEntry, LeaderboardType } from '../types/werewolf';
import { AuthPanel, UserInfo, LinkEmailModal } from './AuthPanel';
import { CompactLevelDisplay } from './LevelDisplay';
import { AchievementButton, AchievementModal } from './AchievementPanel';
import { LeaderboardButton, LeaderboardPanel } from './LeaderboardPanel';

// 角色图标装饰组件
function RoleDecorations() {
  const icons = ['🐺', '🔮', '🧪', '🛡️', '🔫', '👨‍🌾', '💘', '👑'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-10"
          initial={{
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
          }}
          animate={{
            y: [
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
              `${Math.random() * 100}%`,
            ],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          {icon}
        </motion.div>
      ))}
    </div>
  );
}

// 月亮装饰
function MoonDecoration() {
  return (
    <div className="absolute top-4 right-4 md:top-8 md:right-8 w-16 h-16 md:w-24 md:h-24 pointer-events-none">
      <motion.div
        className="w-full h-full rounded-full bg-gradient-to-br from-yellow-100 to-yellow-300
                   shadow-[0_0_40px_15px_rgba(253,224,71,0.3)] md:shadow-[0_0_60px_20px_rgba(253,224,71,0.3)]"
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 40px 15px rgba(253,224,71,0.3)',
            '0 0 60px 20px rgba(253,224,71,0.4)',
            '0 0 40px 15px rgba(253,224,71,0.3)',
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      />
    </div>
  );
}

// 星星背景
function StarBackground() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
          animate={{
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: star.delay,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

// 游戏规则简介卡片
function RulesCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <motion.div
      className="mt-8 w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 text-left text-gray-400 hover:text-white transition-colors
                   flex items-center justify-between"
      >
        <span>{t('lobby.gameRules')}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-300">
              <h4 className="font-bold text-white mb-2">{t('lobby.factions.title')}</h4>
              <div className="space-y-2">
                <p><span className="text-red-400">🐺 {t('factions.werewolves')}</span>：{t('lobby.factions.werewolf')}</p>
                <p><span className="text-green-400">👨‍🌾 {t('factions.villagers')}</span>：{t('lobby.factions.villager')}</p>
                <p><span className="text-purple-400">💘 {t('factions.lovers')}</span>：{t('lobby.factions.lovers')}</p>
              </div>

              <h4 className="font-bold text-white mt-4 mb-2">{t('lobby.specialRoles')}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span>🔮 {t('roles.seer.name')} - {t('roles.seer.description').slice(0, 20)}...</span>
                <span>🧪 {t('roles.witch.name')} - {t('roles.witch.description').slice(0, 20)}...</span>
                <span>🛡️ {t('roles.guard.name')} - {t('roles.guard.description').slice(0, 20)}...</span>
                <span>🔫 {t('roles.hunter.name')} - {t('roles.hunter.description').slice(0, 20)}...</span>
                <span>👑 {t('roles.alphaWolf.name')} - {t('roles.alphaWolf.description').slice(0, 15)}...</span>
                <span>🃏 {t('roles.idiot.name')} - {t('roles.idiot.description').slice(0, 20)}...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 连接状态指示器
interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

function ConnectionStatus({ isConnected, isConnecting, error }: ConnectionStatusProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 flex items-center gap-2 text-xs md:text-sm">
      <motion.div
        className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
          isConnecting ? 'bg-yellow-500' :
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        animate={{
          scale: isConnecting ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isConnecting ? Infinity : 0,
        }}
      />
      <span className="text-gray-400">
        {isConnecting ? t('common.connecting') + '...' :
         isConnected ? <span><span className="hidden xs:inline">{t('common.connected')}</span> {t('common.server')}</span> : t('common.disconnected')}
      </span>
      {error && (
        <span className="text-red-400 ml-2 hidden xs:inline">({error})</span>
      )}
    </div>
  );
}

// 成就数据类型
interface AchievementData {
  achievements: UserAchievements;
  totalAchievements: number;
  unlockedAchievements: number;
  byCategory: Record<string, Array<{ definition: AchievementDefinition; progress: AchievementProgress }>>;
  definitions: Record<string, AchievementDefinition>;
}

// Lobby 主组件 Props
export interface LobbyProps {
  playerName: string;
  onNameChange: (name: string) => void;
  onEnterLobby: () => Promise<void>;
  onDemoMode: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;
  userStats?: UserStatsType | null;
  userLevelInfo?: LevelInfo | null;
  onGetUserStats?: () => Promise<{ stats: UserStatsType; levelInfo: LevelInfo } | null>;
  // 成就相关
  onGetAchievements?: () => Promise<AchievementData | null>;
  // 排行榜相关
  onGetLeaderboard?: (type?: LeaderboardType, limit?: number, offset?: number) => Promise<{
    leaderboard: LeaderboardEntry[];
    myRank: LeaderboardEntry | null;
    type: string;
    total: number;
  } | null>;
  currentUserId?: string;
  // 认证相关
  isAuthenticated?: boolean;
  authMethod?: 'device' | 'email' | null;
  userEmail?: string | null;
  onLogin?: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; error?: string }>;
  onRegister?: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  onGuestLogin?: (username?: string) => Promise<void>;
  onLinkEmail?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogout?: () => void;
}

export function Lobby({
  playerName,
  onNameChange,
  onEnterLobby,
  onDemoMode,
  isConnecting,
  isConnected,
  connectionError,
  userStats,
  userLevelInfo,
  onGetUserStats,
  onGetAchievements,
  onGetLeaderboard,
  currentUserId,
  // 认证相关
  isAuthenticated = false,
  authMethod = null,
  userEmail = null,
  onLogin,
  onRegister,
  onGuestLogin,
  onLinkEmail,
  onLogout,
}: LobbyProps) {
  const { t } = useTranslation();
  const [isEntering, setIsEntering] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState<UserStatsType | null>(userStats || null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(userLevelInfo || null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showLinkEmailModal, setShowLinkEmailModal] = useState(false);
  // 成就相关状态
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  // 排行榜相关状态
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const { isDark } = useTheme();

  // 是否显示认证表单（有认证回调时启用新的认证流程）
  const useAuthFlow = !!(onLogin && onRegister && onGuestLogin);

  // Fetch stats when connected and modal is opened
  const handleShowStats = async () => {
    setShowStatsModal(true);
    if (onGetUserStats && isConnected) {
      setIsLoadingStats(true);
      try {
        const result = await onGetUserStats();
        if (result) {
          setStats(result.stats);
          setLevelInfo(result.levelInfo);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }
  };

  // Fetch achievements when modal is opened
  const handleShowAchievements = async () => {
    setShowAchievementModal(true);
    if (onGetAchievements && isConnected) {
      setIsLoadingAchievements(true);
      try {
        const result = await onGetAchievements();
        if (result) {
          setAchievementData(result);
        }
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
      } finally {
        setIsLoadingAchievements(false);
      }
    }
  };

  // Update local stats when prop changes
  useEffect(() => {
    if (userStats) {
      setStats(userStats);
    }
  }, [userStats]);

  // Update levelInfo when prop changes
  useEffect(() => {
    if (userLevelInfo) {
      setLevelInfo(userLevelInfo);
    }
  }, [userLevelInfo]);

  const handleEnter = async () => {
    if (!playerName.trim()) {
      setLocalError(t('lobby.nameRequired'));
      return;
    }

    if (playerName.trim().length < 2) {
      setLocalError(t('lobby.nameTooShort'));
      return;
    }

    setIsEntering(true);
    setLocalError(null);

    try {
      await onEnterLobby();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t('lobby.connectionError'));
    } finally {
      setIsEntering(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isEntering && playerName.trim()) {
      handleEnter();
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden transition-colors duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(to bottom, #111827, #111827, #030712)'
          : 'linear-gradient(to bottom, #f8f4e8, #fff8e6, #fffbf0)',
      }}
    >
      {/* 顶部操作栏 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ThemeToggleButton size="md" />
          <LanguageButton />
          {/* 显示等级 */}
          {isConnected && isAuthenticated && levelInfo && (
            <CompactLevelDisplay
              level={levelInfo.level}
              title={levelInfo.title}
              titleColor={levelInfo.titleColor}
              progress={levelInfo.progress}
              onClick={handleShowStats}
            />
          )}
        </div>
        {isConnected && (
          <div className="flex items-center gap-2">
            {onGetLeaderboard && (
              <LeaderboardButton onClick={() => setShowLeaderboardModal(true)} />
            )}
            <AchievementButton
              onClick={handleShowAchievements}
              unlockedCount={achievementData?.unlockedAchievements}
              totalCount={achievementData?.totalAchievements}
            />
            <StatsButton
              onClick={handleShowStats}
              hasStats={stats !== null && stats.totalGames > 0}
            />
          </div>
        )}
      </div>

      {/* 用户统计弹窗 */}
      {showStatsModal && (
        <StatsModal
          stats={stats}
          isLoading={isLoadingStats}
          onClose={() => setShowStatsModal(false)}
          levelInfo={levelInfo}
        />
      )}

      {/* 成就弹窗 */}
      {showAchievementModal && (
        <AchievementModal
          isOpen={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
          achievementData={achievementData}
          isLoading={isLoadingAchievements}
        />
      )}

      {/* 排行榜弹窗 */}
      {showLeaderboardModal && onGetLeaderboard && (
        <LeaderboardPanel
          getLeaderboard={onGetLeaderboard}
          currentUserId={currentUserId}
          onClose={() => setShowLeaderboardModal(false)}
          showModal={true}
        />
      )}

      {/* 背景装饰 */}
      {isDark && <StarBackground />}
      <MoonDecoration />
      <RoleDecorations />

      {/* 主标题 */}
      <motion.div
        className="text-center mb-6 md:mb-12 z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="text-5xl xs:text-6xl md:text-7xl font-bold mb-2 md:mb-4 bg-gradient-to-r from-red-500 via-red-600 to-red-800
                     bg-clip-text text-transparent drop-shadow-lg"
          animate={{
            textShadow: [
              '0 0 20px rgba(220, 38, 38, 0.3)',
              '0 0 40px rgba(220, 38, 38, 0.5)',
              '0 0 20px rgba(220, 38, 38, 0.3)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {t('brand.title')}
        </motion.h1>
        <motion.p
          className="text-gray-400 text-lg md:text-xl tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {t('brand.subtitle')}
        </motion.p>
        <motion.p
          className="text-gray-500 text-xs md:text-sm mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t('brand.tagline')}
        </motion.p>
      </motion.div>

      {/* 输入区域 */}
      <motion.div
        className="w-full max-w-md space-y-4 md:space-y-6 z-10 px-4 md:px-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* 新的认证流程 */}
        {useAuthFlow ? (
          <>
            {isAuthenticated && isConnected ? (
              /* 已登录状态：显示用户信息和进入游戏按钮 */
              <div className="space-y-4">
                <UserInfo
                  username={playerName}
                  email={userEmail}
                  authMethod={authMethod}
                  onLogout={onLogout || (() => {})}
                  onLinkEmail={authMethod === 'device' && onLinkEmail ? () => setShowLinkEmailModal(true) : undefined}
                />

                {/* 进入游戏按钮 */}
                <motion.button
                  onClick={handleEnter}
                  disabled={isEntering}
                  className="w-full py-4 bg-gradient-to-r from-red-700 to-red-900 rounded-lg
                             font-bold text-lg transition-all relative overflow-hidden group
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative z-10">
                    {isEntering ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          ⏳
                        </motion.span>
                        {t('common.loading')}
                      </span>
                    ) : (
                      t('lobby.enterGame')
                    )}
                  </span>
                </motion.button>

                {/* 演示模式按钮 */}
                <motion.button
                  onClick={onDemoMode}
                  className="w-full py-3 bg-gradient-to-r from-purple-700/80 to-purple-900/80 rounded-lg
                             font-bold transition-all border border-purple-600/50 hover:border-purple-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    🎮 {t('lobby.demoMode')}
                    <span className="text-xs text-purple-300">({t('lobby.demoTip')})</span>
                  </span>
                </motion.button>
              </div>
            ) : (
              /* 未登录状态：显示认证面板 */
              <div className="space-y-4">
                <div className="p-6 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl">
                  <AuthPanel
                    onLogin={onLogin}
                    onRegister={onRegister}
                    onGuestLogin={onGuestLogin}
                    isConnecting={isConnecting}
                    error={connectionError}
                  />
                </div>

                {/* 演示模式按钮 */}
                <motion.button
                  onClick={onDemoMode}
                  className="w-full py-3 bg-gradient-to-r from-purple-700/80 to-purple-900/80 rounded-lg
                             font-bold transition-all border border-purple-600/50 hover:border-purple-500"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    🎮 {t('lobby.demoMode')}
                    <span className="text-xs text-purple-300">({t('lobby.demoTip')})</span>
                  </span>
                </motion.button>
              </div>
            )}
          </>
        ) : (
          /* 旧的简单流程（向后兼容） */
          <>
            {/* 玩家名输入 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {t('lobby.yourName')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    onNameChange(e.target.value);
                    setLocalError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t('lobby.enterName')}
                  maxLength={12}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg
                             focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600
                             transition-all placeholder:text-gray-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {playerName.length}/12
                </span>
              </div>
              {localError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {localError}
                </motion.p>
              )}
            </div>

            {/* 进入游戏按钮 */}
            <motion.button
              onClick={handleEnter}
              disabled={!playerName.trim() || isEntering || isConnecting}
              className="w-full py-4 bg-gradient-to-r from-red-700 to-red-900 rounded-lg
                         font-bold text-lg transition-all relative overflow-hidden group
                         disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 按钮光效 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
              <span className="relative z-10">
                {isEntering || isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    {t('common.connecting')}...
                  </span>
                ) : (
                  t('lobby.enterGame')
                )}
              </span>
            </motion.button>

            {/* 演示模式按钮 */}
            <motion.button
              onClick={onDemoMode}
              className="w-full py-3 bg-gradient-to-r from-purple-700/80 to-purple-900/80 rounded-lg
                         font-bold transition-all border border-purple-600/50 hover:border-purple-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center justify-center gap-2">
                🎮 {t('lobby.demoMode')}
                <span className="text-xs text-purple-300">({t('lobby.demoTip')})</span>
              </span>
            </motion.button>
          </>
        )}

        {/* 连接错误提示 */}
        <AnimatePresence>
          {connectionError && !useAuthFlow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-red-400">⚠️</span>
                <div>
                  <p className="text-red-300">{connectionError}</p>
                  <p className="text-gray-400 mt-1 text-xs">
                    {t('lobby.ensureServer')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 绑定邮箱弹窗 */}
      {onLinkEmail && (
        <AnimatePresence>
          {showLinkEmailModal && (
            <LinkEmailModal
              isOpen={showLinkEmailModal}
              onClose={() => setShowLinkEmailModal(false)}
              onLinkEmail={onLinkEmail}
              isLoading={isConnecting}
            />
          )}
        </AnimatePresence>
      )}

      {/* 游戏规则卡片 */}
      <RulesCard />

      {/* 版本信息 */}
      <motion.div
        className="absolute bottom-4 right-4 text-xs text-gray-600 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        v1.0.0 · Powered by Nakama
      </motion.div>

      {/* 连接状态 */}
      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={connectionError}
      />
    </div>
  );
}

export default Lobby;
