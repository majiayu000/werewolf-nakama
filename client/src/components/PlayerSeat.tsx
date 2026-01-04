/**
 * PlayerSeat 组件
 * 显示玩家座位、状态和角色信息
 */

import { motion } from 'framer-motion';
import type { Player, Role, GamePhase } from '../types/werewolf';
import { ROLE_INFO, Faction } from '../types/werewolf';

interface PlayerSeatProps {
  player: Player;
  isMe: boolean;
  isSpeaking?: boolean;
  isTargeted?: boolean;
  isSelectable?: boolean;
  showRole?: boolean;
  isShooter?: boolean;  // 是否是当前开枪的玩家
  gamePhase: GamePhase;
  position: { x: number; y: number };
  onClick?: () => void;
}

// 角色图标映射（使用 emoji 占位，后续可替换为图片）
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

// 根据角色获取边框颜色
function getRoleBorderColor(role?: Role): string {
  if (!role) return 'border-gray-600';

  const info = ROLE_INFO[role];
  if (!info) return 'border-gray-600';

  switch (info.faction) {
    case Faction.WEREWOLF:
      return 'border-red-600';
    case Faction.VILLAGER:
      return 'border-green-600';
    case Faction.NEUTRAL:
      return 'border-purple-600';
    default:
      return 'border-gray-600';
  }
}

export function PlayerSeat({
  player,
  isMe,
  isSpeaking = false,
  isTargeted = false,
  isSelectable = false,
  showRole = false,
  isShooter = false,
  gamePhase,
  position,
  onClick,
}: PlayerSeatProps) {
  const isNight = gamePhase.startsWith('night');
  const isDead = !player.isAlive;
  const isDeathSkillPhase = gamePhase === 'death_skill';

  // 显示的角色（只有自己或游戏结束时显示）
  const displayRole = (isMe || showRole) ? player.role : undefined;

  return (
    <motion.div
      className={`
        absolute w-14 h-16 xs:w-16 xs:h-20 sm:w-18 sm:h-22 md:w-20 md:h-24 -translate-x-1/2 -translate-y-1/2
        flex flex-col items-center cursor-pointer
        transition-all duration-200
        ${isDead ? 'opacity-50 grayscale' : ''}
        ${isSelectable && !isDead ? 'hover:scale-110 active:scale-95' : ''}
        ${isTargeted ? 'ring-2 ring-red-500 ring-offset-1 md:ring-offset-2 ring-offset-gray-900 rounded-lg' : ''}
      `}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={isSelectable && !isDead ? onClick : undefined}
      whileHover={isSelectable && !isDead ? { scale: 1.1 } : {}}
      whileTap={isSelectable && !isDead ? { scale: 0.95 } : {}}
    >
      {/* 座位号 */}
      <div className="absolute -top-1.5 md:-top-2 left-1/2 -translate-x-1/2
                      bg-gray-700 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full
                      text-gray-300 font-mono">
        {player.seatNumber}
      </div>

      {/* 头像容器 */}
      <div className={`
        relative w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 md:border-3
        flex items-center justify-center
        transition-all duration-300
        ${isMe ? 'border-yellow-500 shadow-lg shadow-yellow-500/30' : getRoleBorderColor(displayRole)}
        ${isSpeaking ? 'animate-pulse ring-2 ring-blue-400' : ''}
        ${isNight && !isDead ? 'bg-gray-800' : 'bg-gray-700'}
      `}>
        {/* 角色图标或默认头像 */}
        <span className="text-lg xs:text-xl md:text-2xl">
          {isDead ? '💀' : (displayRole ? ROLE_ICONS[displayRole] : '👤')}
        </span>

        {/* 准备状态标识 */}
        {player.isReady && gamePhase === 'waiting' && (
          <motion.div
            className="absolute -right-1 -top-1 w-5 h-5 bg-green-500 rounded-full
                       flex items-center justify-center text-xs"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            ✓
          </motion.div>
        )}

        {/* 开枪者标识（死亡技能阶段） */}
        {isShooter && isDeathSkillPhase && (
          <motion.div
            className="absolute -right-2 -top-2"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span className="text-xl drop-shadow-lg">🔫</span>
          </motion.div>
        )}

        {/* 正在发言指示器 */}
        {isSpeaking && !isDead && (
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <span className="text-sm">🎤</span>
          </motion.div>
        )}

        {/* 死亡标记 */}
        {isDead && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center
                       bg-black/50 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-3xl">✖</span>
          </motion.div>
        )}
      </div>

      {/* 玩家名称 */}
      <div className={`
        mt-0.5 md:mt-1 text-[10px] xs:text-xs font-medium text-center truncate w-full
        ${isMe ? 'text-yellow-400' : isDead ? 'text-gray-500 line-through' : 'text-gray-300'}
      `}>
        {player.name.length > 4 ? player.name.slice(0, 4) + '..' : player.name}
        {isMe && <span className="text-yellow-500 hidden xs:inline"> (你)</span>}
        {player.idiotRevealed && <span className="text-purple-400"> 🤡</span>}
      </div>

      {/* 白痴翻牌标识 */}
      {player.idiotRevealed && !isDead && (
        <motion.div
          className="absolute -left-2 top-1/3 -translate-y-1/2"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400 }}
          title="已翻牌的白痴，无法投票"
        >
          <div className="bg-purple-600/80 text-white text-xs px-1 rounded">
            禁投
          </div>
        </motion.div>
      )}

      {/* 角色名称（仅自己可见） */}
      {displayRole && (
        <div className={`
          text-xs mt-0.5
          ${ROLE_INFO[displayRole]?.faction === Faction.WEREWOLF
            ? 'text-red-400'
            : ROLE_INFO[displayRole]?.faction === Faction.VILLAGER
              ? 'text-green-400'
              : 'text-purple-400'}
        `}>
          {ROLE_INFO[displayRole]?.name || displayRole}
        </div>
      )}

      {/* 投票指示 */}
      {player.votedFor && (
        <motion.div
          className="absolute -right-2 top-1/2 -translate-y-1/2"
          initial={{ scale: 0, x: -10 }}
          animate={{ scale: 1, x: 0 }}
        >
          <span className="text-lg">🗳️</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export default PlayerSeat;
