/**
 * ResultModal 组件
 * 游戏结束时显示结果弹窗
 */

import { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Role, Faction, ROLE_INFO } from '../types/werewolf';
import { useSoundEffects, SoundType } from '../hooks/useSoundEffects';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
}

// 角色图标
const ROLE_ICONS: Record<Role, string> = {
  [Role.VILLAGER]: '👨‍🌾',
  [Role.WEREWOLF]: '🐺',
  [Role.SEER]: '🔮',
  [Role.WITCH]: '🧙‍♀️',
  [Role.HUNTER]: '🏹',
  [Role.GUARD]: '🛡️',
  [Role.IDIOT]: '🤡',
  [Role.ALPHA_WOLF]: '👹',
  [Role.CUPID]: '💘',
  [Role.LOVER]: '💕',
};

// 阵营样式 - 仅包含样式信息
const FACTION_STYLES: Record<Faction, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  [Faction.VILLAGER]: {
    bg: 'from-green-600 to-emerald-800',
    border: 'border-green-400',
    text: 'text-green-300',
    icon: '🏠',
  },
  [Faction.WEREWOLF]: {
    bg: 'from-red-600 to-red-900',
    border: 'border-red-400',
    text: 'text-red-300',
    icon: '🐺',
  },
  [Faction.NEUTRAL]: {
    bg: 'from-purple-600 to-purple-900',
    border: 'border-purple-400',
    text: 'text-purple-300',
    icon: '💫',
  },
  [Faction.LOVERS]: {
    bg: 'from-pink-600 to-rose-800',
    border: 'border-pink-400',
    text: 'text-pink-300',
    icon: '💕',
  },
};

// 获取阵营文本信息
function getFactionText(faction: Faction, t: (key: string) => string) {
  switch (faction) {
    case Faction.VILLAGER:
      return {
        title: t('resultModal.villagersWin'),
        description: t('resultModal.villagersWinDesc'),
      };
    case Faction.WEREWOLF:
      return {
        title: t('resultModal.werewolvesWin'),
        description: t('resultModal.werewolvesWinDesc'),
      };
    case Faction.LOVERS:
      return {
        title: t('resultModal.loversWin'),
        description: t('resultModal.loversWinDesc'),
      };
    default:
      return {
        title: t('resultModal.gameOver'),
        description: t('resultModal.gameOverDesc'),
      };
  }
}

