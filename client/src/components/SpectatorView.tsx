/**
 * SpectatorView Component
 * 观战者专用视图 - 可以看到所有玩家角色和隐藏信息
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Role, Faction, GamePhase, ROLE_INFO } from '../types/werewolf';

// 获取角色图标
const getRoleIcon = (role: Role): string => {
  const icons: Record<Role, string> = {
    [Role.VILLAGER]: '👨‍🌾',
    [Role.WEREWOLF]: '🐺',
    [Role.SEER]: '🔮',
    [Role.WITCH]: '🧪',
    [Role.HUNTER]: '🔫',
    [Role.GUARD]: '🛡️',
    [Role.IDIOT]: '🃏',
    [Role.ALPHA_WOLF]: '🐺',
    [Role.CUPID]: '💘',
    [Role.LOVER]: '💕',
  };
  return icons[role] || '❓';
};

// 获取阵营颜色
const getFactionColor = (faction: Faction): string => {
  switch (faction) {
    case Faction.WEREWOLF:
      return 'text-red-400 bg-red-900/30 border-red-700';
    case Faction.VILLAGER:
      return 'text-green-400 bg-green-900/30 border-green-700';
    case Faction.NEUTRAL:
      return 'text-purple-400 bg-purple-900/30 border-purple-700';
    case Faction.LOVERS:
      return 'text-pink-400 bg-pink-900/30 border-pink-700';
    default:
      return 'text-gray-400 bg-gray-900/30 border-gray-700';
  }
};

// 阶段显示名称
const getPhaseDisplayName = (phase: GamePhase): string => {
  const phaseNames: Record<GamePhase, string> = {
    [GamePhase.WAITING]: '等待中',
    [GamePhase.STARTING]: '游戏开始',
    [GamePhase.NIGHT]: '夜晚',
    [GamePhase.NIGHT_CUPID]: '丘比特行动',
    [GamePhase.NIGHT_WEREWOLF]: '狼人行动',
    [GamePhase.NIGHT_SEER]: '预言家行动',
    [GamePhase.NIGHT_WITCH]: '女巫行动',
    [GamePhase.NIGHT_GUARD]: '守卫行动',
    [GamePhase.DAY_ANNOUNCE]: '公布结果',
    [GamePhase.SHERIFF_CAMPAIGN]: '警长竞选',
    [GamePhase.SHERIFF_SPEECH]: '竞选发言',
    [GamePhase.SHERIFF_VOTING]: '警长投票',
    [GamePhase.SHERIFF_TRANSFER]: '警徽移交',
    [GamePhase.DAY_DISCUSSION]: '白天讨论',
    [GamePhase.DAY_VOTING]: '投票阶段',
    [GamePhase.DAY_EXECUTION]: '处决阶段',
    [GamePhase.LAST_WORDS]: '遗言阶段',
    [GamePhase.DEATH_SKILL]: '死亡技能',
    [GamePhase.GAME_OVER]: '游戏结束',
  };
  return phaseNames[phase] || phase;
};

// 玩家卡片（观战者版）
interface SpectatorPlayerCardProps {
  player: {
    id: string;
    name: string;
    seatNumber: number;
    role?: Role;
    faction?: Faction;
    status: string;
    isAlive?: boolean;
    votedFor?: string;
    isLover?: boolean;
    loverId?: string;
    idiotRevealed?: boolean;
  };
  nightInfo?: {
    isWolfTarget?: boolean;
    isGuardTarget?: boolean;
    isSeerTarget?: boolean;
    isWitchSaveTarget?: boolean;
    isWitchPoisonTarget?: boolean;
  };
}

const SpectatorPlayerCard: React.FC<SpectatorPlayerCardProps> = ({ player, nightInfo }) => {
  const isAlive = player.status === 'alive' || player.isAlive;
  const role = player.role;
  const faction = player.faction || (role ? ROLE_INFO[role]?.faction : null);

  return (
    <motion.div
      className={`relative p-3 rounded-lg border-2 ${
        isAlive
          ? faction
            ? getFactionColor(faction)
            : 'bg-gray-800/50 border-gray-600'
          : 'bg-gray-900/50 border-gray-700 opacity-50'
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 座位号 */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gray-700 border border-gray-500 flex items-center justify-center text-xs font-bold">
        {player.seatNumber}
      </div>

      {/* 夜晚行动标记 */}
      {nightInfo && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {nightInfo.isWolfTarget && (
            <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-xs" title="狼人目标">
              🎯
            </span>
          )}
          {nightInfo.isGuardTarget && (
            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs" title="守卫保护">
              🛡️
            </span>
          )}
          {nightInfo.isSeerTarget && (
            <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs" title="预言家查验">
              🔮
            </span>
          )}
          {nightInfo.isWitchSaveTarget && (
            <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-xs" title="女巫救药">
              💊
            </span>
          )}
          {nightInfo.isWitchPoisonTarget && (
            <span className="w-5 h-5 rounded-full bg-purple-800 flex items-center justify-center text-xs" title="女巫毒药">
              ☠️
            </span>
          )}
        </div>
      )}

      {/* 玩家信息 */}
      <div className="flex items-center gap-2">
        {/* 角色图标 */}
        <div className="text-2xl">
          {role ? getRoleIcon(role) : '❓'}
        </div>

        <div className="flex-1 min-w-0">
          {/* 玩家名 */}
          <div className="font-medium truncate text-sm">
            {player.name}
            {player.isLover && <span className="ml-1 text-pink-400">💕</span>}
            {player.idiotRevealed && <span className="ml-1 text-yellow-400">🃏</span>}
          </div>

          {/* 角色名称 */}
          <div className="text-xs opacity-75">
            {role ? ROLE_INFO[role]?.name : '未知'}
            {!isAlive && <span className="ml-1 text-red-400">（死亡）</span>}
          </div>
        </div>
      </div>

      {/* 投票目标 */}
      {player.votedFor && (
        <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
          <span>🗳️</span>
          <span>已投票</span>
        </div>
      )}
    </motion.div>
  );
};

