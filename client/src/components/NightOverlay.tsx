/**
 * NightOverlay 组件
 * 夜晚阶段遮罩和技能选择界面
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, SeerCheckResult, WitchPotions, NightKillInfo } from '../store/gameStore';
import { Role, GamePhase, Faction, ROLE_INFO, Player } from '../types/werewolf';

interface NightOverlayProps {
  onSkill: (skill: string, targetId: string | null) => void;
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

// 获取当前阶段的角色行动信息
function getPhaseInfo(phase: GamePhase, t: (key: string) => string): {
  role: Role | null;
  title: string;
  description: string;
  icon: string;
} {
  switch (phase) {
    case GamePhase.NIGHT_CUPID:
      return {
        role: Role.CUPID,
        title: t('nightOverlay.phase.cupid.title'),
        description: t('nightOverlay.phase.cupid.description'),
        icon: '💘',
      };
    case GamePhase.NIGHT_WEREWOLF:
      return {
        role: Role.WEREWOLF,
        title: t('nightOverlay.phase.werewolf.title'),
        description: t('nightOverlay.phase.werewolf.description'),
        icon: '🐺',
      };
    case GamePhase.NIGHT_SEER:
      return {
        role: Role.SEER,
        title: t('nightOverlay.phase.seer.title'),
        description: t('nightOverlay.phase.seer.description'),
        icon: '🔮',
      };
    case GamePhase.NIGHT_WITCH:
      return {
        role: Role.WITCH,
        title: t('nightOverlay.phase.witch.title'),
        description: t('nightOverlay.phase.witch.description'),
        icon: '🧙‍♀️',
      };
    case GamePhase.NIGHT_GUARD:
      return {
        role: Role.GUARD,
        title: t('nightOverlay.phase.guard.title'),
        description: t('nightOverlay.phase.guard.description'),
        icon: '🛡️',
      };
    default:
      return {
        role: null,
        title: t('phase.night'),
        description: t('nightAction.waiting'),
        icon: '🌙',
      };
  }
}

// 星星动画组件
function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

// 玩家选择卡片
function PlayerCard({
  player,
  isSelected,
  isSelectable,
  showRole,
  onClick,
  t,
}: {
  player: { id: string; name: string; seatNumber: number; isAlive: boolean; role?: Role };
  isSelected: boolean;
  isSelectable: boolean;
  showRole?: boolean;
  onClick: () => void;
  t?: (key: string) => string;
}) {
  const roleInfo = player.role ? ROLE_INFO[player.role] : null;

  return (
    <motion.button
      className={`
        relative w-20 h-28 rounded-xl p-2
        flex flex-col items-center justify-center gap-1
        transition-all duration-200
        ${!player.isAlive ? 'opacity-40 cursor-not-allowed' : ''}
        ${isSelectable && player.isAlive
          ? 'hover:scale-105 cursor-pointer'
          : 'cursor-not-allowed'}
        ${isSelected
          ? 'bg-red-600/80 border-2 border-red-400 shadow-lg shadow-red-500/50'
          : 'bg-gray-800/80 border-2 border-gray-600 hover:border-gray-500'}
      `}
      onClick={isSelectable && player.isAlive ? onClick : undefined}
      whileHover={isSelectable && player.isAlive ? { scale: 1.05 } : {}}
      whileTap={isSelectable && player.isAlive ? { scale: 0.95 } : {}}
      disabled={!isSelectable || !player.isAlive}
    >
      {/* 座位号 */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full
                      bg-gray-700 border border-gray-600
                      flex items-center justify-center
                      text-xs text-gray-300 font-bold">
        {player.seatNumber}
      </div>

      {/* 头像 */}
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-2xl
        ${player.isAlive ? 'bg-gray-700' : 'bg-gray-800'}
      `}>
        {!player.isAlive ? '💀' :
         showRole && player.role ? ROLE_ICONS[player.role] : '👤'}
      </div>

      {/* 名称 */}
      <span className={`
        text-xs truncate w-full text-center
        ${player.isAlive ? 'text-gray-200' : 'text-gray-500 line-through'}
      `}>
        {player.name}
      </span>

      {/* 角色（查验结果） */}
      {showRole && roleInfo && t && (
        <span className={`
          text-xs font-bold
          ${roleInfo.faction === Faction.WEREWOLF ? 'text-red-400' : 'text-green-400'}
        `}>
          {roleInfo.faction === Faction.WEREWOLF ? t('nightOverlay.werewolf') : t('nightOverlay.goodPerson')}
        </span>
      )}

      {/* 选中标记 */}
      {isSelected && (
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full
                     bg-red-500 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <span className="text-sm">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
}

// 女巫技能面板
function WitchPanel({
  players,
  playerId,
  nightKillInfo,
  witchPotions,
  onSave,
  onPoison,
  onSkip,
  t,
}: {
  players: Player[];
  playerId: string;
  nightKillInfo: NightKillInfo;
  witchPotions: WitchPotions;
  onSave: () => void;
  onPoison: (targetId: string) => void;
  onSkip: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [mode, setMode] = useState<'choose' | 'poison'>('choose');

  // 可毒杀的玩家（除自己和今晚被杀者以外的存活玩家）
  const poisonablePlayers = players.filter(
    (p) => p.isAlive && p.id !== playerId && p.id !== nightKillInfo.targetId
  );
  const [poisonTarget, setPoisonTarget] = useState<string | null>(null);

  // 今晚被杀的玩家
  const killedPlayer = nightKillInfo.targetId
    ? players.find((p) => p.id === nightKillInfo.targetId)
    : null;

  if (mode === 'poison') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold text-purple-300">{t('nightOverlay.witch.selectPoisonTarget')}</h3>
          <p className="text-sm text-gray-400 mt-1">{t('nightOverlay.witch.selectPlayerToPoison')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-xl">
          {poisonablePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelected={poisonTarget === player.id}
              isSelectable={true}
              onClick={() => setPoisonTarget(poisonTarget === player.id ? null : player.id)}
            />
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <motion.button
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                      text-white transition-colors"
            onClick={() => {
              setMode('choose');
              setPoisonTarget(null);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('common.back')}
          </motion.button>
          <motion.button
            className={`px-6 py-2 rounded-lg font-bold transition-colors
                       ${poisonTarget
                         ? 'bg-purple-700 hover:bg-purple-600 text-white'
                         : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
            onClick={() => poisonTarget && onPoison(poisonTarget)}
            disabled={!poisonTarget}
            whileHover={poisonTarget ? { scale: 1.05 } : {}}
            whileTap={poisonTarget ? { scale: 0.95 } : {}}
          >
            {t('nightOverlay.witch.confirmPoison')}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 今晚死亡信息 */}
      <motion.div
        className={`rounded-lg p-4 text-center ${
          killedPlayer
            ? 'bg-red-900/50 border border-red-600'
            : 'bg-green-900/30 border border-green-600/50'
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {killedPlayer ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">💀</span>
            <p className="text-red-300">
              {t('nightOverlay.witch.tonightKilled', { name: killedPlayer.name })}
            </p>
          </div>
        ) : (
          <p className="text-green-300">{t('nightOverlay.witch.peacefulNight')}</p>
        )}
      </motion.div>

      {/* 药水选项 */}
      <div className="flex justify-center gap-6">
        {/* 解药 */}
        <motion.button
          className={`
            flex flex-col items-center gap-2 p-4 rounded-xl w-32
            border-2 transition-all
            ${witchPotions.hasAntidote && killedPlayer
              ? 'border-green-500 bg-green-900/30 hover:bg-green-900/50 cursor-pointer'
              : 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'}
          `}
          onClick={witchPotions.hasAntidote && killedPlayer ? onSave : undefined}
          disabled={!witchPotions.hasAntidote || !killedPlayer}
          whileHover={witchPotions.hasAntidote && killedPlayer ? { scale: 1.05 } : {}}
          whileTap={witchPotions.hasAntidote && killedPlayer ? { scale: 0.95 } : {}}
        >
          <span className="text-4xl">💚</span>
          <span className="text-green-300 font-bold">{t('roles.witch.antidote')}</span>
          <span className="text-xs text-gray-400">
            {!witchPotions.hasAntidote
              ? t('nightOverlay.witch.used')
              : killedPlayer
                ? t('nightOverlay.witch.save', { name: killedPlayer.name })
                : t('nightOverlay.witch.noOneKilled')}
          </span>
        </motion.button>

        {/* 毒药 */}
        <motion.button
          className={`
            flex flex-col items-center gap-2 p-4 rounded-xl w-32
            border-2 transition-all
            ${witchPotions.hasPoison
              ? 'border-purple-500 bg-purple-900/30 hover:bg-purple-900/50 cursor-pointer'
              : 'border-gray-600 bg-gray-800/50 opacity-50 cursor-not-allowed'}
          `}
          onClick={witchPotions.hasPoison ? () => setMode('poison') : undefined}
          disabled={!witchPotions.hasPoison}
          whileHover={witchPotions.hasPoison ? { scale: 1.05 } : {}}
          whileTap={witchPotions.hasPoison ? { scale: 0.95 } : {}}
        >
          <span className="text-4xl">☠️</span>
          <span className="text-purple-300 font-bold">{t('roles.witch.poison')}</span>
          <span className="text-xs text-gray-400">
            {witchPotions.hasPoison ? t('nightOverlay.witch.poisonSomeone') : t('nightOverlay.witch.used')}
          </span>
        </motion.button>

        {/* 不使用 */}
        <motion.button
          className="flex flex-col items-center gap-2 p-4 rounded-xl w-32
                    border-2 border-gray-600 bg-gray-800/50 hover:bg-gray-700/50
                    cursor-pointer transition-all"
          onClick={onSkip}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-4xl">🚫</span>
          <span className="text-gray-300 font-bold">{t('nightOverlay.witch.dontUse')}</span>
          <span className="text-xs text-gray-400">{t('common.skip')}</span>
        </motion.button>
      </div>
    </div>
  );
}

// 守卫技能面板
function GuardPanel({
  players,
  lastGuardTarget,
  selectedTarget,
  onSelectTarget,
  onConfirm,
  onSkip,
  t,
}: {
  players: Player[];
  lastGuardTarget: string | null;
  selectedTarget: string | null;
  onSelectTarget: (id: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  // 可守护的玩家（存活玩家，包括自己）
  const selectablePlayers = players.filter((p) => p.isAlive);

  return (
    <div className="space-y-4">
      {/* 上一晚守护提示 */}
      {lastGuardTarget && (
        <motion.div
          className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-yellow-400 text-sm">
            {t('nightOverlay.guard.cantProtectSame', { name: players.find((p) => p.id === lastGuardTarget)?.name })}
          </span>
        </motion.div>
      )}

      <div className="text-center text-gray-400 text-sm">{t('nightOverlay.guard.selectHint')}</div>

      <div className="flex flex-wrap justify-center gap-3 max-w-xl">
        {selectablePlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isSelected={selectedTarget === player.id}
            isSelectable={player.id !== lastGuardTarget}
            onClick={() => onSelectTarget(player.id)}
          />
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <motion.button
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                    text-gray-300 transition-colors"
          onClick={onSkip}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t('roles.guard.skipProtect')}
        </motion.button>
        <motion.button
          className={`px-8 py-3 rounded-lg font-bold transition-colors
                     ${selectedTarget
                       ? 'bg-blue-700 hover:bg-blue-600 text-white'
                       : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
          onClick={onConfirm}
          disabled={!selectedTarget}
          whileHover={selectedTarget ? { scale: 1.05 } : {}}
          whileTap={selectedTarget ? { scale: 0.95 } : {}}
        >
          {t('nightOverlay.guard.confirmProtect')}
        </motion.button>
      </div>
    </div>
  );
}

// 预言家查验结果显示
function SeerResultPanel({
  checkResult,
  players,
  t,
}: {
  checkResult: SeerCheckResult;
  players: Player[];
  t: (key: string) => string;
}) {
  const checkedPlayer = players.find((p) => p.id === checkResult.targetId);

  return (
    <motion.div
      className="text-center space-y-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-gray-400">{t('nightOverlay.seer.checkResult')}</div>

      <motion.div
        className={`
          inline-block px-8 py-6 rounded-2xl border-2
          ${checkResult.faction === Faction.WEREWOLF
            ? 'bg-red-900/50 border-red-500'
            : 'bg-green-900/50 border-green-500'}
        `}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-xl font-bold text-white mb-2">
          {checkedPlayer?.name || checkResult.targetName}
        </div>
        <motion.div
          className={`text-3xl font-bold ${
            checkResult.faction === Faction.WEREWOLF ? 'text-red-400' : 'text-green-400'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {checkResult.faction === Faction.WEREWOLF ? t('nightOverlay.seer.isWerewolf') : t('nightOverlay.seer.isGood')}
        </motion.div>
      </motion.div>

      <p className="text-gray-500 text-sm">{t('nightOverlay.seer.rememberInfo')}</p>
    </motion.div>
  );
}

// 丘比特技能面板（选择两名玩家成为情侣）
function CupidPanel({
  players,
  playerId,
  cupidTargets,
  onSelectTarget,
  onConfirm,
  t,
}: {
  players: Player[];
  playerId: string;
  cupidTargets: { target1: string | null; target2: string | null };
  onSelectTarget: (targetId: string) => void;
  onConfirm: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  // 所有存活玩家都可以被选为情侣（包括丘比特自己）
  const selectablePlayers = players.filter((p) => p.isAlive);

  // 检查是否两个目标都已选中
  const bothSelected = cupidTargets.target1 && cupidTargets.target2;

  // 获取选中玩家的信息
  const target1Player = cupidTargets.target1
    ? players.find((p) => p.id === cupidTargets.target1)
    : null;
  const target2Player = cupidTargets.target2
    ? players.find((p) => p.id === cupidTargets.target2)
    : null;

  return (
    <div className="space-y-6">
      {/* 说明文字 */}
      <div className="text-center">
        <p className="text-pink-300 text-lg mb-2">{t('nightOverlay.cupid.connectHearts')}</p>
        <p className="text-gray-400 text-sm">{t('nightOverlay.cupid.selectTwoPlayers')}</p>
      </div>

      {/* 选中的情侣展示 */}
      <motion.div
        className="flex items-center justify-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* 第一个情侣 */}
        <div className={`
          w-24 h-32 rounded-xl border-2 flex flex-col items-center justify-center
          ${target1Player ? 'border-pink-500 bg-pink-900/30' : 'border-dashed border-gray-600 bg-gray-800/50'}
        `}>
          {target1Player ? (
            <>
              <span className="text-3xl">❤️</span>
              <span className="text-white font-bold mt-2">{target1Player.name}</span>
              <span className="text-xs text-gray-400">{t('game.seat')} {target1Player.seatNumber}</span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">{t('nightOverlay.cupid.selectFirst')}</span>
          )}
        </div>

        {/* 连接线 */}
        <motion.div
          className="flex items-center gap-1"
          animate={{ scale: bothSelected ? 1.1 : 1 }}
        >
          <span className="text-2xl">💘</span>
        </motion.div>

        {/* 第二个情侣 */}
        <div className={`
          w-24 h-32 rounded-xl border-2 flex flex-col items-center justify-center
          ${target2Player ? 'border-pink-500 bg-pink-900/30' : 'border-dashed border-gray-600 bg-gray-800/50'}
        `}>
          {target2Player ? (
            <>
              <span className="text-3xl">💕</span>
              <span className="text-white font-bold mt-2">{target2Player.name}</span>
              <span className="text-xs text-gray-400">{t('game.seat')} {target2Player.seatNumber}</span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">{t('nightOverlay.cupid.selectSecond')}</span>
          )}
        </div>
      </motion.div>

      {/* 玩家选择网格 */}
      <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
        {selectablePlayers.map((player) => {
          const isTarget1 = cupidTargets.target1 === player.id;
          const isTarget2 = cupidTargets.target2 === player.id;
          const isSelected = isTarget1 || isTarget2;

          return (
            <motion.button
              key={player.id}
              className={`
                relative w-16 h-20 rounded-lg p-1
                flex flex-col items-center justify-center gap-0.5
                transition-all duration-200
                ${isSelected
                  ? 'bg-pink-600/80 border-2 border-pink-400 shadow-lg shadow-pink-500/50'
                  : 'bg-gray-800/80 border-2 border-gray-600 hover:border-pink-400/50'}
                ${!player.isAlive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
              `}
              onClick={() => player.isAlive && onSelectTarget(player.id)}
              whileHover={player.isAlive ? { scale: 1.05 } : {}}
              whileTap={player.isAlive ? { scale: 0.95 } : {}}
              disabled={!player.isAlive}
            >
              {/* 座位号 */}
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full
                            bg-gray-700 border border-gray-600
                            flex items-center justify-center
                            text-xs text-gray-300 font-bold">
                {player.seatNumber}
              </div>

              {/* 选中标记 */}
              {isSelected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full
                           bg-pink-500 flex items-center justify-center text-sm"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  {isTarget1 ? '1' : '2'}
                </motion.div>
              )}

              {/* 头像 */}
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
                {player.id === playerId ? '👤' : '🧑'}
              </div>

              {/* 名称 */}
              <span className="text-xs truncate w-full text-center text-gray-200">
                {player.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center">
        <motion.button
          className={`
            px-8 py-3 rounded-lg font-bold text-lg transition-all
            ${bothSelected
              ? 'bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white shadow-lg shadow-pink-500/30'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
          `}
          onClick={onConfirm}
          disabled={!bothSelected}
          whileHover={bothSelected ? { scale: 1.05 } : {}}
          whileTap={bothSelected ? { scale: 0.95 } : {}}
        >
          {t('nightOverlay.cupid.confirmLink')}
        </motion.button>
      </div>

      {/* 提示 */}
      {bothSelected && (
        <motion.p
          className="text-center text-pink-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {t('nightOverlay.cupid.willBeLovers', { name1: target1Player?.name, name2: target2Player?.name })}
        </motion.p>
      )}
    </div>
  );
}

// 主组件
export function NightOverlay({ onSkill }: NightOverlayProps) {
  const { t } = useTranslation();
  const {
    players,
    playerId,
    myRole,
    gameState,
    nightTarget,
    setNightTarget,
    seerCheckResult,
    witchPotions,
    nightKillInfo,
    lastGuardTarget,
    cupidTargets,
    setCupidTargets,
  } = useGameStore();

  const phaseInfo = getPhaseInfo(gameState.phase, t);
  const isNight = gameState.phase.startsWith('night');
  const isMyTurn = myRole && phaseInfo.role === myRole ||
                   (myRole === Role.ALPHA_WOLF && phaseInfo.role === Role.WEREWOLF);

  // 获取自己以外的存活玩家
  const selectablePlayers = useMemo(
    () => players.filter((p) => p.id !== playerId && p.isAlive),
    [players, playerId]
  );

  // 获取所有狼人同伴（狼人阶段显示）
  const wolfCompanions = useMemo(
    () => players.filter((p) =>
      p.id !== playerId &&
      (p.role === Role.WEREWOLF || p.role === Role.ALPHA_WOLF)
    ),
    [players, playerId]
  );

  // 处理目标选择
  const handleSelectTarget = (targetId: string) => {
    setNightTarget(nightTarget === targetId ? null : targetId);
  };

  // 确认技能使用
  const handleConfirmSkill = () => {
    if (!myRole || !nightTarget) return;

    let skill = '';
    switch (gameState.phase) {
      case GamePhase.NIGHT_WEREWOLF:
        skill = 'kill';
        break;
      case GamePhase.NIGHT_SEER:
        skill = 'check';
        // 查验结果从服务器获取，存储在 seerCheckResult 中
        break;
      case GamePhase.NIGHT_GUARD:
        skill = 'protect';
        break;
      default:
        return;
    }

    onSkill(skill, nightTarget);
    setNightTarget(null);
  };

  // 跳过本回合
  const handleSkip = () => {
    onSkill('skip', null);
    setNightTarget(null);
  };

  // 女巫相关操作
  const handleWitchSave = () => {
    onSkill('save', null);
  };

  const handleWitchPoison = (targetId: string) => {
    onSkill('poison', targetId);
  };

  const handleWitchSkip = () => {
    onSkill('skip', null);
  };

  // 丘比特目标选择（切换选中状态）
  const handleCupidSelectTarget = (targetId: string) => {
    const { target1, target2 } = cupidTargets;

    // 如果已经选中，取消选中
    if (target1 === targetId) {
      setCupidTargets({ target1: target2, target2: null });
    } else if (target2 === targetId) {
      setCupidTargets({ ...cupidTargets, target2: null });
    } else {
      // 如果没有选中，添加到选中列表
      if (!target1) {
        setCupidTargets({ target1: targetId, target2: null });
      } else if (!target2) {
        setCupidTargets({ ...cupidTargets, target2: targetId });
      } else {
        // 已经选了两个，替换第二个
        setCupidTargets({ ...cupidTargets, target2: targetId });
      }
    }
  };

  // 丘比特确认连线
  const handleCupidConfirm = () => {
    const { target1, target2 } = cupidTargets;
    if (target1 && target2) {
      onSkill('link', `${target1},${target2}`);
      setCupidTargets({ target1: null, target2: null });
    }
  };

  if (!isNight) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-gray-950">
          <StarField />
          {/* 月亮 */}
          <motion.div
            className="absolute top-10 right-10 w-24 h-24 rounded-full
                       bg-gradient-to-br from-yellow-100 to-yellow-200
                       shadow-lg shadow-yellow-100/30"
            animate={{
              boxShadow: [
                '0 0 40px rgba(254, 249, 195, 0.3)',
                '0 0 60px rgba(254, 249, 195, 0.5)',
                '0 0 40px rgba(254, 249, 195, 0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>

        {/* 主内容区 */}
        <div className="relative z-10 w-full max-w-4xl mx-4">
          {/* 阶段标题 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.span
              className="text-5xl mb-4 block"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {phaseInfo.icon}
            </motion.span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {phaseInfo.title}
            </h2>
            <p className="text-gray-400">
              {isMyTurn ? phaseInfo.description : t('nightAction.waiting')}
            </p>
          </motion.div>

          {/* 轮到自己行动 */}
          {isMyTurn ? (
            <motion.div
              className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* 狼人阶段 - 显示同伴 */}
              {gameState.phase === GamePhase.NIGHT_WEREWOLF && wolfCompanions.length > 0 && (
                <div className="mb-6 pb-4 border-b border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">{t('nightOverlay.wolfCompanions')}:</h3>
                  <div className="flex gap-2">
                    {wolfCompanions.map((wolf) => (
                      <span
                        key={wolf.id}
                        className="px-3 py-1 bg-red-900/50 border border-red-600
                                 rounded-full text-sm text-red-300"
                      >
                        🐺 {wolf.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 丘比特专用界面（首夜） */}
              {gameState.phase === GamePhase.NIGHT_CUPID && myRole === Role.CUPID ? (
                <CupidPanel
                  players={players}
                  playerId={playerId}
                  cupidTargets={cupidTargets}
                  onSelectTarget={handleCupidSelectTarget}
                  onConfirm={handleCupidConfirm}
                  t={t}
                />
              ) : /* 女巫特殊界面 */
              gameState.phase === GamePhase.NIGHT_WITCH && myRole === Role.WITCH ? (
                <WitchPanel
                  players={players}
                  playerId={playerId}
                  nightKillInfo={nightKillInfo}
                  witchPotions={witchPotions}
                  onSave={handleWitchSave}
                  onPoison={handleWitchPoison}
                  onSkip={handleWitchSkip}
                  t={t}
                />
              ) : gameState.phase === GamePhase.NIGHT_GUARD && myRole === Role.GUARD ? (
                /* 守卫专用界面 */
                <GuardPanel
                  players={players}
                  lastGuardTarget={lastGuardTarget}
                  selectedTarget={nightTarget}
                  onSelectTarget={handleSelectTarget}
                  onConfirm={handleConfirmSkill}
                  onSkip={handleSkip}
                  t={t}
                />
              ) : gameState.phase === GamePhase.NIGHT_SEER && myRole === Role.SEER && seerCheckResult ? (
                /* 预言家查验结果显示 */
                <SeerResultPanel checkResult={seerCheckResult} players={players} t={t} />
              ) : (
                <>
                  {/* 玩家选择网格（狼人、预言家） */}
                  <div className="flex flex-wrap justify-center gap-4 mb-6">
                    {selectablePlayers.map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isSelected={nightTarget === player.id}
                        isSelectable={true}
                        onClick={() => handleSelectTarget(player.id)}
                      />
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-center gap-4">
                    <motion.button
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                                text-gray-300 transition-colors"
                      onClick={handleSkip}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('common.skip')}
                    </motion.button>
                    <motion.button
                      className={`
                        px-8 py-3 rounded-lg font-bold text-lg transition-all
                        ${nightTarget
                          ? gameState.phase === GamePhase.NIGHT_WEREWOLF
                            ? 'bg-red-700 hover:bg-red-600 text-white'
                            : 'bg-purple-700 hover:bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                      `}
                      onClick={handleConfirmSkill}
                      disabled={!nightTarget}
                      whileHover={nightTarget ? { scale: 1.05 } : {}}
                      whileTap={nightTarget ? { scale: 0.95 } : {}}
                    >
                      {gameState.phase === GamePhase.NIGHT_WEREWOLF && t('nightOverlay.confirmKill')}
                      {gameState.phase === GamePhase.NIGHT_SEER && t('nightOverlay.confirmCheck')}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            /* 等待其他玩家 */
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                😴
              </motion.div>
              <p className="text-gray-400 text-lg">{t('nightOverlay.closeYourEyes')}</p>
              <p className="text-gray-500 text-sm mt-2">
                {t('nightOverlay.phaseInProgress', { phase: phaseInfo.title })}
              </p>

              {/* 等待动画 */}
              <motion.div
                className="flex justify-center gap-2 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gray-600"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* 底部提示 */}
          <motion.div
            className="text-center mt-6 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('nightOverlay.dayNightHint', { day: gameState.dayCount })}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NightOverlay;