// 玩家结果卡片
function PlayerResultCard({
  player,
  isMe,
  isWinner,
  delay,
  t,
}: {
  player: { id: string; name: string; role?: Role; isAlive: boolean };
  isMe: boolean;
  isWinner: boolean;
  delay: number;
  t: (key: string) => string;
}) {
  const roleInfo = player.role ? ROLE_INFO[player.role] : null;
  const factionColor = roleInfo?.faction === Faction.WEREWOLF
    ? 'border-red-500 bg-red-950/50'
    : roleInfo?.faction === Faction.VILLAGER
    ? 'border-green-500 bg-green-950/50'
    : 'border-purple-500 bg-purple-950/50';

  return (
    <motion.div
      className={`
        relative flex items-center gap-3 p-3 rounded-lg
        border-2 ${factionColor}
        ${isMe ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : ''}
        ${!player.isAlive ? 'opacity-60' : ''}
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      {/* 角色图标 */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-2xl
        ${roleInfo?.faction === Faction.WEREWOLF ? 'bg-red-900' :
          roleInfo?.faction === Faction.VILLAGER ? 'bg-green-900' : 'bg-purple-900'}
      `}>
        {player.role ? ROLE_ICONS[player.role] : '❓'}
      </div>

      {/* 玩家信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isMe ? 'text-yellow-400' : 'text-white'}`}>
            {player.name}
          </span>
          {isMe && <span className="text-xs text-yellow-500">({t('resultModal.you')})</span>}
          {!player.isAlive && <span className="text-xs text-gray-500">💀</span>}
        </div>
        <div className={`text-sm ${
          roleInfo?.faction === Faction.WEREWOLF ? 'text-red-400' :
          roleInfo?.faction === Faction.VILLAGER ? 'text-green-400' : 'text-purple-400'
        }`}>
          {roleInfo?.name || t('common.unknown')}
        </div>
      </div>

      {/* 胜负标记 */}
      <div className={`
        px-2 py-1 rounded text-xs font-medium
        ${isWinner ? 'bg-yellow-600 text-yellow-100' : 'bg-gray-700 text-gray-400'}
      `}>
        {isWinner ? t('result.victory') : t('result.defeat')}
      </div>

      {/* 存活标记 */}
      {player.isAlive && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full
                     bg-green-500 flex items-center justify-center text-xs"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring' }}
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  );
}

// 游戏统计
function GameStats({
  totalPlayers,
  survivors,
  werewolfCount,
  villagerCount,
  dayCount,
  t,
}: {
  totalPlayers: number;
  survivors: number;
  werewolfCount: number;
  villagerCount: number;
  dayCount: number;
  t: (key: string) => string;
}) {
  const stats = [
    { label: t('result.stats.totalPlayers'), value: totalPlayers, icon: '👥' },
    { label: t('result.stats.survivors'), value: survivors, icon: '💚' },
    { label: t('resultModal.werewolves'), value: werewolfCount, icon: '🐺' },
    { label: t('resultModal.villagers'), value: villagerCount, icon: '🏠' },
    { label: t('result.stats.days'), value: dayCount, icon: '🌅' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="flex flex-col items-center gap-1 px-4 py-2 bg-gray-800/50 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + index * 0.1 }}
        >
          <span className="text-2xl">{stat.icon}</span>
          <span className="text-xl font-bold text-white">{stat.value}</span>
          <span className="text-xs text-gray-400">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// 烟花动画
function Fireworks() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][
        Math.floor(Math.random() * 5)
      ],
      delay: Math.random() * 2,
      size: 4 + Math.random() * 8,
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            y: [0, -50, -100],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </div>
  );
}

// 主组件
export function ResultModal({ isOpen, onClose, onPlayAgain }: ResultModalProps) {
  const { t } = useTranslation();
  const { players, playerId, gameState } = useGameStore();
  const { playSound } = useSoundEffects();
  const hasPlayedResultSound = useRef(false);

  const winner = gameState.winner || Faction.NEUTRAL;
  const factionStyle = FACTION_STYLES[winner];
  const factionText = getFactionText(winner, t);

  // 获取自己的角色信息，判断是否胜利
  const myPlayer = players.find(p => p.id === playerId);
  const myFaction = myPlayer?.role
    ? (myPlayer.role === Role.WEREWOLF || myPlayer.role === Role.ALPHA_WOLF
        ? Faction.WEREWOLF
        : Faction.VILLAGER)
    : null;
  const isMyVictory = myFaction === winner || winner === Faction.LOVERS;

  // 播放胜利/失败音效（只播放一次）
  useEffect(() => {
    if (isOpen && !hasPlayedResultSound.current) {
      hasPlayedResultSound.current = true;
      // 延迟播放让动画先开始
      setTimeout(() => {
        if (isMyVictory) {
          playSound(SoundType.VICTORY);
        } else {
          playSound(SoundType.DEFEAT);
        }
      }, 300);
    }
    // 重置标记当弹窗关闭时
    if (!isOpen) {
      hasPlayedResultSound.current = false;
    }
  }, [isOpen, isMyVictory, playSound]);

  // 统计数据
  const stats = useMemo(() => {
    const survivors = players.filter((p) => p.isAlive);
    const werewolves = players.filter(
      (p) => p.role === Role.WEREWOLF || p.role === Role.ALPHA_WOLF
    );
    const villagers = players.filter(
      (p) => p.role && ![Role.WEREWOLF, Role.ALPHA_WOLF].includes(p.role)
    );

    return {
      totalPlayers: players.length,
      survivors: survivors.length,
      werewolfCount: werewolves.length,
      villagerCount: villagers.length,
      dayCount: gameState.dayCount,
    };
  }, [players, gameState.dayCount]);

  // 按阵营分组玩家
  const groupedPlayers = useMemo(() => {
    const werewolves = players.filter(
      (p) => p.role === Role.WEREWOLF || p.role === Role.ALPHA_WOLF
    );
    const villagers = players.filter(
      (p) => p.role && ![Role.WEREWOLF, Role.ALPHA_WOLF, Role.CUPID, Role.LOVER].includes(p.role)
    );
    const others = players.filter(
      (p) => p.role === Role.CUPID || p.role === Role.LOVER
    );

    return { werewolves, villagers, others };
  }, [players]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
          />

          {/* 烟花效果（仅胜利方） */}
          {winner !== Faction.NEUTRAL && <Fireworks />}

          {/* 弹窗内容 */}
          <motion.div
            className={`
              relative z-10 w-full max-w-2xl mx-4
              max-h-[90vh] overflow-y-auto
              bg-gradient-to-br ${factionStyle.bg}
              border-2 ${factionStyle.border}
              rounded-2xl shadow-2xl
            `}
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="p-6 text-center border-b border-white/20">
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                {factionStyle.icon}
              </motion.div>

              <motion.h1
                className="text-3xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {factionText.title}
              </motion.h1>

              <motion.p
                className={`text-sm ${factionStyle.text}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {factionText.description}
              </motion.p>
            </div>

            {/* 游戏统计 */}
            <div className="p-6 border-b border-white/20">
              <GameStats {...stats} t={t} />
            </div>

            {/* 玩家列表 */}
            <div className="p-6 space-y-6">
              {/* 狼人阵营 */}
              {groupedPlayers.werewolves.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                    <span>🐺</span> {t('factions.werewolves')}
                  </h3>
                  <div className="space-y-2">
                    {groupedPlayers.werewolves.map((player, index) => (
                      <PlayerResultCard
                        key={player.id}
                        player={player}
                        isMe={player.id === playerId}
                        isWinner={winner === Faction.WEREWOLF}
                        delay={0.8 + index * 0.1}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 好人阵营 */}
              {groupedPlayers.villagers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                    <span>🏠</span> {t('factions.villagers')}
                  </h3>
                  <div className="space-y-2">
                    {groupedPlayers.villagers.map((player, index) => (
                      <PlayerResultCard
                        key={player.id}
                        player={player}
                        isMe={player.id === playerId}
                        isWinner={winner === Faction.VILLAGER}
                        delay={1.2 + index * 0.1}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 中立阵营 */}
              {groupedPlayers.others.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                    <span>💫</span> {t('factions.neutral')}
                  </h3>
                  <div className="space-y-2">
                    {groupedPlayers.others.map((player, index) => (
                      <PlayerResultCard
                        key={player.id}
                        player={player}
                        isMe={player.id === playerId}
                        isWinner={false}
                        delay={1.6 + index * 0.1}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t border-white/20 flex justify-center gap-4">
              {onPlayAgain && (
                <motion.button
                  className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg
                            font-bold text-white transition-colors"
                  onClick={() => {
                    playSound(SoundType.BUTTON_CLICK);
                    onPlayAgain();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('result.playAgain')}
                </motion.button>
              )}
              <motion.button
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg
                          font-medium text-white transition-colors"
                onClick={() => {
                  playSound(SoundType.BUTTON_CLICK);
                  onClose();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('result.backToLobby')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 快速结果提示组件（用于游戏结束时的顶部通知）
export function GameOverBanner({
  winner,
  onViewDetails,
}: {
  winner: Faction;
  onViewDetails: () => void;
}) {
  const { t } = useTranslation();
  const factionStyle = FACTION_STYLES[winner];
  const factionText = getFactionText(winner, t);

  return (
    <motion.div
      className={`
        fixed top-0 left-0 right-0 z-50
        py-4 px-6
        bg-gradient-to-r ${factionStyle.bg}
        border-b-2 ${factionStyle.border}
        flex items-center justify-center gap-4
      `}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
    >
      <motion.span
        className="text-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      >
        {factionStyle.icon}
      </motion.span>
      <span className="text-xl font-bold text-white">{factionText.title}</span>
      <motion.button
        className="ml-4 px-4 py-1 bg-white/20 hover:bg-white/30
                  rounded-full text-sm text-white transition-colors"
        onClick={onViewDetails}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {t('resultModal.viewDetails')}
      </motion.button>
    </motion.div>
  );
}

export default ResultModal;