// 夜晚信息面板
interface NightInfoPanelProps {
  nightInfo: {
    wolfTarget: string | null;
    guardTarget: string | null;
    seerTarget: string | null;
    witchSaveTarget: string | null;
    witchPoisonTarget: string | null;
  };
  players: Array<{ id: string; name: string; seatNumber: number }>;
}

const NightInfoPanel: React.FC<NightInfoPanelProps> = ({ nightInfo, players }) => {
  const getPlayerName = (id: string | null) => {
    if (!id) return '无';
    const player = players.find(p => p.id === id);
    return player ? `${player.seatNumber}号 ${player.name}` : id;
  };

  return (
    <motion.div
      className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
        <span>🌙</span>
        <span>夜晚行动信息</span>
      </h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-red-400">🐺 狼人目标:</span>
          <span>{getPlayerName(nightInfo.wolfTarget)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">🛡️ 守卫保护:</span>
          <span>{getPlayerName(nightInfo.guardTarget)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">🔮 预言家查验:</span>
          <span>{getPlayerName(nightInfo.seerTarget)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400">💊 女巫救药:</span>
          <span>{getPlayerName(nightInfo.witchSaveTarget)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-800">☠️ 女巫毒药:</span>
          <span>{getPlayerName(nightInfo.witchPoisonTarget)}</span>
        </div>
      </div>
    </motion.div>
  );
};

// 观战者状态栏
const SpectatorStatusBar: React.FC = () => {
  const { spectators, spectatorFullState, gameState } = useGameStore();
  const phase = spectatorFullState?.phase || gameState.phase;
  const dayNumber = spectatorFullState?.dayNumber || gameState.dayCount;

  return (
    <motion.div
      className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border border-indigo-600 rounded-lg px-4 py-2 flex items-center justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">👁️</span>
        <div>
          <div className="font-bold text-indigo-300">观战模式</div>
          <div className="text-xs text-gray-400">
            {spectators.length} 人观战
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-400">当前阶段</div>
          <div className="font-medium">{getPhaseDisplayName(phase as GamePhase)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">天数</div>
          <div className="font-medium">第 {dayNumber} 天</div>
        </div>
      </div>
    </motion.div>
  );
};

// 观战者聊天频道切换
type ChatChannel = 'all' | 'public' | 'wolf' | 'dead' | 'spectator';

interface SpectatorChatProps {
  onSendMessage: (content: string, type: 'spectator') => void;
}

const SpectatorChat: React.FC<SpectatorChatProps> = ({ onSendMessage }) => {
  const [channel, setChannel] = useState<ChatChannel>('all');
  const [inputValue, setInputValue] = useState('');
  const { messages } = useGameStore();

  // 根据频道过滤消息
  const filteredMessages = messages.filter(msg => {
    if (channel === 'all') return true;
    if (channel === 'public') return msg.type === 'public' || msg.type === 'system';
    if (channel === 'wolf') return msg.type === 'wolf';
    if (channel === 'dead') return msg.type === 'dead';
    if (channel === 'spectator') return msg.type === 'spectator';
    return false;
  });

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue, 'spectator');
    setInputValue('');
  };

  const channelButtons: { key: ChatChannel; label: string; color: string }[] = [
    { key: 'all', label: '全部', color: 'bg-gray-600' },
    { key: 'public', label: '公共', color: 'bg-blue-600' },
    { key: 'wolf', label: '狼人', color: 'bg-red-600' },
    { key: 'dead', label: '死者', color: 'bg-gray-500' },
    { key: 'spectator', label: '观战', color: 'bg-indigo-600' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 频道切换 */}
      <div className="flex gap-1 p-2 border-b border-gray-700">
        {channelButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setChannel(btn.key)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              channel === btn.key
                ? `${btn.color} text-white`
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {filteredMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`text-sm p-2 rounded ${
                msg.type === 'system'
                  ? 'bg-yellow-900/30 text-yellow-300'
                  : msg.type === 'wolf'
                  ? 'bg-red-900/30 text-red-300'
                  : msg.type === 'dead'
                  ? 'bg-gray-800/50 text-gray-400'
                  : msg.type === 'spectator'
                  ? 'bg-indigo-900/30 text-indigo-300'
                  : 'bg-gray-800/30'
              }`}
            >
              <span className="font-medium">
                {msg.type === 'spectator' && '👁️ '}
                {msg.type === 'wolf' && '🐺 '}
                {msg.type === 'dead' && '👻 '}
                {msg.senderName}:
              </span>{' '}
              <span>{msg.content}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 输入框 */}
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="观战聊天..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
};

// 主组件
interface SpectatorViewProps {
  onSendMessage: (content: string, type: 'spectator') => void;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({ onSendMessage }) => {
  const { players, spectatorFullState, gameState } = useGameStore();

  const phase = spectatorFullState?.phase || gameState.phase;
  const nightInfo = spectatorFullState?.nightInfo;
  const isNight = phase === GamePhase.NIGHT ||
    phase === GamePhase.NIGHT_CUPID ||
    phase === GamePhase.NIGHT_WEREWOLF ||
    phase === GamePhase.NIGHT_SEER ||
    phase === GamePhase.NIGHT_WITCH ||
    phase === GamePhase.NIGHT_GUARD;

  // 计算玩家的夜晚行动信息
  const getPlayerNightInfo = (playerId: string) => {
    if (!nightInfo) return undefined;
    return {
      isWolfTarget: nightInfo.wolfTarget === playerId,
      isGuardTarget: nightInfo.guardTarget === playerId,
      isSeerTarget: nightInfo.seerTarget === playerId,
      isWitchSaveTarget: nightInfo.witchSaveTarget === playerId,
      isWitchPoisonTarget: nightInfo.witchPoisonTarget === playerId,
    };
  };

  // 按阵营分组玩家
  const wolfPlayers = players.filter(p =>
    p.faction === Faction.WEREWOLF || p.role === Role.WEREWOLF || p.role === Role.ALPHA_WOLF
  );
  const villagerPlayers = players.filter(p =>
    p.faction === Faction.VILLAGER ||
    (!p.faction && p.role &&
      p.role !== Role.WEREWOLF &&
      p.role !== Role.ALPHA_WOLF &&
      p.role !== Role.CUPID)
  );
  const neutralPlayers = players.filter(p =>
    p.faction === Faction.NEUTRAL || p.role === Role.CUPID
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900">
      {/* 状态栏 */}
      <div className="p-4">
        <SpectatorStatusBar />
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧 - 玩家列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 夜晚信息面板 */}
          {isNight && nightInfo && (
            <NightInfoPanel nightInfo={nightInfo} players={players} />
          )}

          {/* 狼人阵营 */}
          {wolfPlayers.length > 0 && (
            <div>
              <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span>🐺</span>
                <span>狼人阵营 ({wolfPlayers.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {wolfPlayers.map(player => (
                  <SpectatorPlayerCard
                    key={player.id}
                    player={player}
                    nightInfo={getPlayerNightInfo(player.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 好人阵营 */}
          {villagerPlayers.length > 0 && (
            <div>
              <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                <span>👨‍🌾</span>
                <span>好人阵营 ({villagerPlayers.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {villagerPlayers.map(player => (
                  <SpectatorPlayerCard
                    key={player.id}
                    player={player}
                    nightInfo={getPlayerNightInfo(player.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 中立阵营 */}
          {neutralPlayers.length > 0 && (
            <div>
              <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <span>🌟</span>
                <span>中立阵营 ({neutralPlayers.length})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {neutralPlayers.map(player => (
                  <SpectatorPlayerCard
                    key={player.id}
                    player={player}
                    nightInfo={getPlayerNightInfo(player.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧 - 聊天面板 */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <div className="p-2 border-b border-gray-700 bg-gray-800/50">
            <h3 className="font-bold text-indigo-400 flex items-center gap-2">
              <span>💬</span>
              <span>聊天频道</span>
            </h3>
          </div>
          <SpectatorChat onSendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
};

// 观战者浮动提示
export const SpectatorBadge: React.FC = () => {
  const { isSpectator, spectators } = useGameStore();

  if (!isSpectator) return null;

  return (
    <motion.div
      className="fixed top-4 left-4 bg-indigo-900/90 border border-indigo-500 rounded-full px-4 py-2 flex items-center gap-2 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <span className="text-xl">👁️</span>
      <div>
        <div className="font-bold text-indigo-300 text-sm">观战模式</div>
        <div className="text-xs text-gray-400">{spectators.length} 人观战</div>
      </div>
    </motion.div>
  );
};

export default SpectatorView;
