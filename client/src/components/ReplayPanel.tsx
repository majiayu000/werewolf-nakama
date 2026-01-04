/**
 * ReplayPanel 组件
 * 游戏回放系统：列表、查看、播放控制
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Role, Faction, GameEventType,
  ReplayListItem, GameReplay, ReplayEvent, ReplayStats, ReplayPlayer,
  ROLE_INFO
} from '../types/werewolf';

// ============================================================================
// 类型定义
// ============================================================================

interface ReplayPanelProps {
  onGetReplays: (limit?: number, offset?: number) => Promise<{
    replays: ReplayListItem[];
    total: number;
  } | null>;
  onGetReplayById: (replayId: string) => Promise<{
    replay: GameReplay;
    stats: ReplayStats;
    keyEvents: ReplayEvent[];
  } | null>;
  onClose?: () => void;
}

// ============================================================================
// 辅助函数
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getWinnerText(winner: string | null, t: (key: string) => string): string {
  if (!winner) return t('replay.result.unknown');
  switch (winner) {
    case 'villager': return t('replay.result.villagerWin');
    case 'werewolf': return t('replay.result.werewolfWin');
    case 'lovers': return t('replay.result.loversWin');
    default: return winner;
  }
}

function getWinnerColor(winner: string | null): string {
  switch (winner) {
    case 'villager': return 'text-green-400';
    case 'werewolf': return 'text-red-400';
    case 'lovers': return 'text-pink-400';
    default: return 'text-gray-400';
  }
}

function getEventDescription(event: ReplayEvent, t: (key: string, options?: Record<string, unknown>) => string): string {
  const actorName = event.actor?.name || t('replay.list.unknown');
  const targetName = event.target?.name || t('replay.list.unknown');

  switch (event.type) {
    case GameEventType.MATCH_STARTED:
      return t('replay.events.gameStarted', { count: event.data?.playerCount || 0 });
    case GameEventType.NIGHT_STARTED:
      return t('replay.events.nightStarted', { day: event.day });
    case GameEventType.DAY_STARTED:
      return t('replay.events.dayStarted', { day: event.day });
    case GameEventType.WOLF_KILL:
      return t('replay.events.wolfKill', { target: targetName });
    case GameEventType.SEER_CHECK:
      return t('replay.events.seerCheck', { target: targetName });
    case GameEventType.WITCH_SAVE:
      return t('replay.events.witchSave', { target: targetName });
    case GameEventType.WITCH_POISON:
      return t('replay.events.witchPoison', { target: targetName });
    case GameEventType.GUARD_PROTECT:
      return t('replay.events.guardProtect', { target: targetName });
    case GameEventType.HUNTER_SHOOT:
      return t('replay.events.hunterShoot', { actor: actorName, target: targetName });
    case GameEventType.ALPHA_WOLF_SHOOT:
      return t('replay.events.alphaWolfShoot', { actor: actorName, target: targetName });
    case GameEventType.CUPID_LINK:
      return t('replay.events.cupidLink', { lover1: event.data?.lover1 || '', lover2: event.data?.lover2 || '' });
    case GameEventType.VOTE_RESULT:
      if (event.data?.eliminated) {
        return t('replay.events.voteEliminated', { player: event.data.eliminated });
      }
      return t('replay.events.voteTie');
    case GameEventType.SHERIFF_ELECTED:
      return t('replay.events.sheriffElected', { player: event.data?.sheriff || t('replay.list.unknown') });
    case GameEventType.IDIOT_REVEALED:
      return t('replay.events.idiotRevealed', { player: event.data?.idiot || '' });
    case GameEventType.LOVER_DIED:
      return t('replay.events.loverDied');
    case GameEventType.PLAYER_DIED:
      return t('replay.events.playerDied', { player: targetName });
    case GameEventType.GAME_WIN:
      return getWinnerText(event.data?.winner as string, t);
    case GameEventType.PHASE_CHANGED:
      return t('replay.events.phaseChanged', { phase: event.data?.to || event.phase });
    default:
      return event.type;
  }
}

function getEventIcon(event: ReplayEvent): string {
  switch (event.type) {
    case GameEventType.MATCH_STARTED: return '🎮';
    case GameEventType.NIGHT_STARTED: return '🌙';
    case GameEventType.DAY_STARTED: return '☀️';
    case GameEventType.WOLF_KILL: return '🐺';
    case GameEventType.SEER_CHECK: return '🔮';
    case GameEventType.WITCH_SAVE: return '💊';
    case GameEventType.WITCH_POISON: return '☠️';
    case GameEventType.GUARD_PROTECT: return '🛡️';
    case GameEventType.HUNTER_SHOOT:
    case GameEventType.ALPHA_WOLF_SHOOT: return '🔫';
    case GameEventType.CUPID_LINK: return '💕';
    case GameEventType.VOTE_RESULT: return '🗳️';
    case GameEventType.SHERIFF_ELECTED: return '⭐';
    case GameEventType.IDIOT_REVEALED: return '🤡';
    case GameEventType.LOVER_DIED: return '💔';
    case GameEventType.PLAYER_DIED: return '💀';
    case GameEventType.GAME_WIN: return '🏆';
    default: return '📝';
  }
}

// ============================================================================
// 子组件
// ============================================================================

/** 回放列表项 */
function ReplayListItemCard({
  replay,
  onClick
}: {
  replay: ReplayListItem;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const roleName = replay.myRole ? (ROLE_INFO[replay.myRole as Role]?.name || replay.myRole) : t('replay.list.unknown');

  return (
    <motion.div
      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm text-gray-400">{formatDate(replay.createdAt)}</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-sm text-gray-400">{t('replay.list.playerCount', { count: replay.playerCount })}</span>
          <span className="mx-2 text-gray-600">|</span>
          <span className="text-sm text-gray-400">{t('replay.list.days', { count: replay.days })}</span>
        </div>
        <span className="text-sm text-gray-500">{formatDuration(replay.duration)}</span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{t('replay.list.myRole')}</span>
          <span className="px-2 py-0.5 bg-gray-700 rounded text-sm">{roleName}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${getWinnerColor(replay.winner)}`}>
            {getWinnerText(replay.winner, t)}
          </span>
          {replay.myResult && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              replay.myResult === 'win' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {replay.myResult === 'win' ? t('replay.result.win') : t('replay.result.lose')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** 回放统计面板 */
function StatsPanel({ stats }: { stats: ReplayStats }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-800/50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-red-400">{stats.wolfKills}</div>
        <div className="text-xs text-gray-400">{t('replay.stats.wolfKills')}</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-400">{stats.votedOut}</div>
        <div className="text-xs text-gray-400">{t('replay.stats.votedOut')}</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-400">{stats.witchSaves}</div>
        <div className="text-xs text-gray-400">{t('replay.stats.witchSaves')}</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-400">{stats.skillsUsed}</div>
        <div className="text-xs text-gray-400">{t('replay.stats.skillsUsed')}</div>
      </div>
    </div>
  );
}

/** 玩家列表 */
function PlayerList({ players }: { players: ReplayPlayer[] }) {
  const { t } = useTranslation();
  // 按阵营分组
  const werewolves = players.filter(p => p.faction === Faction.WEREWOLF);
  const villagers = players.filter(p => p.faction === Faction.VILLAGER);
  const neutrals = players.filter(p => p.faction === Faction.NEUTRAL);

  const PlayerRow = ({ player }: { player: ReplayPlayer }) => {
    const roleInfo = ROLE_INFO[player.role];
    return (
      <div className={`flex items-center justify-between p-2 rounded ${
        !player.isAlive ? 'opacity-50' : ''
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-6 text-center text-gray-400">{player.seatNumber}</span>
          <span className="text-white">{player.name}</span>
          {player.isSheriff && <span className="text-yellow-400">⭐</span>}
          {player.isLover && <span className="text-pink-400">❤️</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs ${
            player.faction === Faction.WEREWOLF ? 'bg-red-900/50 text-red-400' :
            player.faction === Faction.VILLAGER ? 'bg-green-900/50 text-green-400' :
            'bg-purple-900/50 text-purple-400'
          }`}>
            {roleInfo?.name || player.role}
          </span>
          {!player.isAlive && <span className="text-gray-500">💀</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {werewolves.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2">🐺 {t('replay.faction.werewolf')}</h4>
          <div className="space-y-1">
            {werewolves.map(p => <PlayerRow key={p.id} player={p} />)}
          </div>
        </div>
      )}
      {villagers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-400 mb-2">👥 {t('replay.faction.villager')}</h4>
          <div className="space-y-1">
            {villagers.map(p => <PlayerRow key={p.id} player={p} />)}
          </div>
        </div>
      )}
      {neutrals.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-purple-400 mb-2">🎭 {t('replay.faction.neutral')}</h4>
          <div className="space-y-1">
            {neutrals.map(p => <PlayerRow key={p.id} player={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/** 事件时间线 */
function EventTimeline({
  events,
  currentTime,
  onSeek
}: {
  events: ReplayEvent[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {events.map((event, index) => {
        const isActive = currentTime >= event.timestamp &&
          (index === events.length - 1 || currentTime < events[index + 1].timestamp);

        return (
          <motion.div
            key={index}
            className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-all ${
              isActive ? 'bg-blue-900/30 border border-blue-700' : 'hover:bg-gray-800/50'
            }`}
            onClick={() => onSeek(event.timestamp)}
          >
            <span className="text-lg">{getEventIcon(event)}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white">{getEventDescription(event, t)}</div>
              <div className="text-xs text-gray-500">
                Day {event.day} · {formatDuration(Math.floor(event.timestamp / 1000))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** 播放控制条 */
function PlaybackControls({
  isPlaying,
  currentTime,
  totalTime,
  speed,
  onPlayPause,
  onSeek,
  onSpeedChange
}: {
  isPlaying: boolean;
  currentTime: number;
  totalTime: number;
  speed: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
}) {
  const { t } = useTranslation();
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      {/* 进度条 */}
      <div
        className="relative h-2 bg-gray-700 rounded-full cursor-pointer mb-4"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          onSeek(percent * totalTime);
        }}
      >
        <div
          className="absolute h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white rounded-full -top-1 -ml-2 shadow-lg"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors"
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <span className="text-sm text-gray-400">
            {formatDuration(Math.floor(currentTime / 1000))} / {formatDuration(Math.floor(totalTime / 1000))}
          </span>
        </div>

        {/* 倍速控制 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{t('replay.playback.speed')}</span>
          {[0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              className={`px-2 py-1 rounded text-sm ${
                speed === s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 回放详情视图
// ============================================================================

function ReplayDetailView({
  replay,
  stats,
  keyEvents,
  onBack
}: {
  replay: GameReplay;
  stats: ReplayStats;
  keyEvents: ReplayEvent[];
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState<'timeline' | 'players'>('timeline');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalTime = replay.meta.duration * 1000; // Convert to ms

  // 播放控制
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 100 * speed;
          if (next >= totalTime) {
            setIsPlaying(false);
            return totalTime;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, totalTime]);

  const handlePlayPause = () => {
    if (currentTime >= totalTime) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, totalTime)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          onClick={onBack}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('replay.backToList')}
        </button>

        <div className="text-center">
          <div className="text-lg font-medium text-white">
            {replay.meta.config.roomName || t('replay.defaultRoomName')}
          </div>
          <div className="text-sm text-gray-400">
            {formatDate(replay.meta.createdAt)} · {t('replay.list.playerCount', { count: replay.meta.playerCount })} · {t('replay.list.days', { count: replay.meta.days })}
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          replay.meta.winner === 'werewolf' ? 'bg-red-900/50 text-red-400' :
          replay.meta.winner === 'villager' ? 'bg-green-900/50 text-green-400' :
          'bg-pink-900/50 text-pink-400'
        }`}>
          {getWinnerText(replay.meta.winner as string, t)}
        </div>
      </div>

      {/* 统计面板 */}
      <div className="p-4">
        <StatsPanel stats={stats} />
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'timeline'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('timeline')}
        >
          📜 {t('replay.tabs.timeline')}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'players'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('players')}
        >
          👥 {t('replay.tabs.players')}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'timeline' ? (
          <EventTimeline
            events={keyEvents}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        ) : (
          <PlayerList players={replay.meta.players} />
        )}
      </div>

      {/* 播放控制 */}
      <div className="p-4 border-t border-gray-700">
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalTime={totalTime}
          speed={speed}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSpeedChange={setSpeed}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function ReplayPanel({ onGetReplays, onGetReplayById, onClose }: ReplayPanelProps) {
  const { t } = useTranslation();
  const [replays, setReplays] = useState<ReplayListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState<{
    replay: GameReplay;
    stats: ReplayStats;
    keyEvents: ReplayEvent[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 加载回放列表
  const loadReplays = useCallback(async () => {
    setLoading(true);
    try {
      const result = await onGetReplays(20, 0);
      if (result) {
        setReplays(result.replays);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to load replays:', error);
    } finally {
      setLoading(false);
    }
  }, [onGetReplays]);

  // 加载回放详情
  const loadReplayDetail = useCallback(async (replayId: string) => {
    setLoadingDetail(true);
    try {
      const result = await onGetReplayById(replayId);
      if (result) {
        setSelectedReplay(result);
      }
    } catch (error) {
      console.error('Failed to load replay detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }, [onGetReplayById]);

  useEffect(() => {
    loadReplays();
  }, [loadReplays]);

  // 如果正在查看详情
  if (selectedReplay) {
    return (
      <ReplayDetailView
        replay={selectedReplay.replay}
        stats={selectedReplay.stats}
        keyEvents={selectedReplay.keyEvents}
        onBack={() => setSelectedReplay(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">🎬 {t('replay.title')}</h2>
        {onClose && (
          <button
            className="p-2 text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : replays.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎮</div>
            <div className="text-gray-400">{t('replay.empty.title')}</div>
            <div className="text-sm text-gray-500 mt-2">{t('replay.empty.description')}</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">{t('replay.list.total', { count: total })}</div>
            {replays.map(replay => (
              <ReplayListItemCard
                key={replay.id}
                replay={replay}
                onClick={() => loadReplayDetail(replay.id)}
              />
            ))}
          </div>
        )}

        {/* 加载详情遮罩 */}
        <AnimatePresence>
          {loadingDetail && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-white">{t('replay.loading')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// 导出辅助组件
// ============================================================================

/** 回放按钮 */
export function ReplayButton({
  onClick,
  className = ''
}: {
  onClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <button
      className={`flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors ${className}`}
      onClick={onClick}
    >
      <span>🎬</span>
      <span>{t('replay.button')}</span>
    </button>
  );
}

/** 回放弹窗 */
export function ReplayModal({
  isOpen,
  onClose,
  onGetReplays,
  onGetReplayById
}: {
  isOpen: boolean;
  onClose: () => void;
  onGetReplays: ReplayPanelProps['onGetReplays'];
  onGetReplayById: ReplayPanelProps['onGetReplayById'];
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 rounded-xl w-full max-w-2xl h-[80vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <ReplayPanel
          onGetReplays={onGetReplays}
          onGetReplayById={onGetReplayById}
          onClose={onClose}
        />
      </motion.div>
    </motion.div>
  );
}

export default ReplayPanel;
