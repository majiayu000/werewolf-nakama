/**
 * RoomList.tsx - 房间列表组件
 * 显示可用房间、创建房间、快速匹配功能
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { MatchInfo } from '../hooks/useNakama';
import { Role, PRESET_ROLE_CONFIGS, type RoomSettings } from '../types/werewolf';

// 房间状态类型
type RoomStatus = 'waiting' | 'playing' | 'full';

// 解析房间标签信息
interface RoomLabel {
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  hostName?: string;
  roleConfig?: string;
  roomName?: string;
  isPrivate?: boolean;
  phase?: string;
}

function parseRoomLabel(label?: string): Partial<RoomLabel> {
  if (!label) return {};
  try {
    const parsed = JSON.parse(label);
    // Map phase to status
    if (parsed.phase) {
      if (parsed.phase === 'waiting') {
        parsed.status = 'waiting';
      } else if (parsed.phase !== 'game_over') {
        parsed.status = 'playing';
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

// 房间卡片组件
interface RoomCardProps {
  room: MatchInfo;
  onJoin: (matchId: string, isPrivate: boolean) => void;
  isJoining: boolean;
}

function RoomCard({ room, onJoin, isJoining }: RoomCardProps) {
  const { t } = useTranslation();
  const label = parseRoomLabel(room.label);
  const playerCount = label.playerCount || room.size || 0;
  const maxPlayers = label.maxPlayers || room.maxPlayers || 12;
  const status: RoomStatus = playerCount >= maxPlayers ? 'full' :
                              label.status === 'playing' ? 'playing' : 'waiting';
  const roomName = label.roomName || room.roomName || label.name || `${t('game.room')} ${room.match_id.slice(-6)}`;
  const isPrivate = room.isPrivate || label.isPrivate || false;

  const statusConfig = {
    waiting: { text: t('roomList.filter.waiting'), color: 'bg-green-900/50 text-green-400 border-green-700/50' },
    playing: { text: t('roomList.filter.playing'), color: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50' },
    full: { text: t('roomList.roomCard.full'), color: 'bg-red-900/50 text-red-400 border-red-700/50' },
  };

  const canJoin = status === 'waiting';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-xl border transition-all ${
        canJoin
          ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80 cursor-pointer'
          : 'bg-gray-800/30 border-gray-800 opacity-60'
      }`}
      onClick={() => canJoin && !isJoining && onJoin(room.match_id, isPrivate)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* 私密房间锁图标 */}
            {isPrivate && (
              <span className="text-yellow-500" title={t('roomList.roomCard.private')}>🔒</span>
            )}
            <h4 className="font-bold text-white">{roomName}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${statusConfig[status].color}`}>
              {statusConfig[status].text}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <span className="text-gray-500">👥</span>
              <span className={playerCount >= maxPlayers ? 'text-red-400' : 'text-white'}>
                {playerCount}
              </span>
              /{maxPlayers}
            </span>

            {label.hostName && (
              <span className="flex items-center gap-1">
                <span className="text-gray-500">🏠</span>
                {label.hostName}
              </span>
            )}

            {label.roleConfig && (
              <span className="text-gray-500 text-xs">
                {label.roleConfig}
              </span>
            )}
          </div>
        </div>

        {canJoin && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onJoin(room.match_id, isPrivate);
            }}
            disabled={isJoining}
            className={`px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isPrivate
                ? 'bg-yellow-700 hover:bg-yellow-600'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isJoining ? `${t('common.loading')}` : (isPrivate ? `🔒 ${t('roomList.roomCard.join')}` : t('roomList.roomCard.join'))}
          </motion.button>
        )}

        {status === 'playing' && (
          <button
            className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm cursor-not-allowed"
            disabled
          >
            {t('spectator.joinAsSpectator')}
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${
            playerCount >= maxPlayers ? 'bg-red-500' :
            playerCount >= maxPlayers * 0.7 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${(playerCount / maxPlayers) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}

// 快速匹配卡片
interface QuickMatchCardProps {
  onQuickMatch: () => void;
  isMatching: boolean;
}

function QuickMatchCard({ onQuickMatch, isMatching }: QuickMatchCardProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="p-6 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl
                 border border-purple-700/50 relative overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 背景动画 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎮
            </motion.span>
            {t('roomList.quickMatch')}
          </h3>
          <p className="text-gray-400 text-sm">
            {t('roomList.quickMatchDesc')}
          </p>
        </div>

        <motion.button
          onClick={onQuickMatch}
          disabled={isMatching}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600
                     hover:from-purple-500 hover:to-blue-500 rounded-lg font-bold
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-lg shadow-purple-900/50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isMatching ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
              {t('roomList.findingMatch')}
            </span>
          ) : (
            t('roomList.quickMatch')
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// 空房间列表提示
function EmptyRoomList({ onCreateRoom }: { onCreateRoom: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-6xl mb-4">🌙</div>
      <h3 className="text-xl font-bold text-gray-400 mb-2">{t('roomList.noRooms')}</h3>
      <p className="text-gray-500 mb-6">{t('roomList.noRoomsHint')}</p>
      <motion.button
        onClick={onCreateRoom}
        className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-bold transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {t('roomList.createRoom')}
      </motion.button>
    </motion.div>
  );
}

// 加载状态
function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="h-24 bg-gray-800/30 rounded-xl animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// 筛选器组件
interface FilterBarProps {
  filter: 'all' | 'waiting' | 'playing';
  onFilterChange: (filter: 'all' | 'waiting' | 'playing') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function FilterBar({ filter, onFilterChange, onRefresh, isRefreshing }: FilterBarProps) {
  const { t } = useTranslation();
  const filters = [
    { key: 'all', label: t('roomList.filter.all') },
    { key: 'waiting', label: t('roomList.filter.waiting') },
    { key: 'playing', label: t('roomList.filter.playing') },
  ] as const;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <motion.button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        animate={isRefreshing ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
      >
        🔄
      </motion.button>
    </div>
  );
}

// 密码输入弹窗组件
interface PasswordEntryModalProps {
  roomName: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

function PasswordEntryModal({ roomName, onSubmit, onClose, isSubmitting, error }: PasswordEntryModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <span className="text-4xl">🔒</span>
          <h2 className="text-xl font-bold text-white mt-3">{t('roomList.roomCard.private')}</h2>
          <p className="text-gray-400 text-sm mt-1">{roomName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('roomList.createModal.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                         focus:outline-none focus:border-yellow-600 transition-colors"
              placeholder={t('roomList.roomCard.enterPassword')}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <motion.button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="flex-1 py-3 bg-yellow-700 hover:bg-yellow-600 rounded-lg font-bold
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isSubmitting ? t('common.loading') : t('roomList.roomCard.join')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// RoomList 主组件 Props
export interface RoomListProps {
  playerName: string;
  onBack: () => void;
  onJoinRoom: (matchId: string, password?: string) => Promise<void>;  // 支持密码
  onCreateRoom: (settings: RoomSettings) => Promise<string>;
  onQuickMatch: () => Promise<void>;
  listRooms: () => Promise<MatchInfo[]>;
}

export function RoomList({
  playerName,
  onBack,
  onJoinRoom,
  onCreateRoom,
  onQuickMatch,
  listRooms,
}: RoomListProps) {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<MatchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 密码输入弹窗状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingJoinRoom, setPendingJoinRoom] = useState<{ matchId: string; roomName: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 加载房间列表
  const loadRooms = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);

    try {
      const matchList = await listRooms();
      setRooms(matchList);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取房间列表失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [listRooms]);

  // 初始加载和定时刷新
  useEffect(() => {
    loadRooms(true);

    // 每 10 秒自动刷新
    const interval = setInterval(() => loadRooms(), 10000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  // 获取房间名称
  const getRoomName = (matchId: string): string => {
    const room = rooms.find(r => r.match_id === matchId);
    if (!room) return `${t('game.room')} ${matchId.slice(-6)}`;
    const label = parseRoomLabel(room.label);
    return label.roomName || room.roomName || label.name || `${t('game.room')} ${matchId.slice(-6)}`;
  };

  // 加入房间（处理密码）
  const handleJoinRoom = async (matchId: string, isPrivate: boolean) => {
    // 如果是私密房间，显示密码输入弹窗
    if (isPrivate) {
      setPendingJoinRoom({ matchId, roomName: getRoomName(matchId) });
      setPasswordError(null);
      setShowPasswordModal(true);
      return;
    }

    // 公开房间直接加入
    setIsJoining(matchId);
    setError(null);

    try {
      await onJoinRoom(matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入房间失败');
    } finally {
      setIsJoining(null);
    }
  };

  // 使用密码加入房间
  const handlePasswordSubmit = async (password: string) => {
    if (!pendingJoinRoom) return;

    setIsJoining(pendingJoinRoom.matchId);
    setPasswordError(null);

    try {
      await onJoinRoom(pendingJoinRoom.matchId, password);
      setShowPasswordModal(false);
      setPendingJoinRoom(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加入房间失败';
      if (msg.includes('密码') || msg.includes('password') || msg.includes('incorrect')) {
        setPasswordError('密码错误，请重试');
      } else {
        setPasswordError(msg);
      }
    } finally {
      setIsJoining(null);
    }
  };

  // 关闭密码弹窗
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPendingJoinRoom(null);
    setPasswordError(null);
  };

  // 快速匹配
  const handleQuickMatch = async () => {
    setIsMatching(true);
    setError(null);

    try {
      await onQuickMatch();
    } catch (e) {
      setError(e instanceof Error ? e.message : '匹配失败');
    } finally {
      setIsMatching(false);
    }
  };

  // 创建房间
  const handleCreateRoom = async (settings: RoomSettings) => {
    setIsCreating(true);
    setError(null);

    try {
      const matchId = await onCreateRoom(settings);
      await onJoinRoom(matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建房间失败');
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  // 筛选房间
  const filteredRooms = rooms.filter((room) => {
    if (filter === 'all') return true;
    const label = parseRoomLabel(room.label);
    return label.status === filter || (filter === 'waiting' && !label.status);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-6">
      {/* 顶部导航 */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors
                     px-3 py-2 rounded-lg hover:bg-gray-800"
        >
          <span className="text-xl">←</span>
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-400 text-sm">{t('lobby.yourName')}</p>
            <p className="text-white font-bold">{playerName}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800
                          flex items-center justify-center text-xl font-bold">
            {playerName.charAt(0).toUpperCase()}
          </div>
        </div>
      </motion.div>

      {/* 页面标题 */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t('roomList.title')}</h1>
        <p className="text-gray-400">{t('roomList.noRoomsHint')}</p>
      </motion.div>

      {/* 快速匹配 */}
      <div className="mb-8">
        <QuickMatchCard onQuickMatch={handleQuickMatch} isMatching={isMatching} />
      </div>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-400">
              <span>⚠️</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 房间列表区域 */}
      <motion.div
        className="bg-gray-800/30 rounded-2xl p-6 border border-gray-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* 标题和创建按钮 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🏠</span>
            {t('roomList.title')}
            <span className="text-sm text-gray-500 font-normal">
              ({filteredRooms.length})
            </span>
          </h2>

          <motion.button
            onClick={() => setShowCreateModal(true)}
            disabled={isCreating}
            className="px-5 py-2 bg-green-700 hover:bg-green-600 rounded-lg font-medium
                       transition-colors flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>+</span>
            {t('roomList.createRoom')}
          </motion.button>
        </div>

        {/* 筛选器 */}
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          onRefresh={() => loadRooms()}
          isRefreshing={isRefreshing}
        />

        {/* 房间列表 */}
        <div className="space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : filteredRooms.length === 0 ? (
            <EmptyRoomList onCreateRoom={() => setShowCreateModal(true)} />
          ) : (
            <AnimatePresence>
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.match_id}
                  room={room}
                  onJoin={handleJoinRoom}
                  isJoining={isJoining === room.match_id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* 创建房间弹窗 */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
            isCreating={isCreating}
            playerName={playerName}
          />
        )}
      </AnimatePresence>

      {/* 密码输入弹窗 */}
      <AnimatePresence>
        {showPasswordModal && pendingJoinRoom && (
          <PasswordEntryModal
            roomName={pendingJoinRoom.roomName}
            onSubmit={handlePasswordSubmit}
            onClose={handlePasswordModalClose}
            isSubmitting={isJoining === pendingJoinRoom.matchId}
            error={passwordError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 角色配置项
interface RoleConfigItem {
  role: Role;
  emoji: string;
  name: string;
  color: string;
  bgColor: string;
  max: number;
  description: string;
}

const ROLE_CONFIG_OPTIONS: RoleConfigItem[] = [
  { role: Role.WEREWOLF, emoji: '🐺', name: '狼人', color: 'text-red-400', bgColor: 'bg-red-900/50', max: 5, description: '夜晚击杀' },
  { role: Role.ALPHA_WOLF, emoji: '👑', name: '狼王', color: 'text-red-300', bgColor: 'bg-red-900/40', max: 1, description: '死亡反杀' },
  { role: Role.SEER, emoji: '🔮', name: '预言家', color: 'text-blue-400', bgColor: 'bg-blue-900/50', max: 1, description: '查验身份' },
  { role: Role.WITCH, emoji: '🧪', name: '女巫', color: 'text-purple-400', bgColor: 'bg-purple-900/50', max: 1, description: '解药毒药' },
  { role: Role.GUARD, emoji: '🛡️', name: '守卫', color: 'text-green-400', bgColor: 'bg-green-900/50', max: 1, description: '守护玩家' },
  { role: Role.HUNTER, emoji: '🔫', name: '猎人', color: 'text-yellow-400', bgColor: 'bg-yellow-900/50', max: 1, description: '死亡开枪' },
  { role: Role.IDIOT, emoji: '🤡', name: '白痴', color: 'text-orange-400', bgColor: 'bg-orange-900/50', max: 1, description: '免死一次' },
  { role: Role.CUPID, emoji: '💘', name: '丘比特', color: 'text-pink-400', bgColor: 'bg-pink-900/50', max: 1, description: '连接情侣' },
  { role: Role.VILLAGER, emoji: '👨‍🌾', name: '村民', color: 'text-gray-300', bgColor: 'bg-gray-700', max: 8, description: '投票处决' },
];

// 创建房间弹窗组件
interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (settings: RoomSettings) => void;
  isCreating: boolean;
  playerName: string;
}

function CreateRoomModal({ onClose, onCreate, isCreating, playerName }: CreateRoomModalProps) {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState(`${playerName}`);
  const [maxPlayers, setMaxPlayers] = useState(9);
  const [isPrivate, setIsPrivate] = useState(false);  // 是否私密房间
  const [password, setPassword] = useState('');        // 房间密码
  const [useCustomRoles, setUseCustomRoles] = useState(false);
  const [roleCounters, setRoleCounters] = useState<Record<Role, number>>({
    [Role.WEREWOLF]: 3,
    [Role.ALPHA_WOLF]: 0,
    [Role.SEER]: 1,
    [Role.WITCH]: 1,
    [Role.GUARD]: 1,
    [Role.HUNTER]: 0,
    [Role.IDIOT]: 0,
    [Role.CUPID]: 0,
    [Role.VILLAGER]: 3,
    [Role.LOVER]: 0,
  });

  const playerOptions = [6, 8, 9, 10, 12];

  // 计算当前总角色数
  const totalRoles = useMemo(() => {
    return Object.values(roleCounters).reduce((sum, count) => sum + count, 0);
  }, [roleCounters]);

  // 当人数变化时，重置角色配置
  useEffect(() => {
    if (!useCustomRoles) {
      const preset = PRESET_ROLE_CONFIGS[maxPlayers];
      if (preset) {
        const newCounters: Record<Role, number> = {
          [Role.WEREWOLF]: 0,
          [Role.ALPHA_WOLF]: 0,
          [Role.SEER]: 0,
          [Role.WITCH]: 0,
          [Role.GUARD]: 0,
          [Role.HUNTER]: 0,
          [Role.IDIOT]: 0,
          [Role.CUPID]: 0,
          [Role.VILLAGER]: 0,
          [Role.LOVER]: 0,
        };
        for (const role of preset) {
          newCounters[role] = (newCounters[role] || 0) + 1;
        }
        setRoleCounters(newCounters);
      }
    }
  }, [maxPlayers, useCustomRoles]);

  // 调整角色数量
  const adjustRoleCount = (role: Role, delta: number) => {
    const config = ROLE_CONFIG_OPTIONS.find(r => r.role === role);
    if (!config) return;

    const currentCount = roleCounters[role] || 0;
    const newCount = Math.max(0, Math.min(config.max, currentCount + delta));

    // 检查总数是否超过最大玩家数
    const newTotal = totalRoles - currentCount + newCount;
    if (newTotal > maxPlayers && delta > 0) return;

    setRoleCounters(prev => ({
      ...prev,
      [role]: newCount,
    }));
  };

  // 生成角色列表
  const generateRoles = (): Role[] => {
    const roles: Role[] = [];
    for (const [role, count] of Object.entries(roleCounters)) {
      for (let i = 0; i < count; i++) {
        roles.push(role as Role);
      }
    }
    return roles;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roles = generateRoles();
    if (roles.length !== maxPlayers) {
      return; // 角色数必须等于玩家数
    }
    // 如果是私密房间但密码为空，不提交
    if (isPrivate && !password.trim()) {
      return;
    }
    onCreate({
      roomName,
      maxPlayers,
      roles,
      password: isPrivate ? password.trim() : undefined,  // 只有私密房间才传密码
    });
  };

  // 验证：角色数等于玩家数、房间名非空、私密房间需要密码
  const isValid = totalRoles === maxPlayers
    && roomName.trim().length > 0
    && (!isPrivate || password.trim().length > 0);

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-800 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{t('roomList.createModal.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 房间名称 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('roomList.createModal.roomName')}</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg
                         focus:outline-none focus:border-blue-600 transition-colors"
              placeholder={t('roomList.createModal.roomNamePlaceholder')}
            />
          </div>

          {/* 私密房间设置 */}
          <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium flex items-center gap-2">
                  <span className="text-yellow-500">🔒</span>
                  {t('roomList.createModal.private')}
                </label>
                <p className="text-xs text-gray-500 mt-1">{t('roomList.roomCard.enterPassword')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPrivate(!isPrivate);
                  if (isPrivate) setPassword('');  // 关闭时清空密码
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isPrivate ? 'bg-yellow-600' : 'bg-gray-700'
                }`}
              >
                <motion.div
                  className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                  animate={{ x: isPrivate ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* 密码输入 */}
            <AnimatePresence>
              {isPrivate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm text-gray-400 mb-2">{t('roomList.createModal.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={20}
                    className="w-full px-4 py-3 bg-gray-800 border border-yellow-700/50 rounded-lg
                               focus:outline-none focus:border-yellow-600 transition-colors"
                    placeholder={t('roomList.createModal.passwordPlaceholder')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 最大人数 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('roomList.createModal.maxPlayers')}</label>
            <div className="grid grid-cols-5 gap-2">
              {playerOptions.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setMaxPlayers(num);
                    if (useCustomRoles) {
                      // 调整村民数量以匹配新的人数
                      const nonVillagerCount = totalRoles - (roleCounters[Role.VILLAGER] || 0);
                      const newVillagerCount = Math.max(0, num - nonVillagerCount);
                      setRoleCounters(prev => ({
                        ...prev,
                        [Role.VILLAGER]: newVillagerCount,
                      }));
                    }
                  }}
                  className={`py-3 rounded-lg font-medium transition-colors ${
                    maxPlayers === num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {num}人
                </button>
              ))}
            </div>
          </div>

          {/* 自定义角色开关 */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">{t('roomList.createModal.customRoles')}</label>
            <button
              type="button"
              onClick={() => setUseCustomRoles(!useCustomRoles)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useCustomRoles ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                animate={{ x: useCustomRoles ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* 角色配置 */}
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">{t('roomList.createModal.roleConfig')}</p>
              <span className={`text-sm font-medium ${
                totalRoles === maxPlayers ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {totalRoles}/{maxPlayers}
              </span>
            </div>

            {useCustomRoles ? (
              <div className="space-y-2">
                {ROLE_CONFIG_OPTIONS.map((config) => (
                  <div
                    key={config.role}
                    className={`flex items-center justify-between p-2 rounded-lg ${config.bgColor}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.emoji}</span>
                      <span className={`font-medium ${config.color}`}>{config.name}</span>
                      <span className="text-xs text-gray-500">{config.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustRoleCount(config.role, -1)}
                        disabled={roleCounters[config.role] === 0}
                        className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600
                                   disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-medium text-white">
                        {roleCounters[config.role] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustRoleCount(config.role, 1)}
                        disabled={roleCounters[config.role] >= config.max || totalRoles >= maxPlayers}
                        className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600
                                   disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <RoleConfigPreview roles={generateRoles()} />
            )}
          </div>

          {/* 角色数量提示 */}
          {totalRoles !== maxPlayers && (
            <p className="text-sm text-yellow-400 text-center">
              角色数量（{totalRoles}）需要等于游戏人数（{maxPlayers}）
            </p>
          )}

          {/* 提交按钮 */}
          <motion.button
            type="submit"
            disabled={isCreating || !isValid}
            className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-lg font-bold
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isCreating ? t('common.loading') : t('roomList.createModal.create')}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// 角色配置预览
function RoleConfigPreview({ roles }: { roles: Role[] }) {
  // 统计角色数量
  const roleCounts = useMemo(() => {
    const counts: Record<Role, number> = {} as Record<Role, number>;
    for (const role of roles) {
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }, [roles]);

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {ROLE_CONFIG_OPTIONS.filter(config => roleCounts[config.role] > 0).map((config) => (
        <span
          key={config.role}
          className={`px-2 py-1 ${config.bgColor} ${config.color} rounded`}
        >
          {config.emoji} {config.name}
          {roleCounts[config.role] > 1 && ` x${roleCounts[config.role]}`}
        </span>
      ))}
    </div>
  );
}

export default RoomList;
