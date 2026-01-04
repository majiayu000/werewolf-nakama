/**
 * GameRoom 组件
 * 游戏房间主界面，包含圆桌布局和游戏控制
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerSeat } from './PlayerSeat';
import { ChatPanel } from './ChatPanel';
import { VotingPanel } from './VotingPanel';
import { DayTimer, CompactTimer, SpeakingQueue } from './DayTimer';
import { SheriffPanel, SheriffStatusBar } from './SheriffPanel';
import { LastWordsPanel, LastWordsStatusBar } from './LastWordsPanel';
import { PhaseTransition, usePhaseTransition } from './PhaseTransition';
import {
  VoteLines,
  VoteFlightContainer,
  VoteResultReveal,
  VoteTargetRing,
  useVoteAnimation,
} from './VoteAnimation';
import { DeathEffectOverlay } from './DeathEffect';
import { KeyboardShortcutsHelp, ShortcutHint } from './KeyboardShortcutsHelp';
import { SpectatorView, SpectatorBadge } from './SpectatorView';
import { useGameStore } from '../store/gameStore';
import { GamePhase, Role, ROLE_INFO, Faction } from '../types/werewolf';
import { useSoundEffects, SoundType } from '../hooks/useSoundEffects';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface GameRoomProps {
  onLeave: () => void;
  onReady: (ready: boolean) => void;
  onVote: (targetId: string | null) => void;
  onSkill: (skill: string, targetId: string | null) => void;
  onSendMessage: (content: string, chatType: 'public' | 'wolf' | 'dead' | 'spectator') => void;
  // 警长系统
  onJoinSheriffCampaign: () => void;
  onQuitSheriffCampaign: () => void;
  onSheriffVote: (candidateId: string) => void;
  onSheriffTransfer: (targetId: string | null) => void;
  // 遗言系统
  onLastWordsSpeak: (content: string) => void;
  onLastWordsSkip: () => void;
}

// 计算玩家在圆桌上的位置
function calculateSeatPositions(
  totalSeats: number,
  centerX = 50,
  centerY = 50,
  radiusX = 40,
  radiusY = 35
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < totalSeats; i++) {
    // 从顶部开始，顺时针排列
    const angle = ((2 * Math.PI) / totalSeats) * i - Math.PI / 2;
    positions.push({
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    });
  }

  return positions;
}

// 获取阶段显示信息
function getPhaseDisplay(phase: GamePhase, t: (key: string) => string): { label: string; color: string; icon: string } {
  switch (phase) {
    case GamePhase.WAITING:
      return { label: t('phase.waiting'), color: 'bg-gray-700', icon: '⏳' };
    case GamePhase.STARTING:
      return { label: t('gameRoom.assigningRoles'), color: 'bg-blue-700', icon: '🎭' };
    case GamePhase.NIGHT:
    case GamePhase.NIGHT_WEREWOLF:
    case GamePhase.NIGHT_SEER:
    case GamePhase.NIGHT_WITCH:
    case GamePhase.NIGHT_GUARD:
      return { label: t('phase.night'), color: 'bg-indigo-900', icon: '🌙' };
    case GamePhase.DAY_ANNOUNCE:
      return { label: t('transition.dayText'), color: 'bg-orange-700', icon: '☀️' };
    case GamePhase.SHERIFF_CAMPAIGN:
      return { label: t('phase.sheriff.campaign'), color: 'bg-yellow-700', icon: '🏅' };
    case GamePhase.SHERIFF_SPEECH:
      return { label: t('phase.sheriff.speech'), color: 'bg-green-700', icon: '🎤' };
    case GamePhase.SHERIFF_VOTING:
      return { label: t('phase.sheriff.voting'), color: 'bg-yellow-600', icon: '🗳️' };
    case GamePhase.SHERIFF_TRANSFER:
      return { label: t('phase.sheriff.transfer'), color: 'bg-yellow-800', icon: '🏅' };
    case GamePhase.DAY_DISCUSSION:
      return { label: t('phase.discussion'), color: 'bg-yellow-700', icon: '💬' };
    case GamePhase.DAY_VOTING:
      return { label: t('phase.voting'), color: 'bg-red-700', icon: '🗳️' };
    case GamePhase.DAY_EXECUTION:
      return { label: t('gameRoom.execution'), color: 'bg-red-900', icon: '⚔️' };
    case GamePhase.LAST_WORDS:
      return { label: t('phase.lastWords'), color: 'bg-gray-800', icon: '⚰️' };
    case GamePhase.DEATH_SKILL:
      return { label: t('phase.deathSkill'), color: 'bg-orange-700', icon: '🔫' };
    case GamePhase.GAME_OVER:
      return { label: t('result.gameOver'), color: 'bg-purple-900', icon: '🏆' };
    default:
      return { label: phase, color: 'bg-gray-700', icon: '❓' };
  }
}

// 判断玩家是否可以选择目标
function canSelectTarget(
  phase: GamePhase,
  myRole: Role | null,
  isAlive: boolean,
  playerId: string,
  currentShooter: string | null
): { canSelect: boolean; actionType: 'vote' | 'skill' | 'shoot' | null } {
  // 死亡技能阶段 - 只有当前射手可以选择
  if (phase === GamePhase.DEATH_SKILL) {
    if (currentShooter === playerId) {
      return { canSelect: true, actionType: 'shoot' };
    }
    return { canSelect: false, actionType: null };
  }

  if (!isAlive) return { canSelect: false, actionType: null };

  // 投票阶段
  if (phase === GamePhase.DAY_VOTING) {
    return { canSelect: true, actionType: 'vote' };
  }

  // 夜晚技能阶段
  if (myRole) {
    if (phase === GamePhase.NIGHT_WEREWOLF && (myRole === Role.WEREWOLF || myRole === Role.ALPHA_WOLF)) {
      return { canSelect: true, actionType: 'skill' };
    }
    if (phase === GamePhase.NIGHT_SEER && myRole === Role.SEER) {
      return { canSelect: true, actionType: 'skill' };
    }
    if (phase === GamePhase.NIGHT_WITCH && myRole === Role.WITCH) {
      return { canSelect: true, actionType: 'skill' };
    }
    if (phase === GamePhase.NIGHT_GUARD && myRole === Role.GUARD) {
      return { canSelect: true, actionType: 'skill' };
    }
  }

  return { canSelect: false, actionType: null };
}

// 侧边栏标签类型
type SidebarTab = 'chat' | 'vote' | 'sheriff' | 'lastwords';

// 移动端检测 hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// 判断是否是警长相关阶段
function isSheriffPhase(phase: GamePhase): boolean {
  return (
    phase === GamePhase.SHERIFF_CAMPAIGN ||
    phase === GamePhase.SHERIFF_SPEECH ||
    phase === GamePhase.SHERIFF_VOTING ||
    phase === GamePhase.SHERIFF_TRANSFER
  );
}

export function GameRoom({
  onLeave,
  onReady,
  onVote,
  onSkill,
  onSendMessage,
  onJoinSheriffCampaign,
  onQuitSheriffCampaign,
  onSheriffVote,
  onSheriffTransfer,
  onLastWordsSpeak,
  onLastWordsSkip,
}: GameRoomProps) {
  const { t } = useTranslation();
  const {
    playerId,
    players,
    gameState,
    myRole,
    nightTarget,
    setNightTarget,
    voteTarget,
    setVoteTarget,
    shootTarget,
    setShootTarget,
    currentShooter,
    voteResult,
    speakingState,
    nextSpeaker,
    sheriffId,
    lastWordsInfo,
    isMyLastWords,
    // 死亡特效相关
    deathEvents,
    popDeathEvent,
    currentDeathEvent,
    setCurrentDeathEvent,
    // 观战模式
    isSpectator,
  } = useGameStore();

  // 观战模式：显示观战者专用视图
  if (isSpectator) {
    return (
      <div className="h-screen">
        <SpectatorBadge />
        <SpectatorView onSendMessage={(content) => onSendMessage(content, 'spectator')} />
      </div>
    );
  }

  const [isReady, setIsReady] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const isMobile = useIsMobile();

  // 投票动画系统
  const {
    flyEvents,
    addFlyEvent,
    removeFlyEvent,
    clearFlyEvents,
    showResultReveal,
    triggerResultReveal,
    hideResultReveal,
  } = useVoteAnimation();

  // 跟踪玩家投票变化以触发飞行动画
  const prevVotesRef = useRef<Record<string, string | undefined>>({});

  // 音效系统
  const { playSound, setEnabled: setSoundEnabledFn, playSkillSound } = useSoundEffects();

  // 阶段切换跟踪
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const transitionType = usePhaseTransition(gameState.phase, prevPhaseRef.current);

  // 更新前一个阶段
  useEffect(() => {
    // 延迟更新，确保过渡动画能正确检测到变化
    const timer = setTimeout(() => {
      prevPhaseRef.current = gameState.phase;
    }, 100);
    return () => clearTimeout(timer);
  }, [gameState.phase]);

  // 过渡动画时播放对应音效
  useEffect(() => {
    if (transitionType === 'day-to-night') {
      playSound(SoundType.NIGHT_START);
    } else if (transitionType === 'night-to-day') {
      playSound(SoundType.DAY_START);
    }
  }, [transitionType, playSound]);

  // 切换音效开关
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setSoundEnabledFn(newState);
    if (newState) {
      playSound(SoundType.BUTTON_CLICK);
    }
  }, [soundEnabled, setSoundEnabledFn, playSound]);

  // 处理准备按钮
  const handleReady = useCallback(() => {
    const newReady = !isReady;
    setIsReady(newReady);
    onReady(newReady);
    playSound(newReady ? SoundType.READY : SoundType.BUTTON_CLICK);
  }, [isReady, onReady, playSound]);

  // 确认投票
  const handleConfirmVote = useCallback(() => {
    onVote(voteTarget);
    setVoteTarget(null);
    playSound(SoundType.VOTE_CAST);
  }, [voteTarget, onVote, setVoteTarget, playSound]);

  // 确认技能使用
  const handleConfirmSkill = useCallback(() => {
    if (!myRole || !nightTarget) return;

    let skill = '';
    let soundRole = '';
    switch (myRole) {
      case Role.WEREWOLF:
      case Role.ALPHA_WOLF:
        skill = 'kill';
        soundRole = 'werewolf';
        break;
      case Role.SEER:
        skill = 'check';
        soundRole = 'seer';
        break;
      case Role.WITCH:
        skill = 'save';
        soundRole = 'witch_save';
        break;
      case Role.GUARD:
        skill = 'protect';
        soundRole = 'guard';
        break;
      default:
        return;
    }

    onSkill(skill, nightTarget);
    setNightTarget(null);
    playSkillSound(soundRole);
  }, [myRole, nightTarget, onSkill, setNightTarget, playSkillSound]);

  // 确认开枪
  const handleConfirmShoot = useCallback(() => {
    onSkill('shoot', shootTarget || null);
    setShootTarget(null);
    if (shootTarget) {
      playSound(SoundType.HUNTER_SHOOT);
    }
  }, [shootTarget, onSkill, setShootTarget, playSound]);

  // 放弃开枪
  const handleSkipShoot = useCallback(() => {
    onSkill('shoot', null);
    setShootTarget(null);
    playSound(SoundType.BUTTON_CLICK);
  }, [onSkill, setShootTarget, playSound]);

  // 获取自己的玩家信息（提前声明用于键盘快捷键）
  const me = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  // 判断是否可以选择目标的辅助函数
  const getActionType = useCallback((): 'vote' | 'skill' | 'shoot' | null => {
    if (gameState.phase === GamePhase.DEATH_SKILL && currentShooter === playerId) {
      return 'shoot';
    }
    if (!me?.isAlive) return null;
    if (gameState.phase === GamePhase.DAY_VOTING) return 'vote';
    if (gameState.phase === GamePhase.NIGHT_WEREWOLF && (myRole === Role.WEREWOLF || myRole === Role.ALPHA_WOLF)) {
      return 'skill';
    }
    if (gameState.phase === GamePhase.NIGHT_SEER && myRole === Role.SEER) return 'skill';
    if (gameState.phase === GamePhase.NIGHT_WITCH && myRole === Role.WITCH) return 'skill';
    if (gameState.phase === GamePhase.NIGHT_GUARD && myRole === Role.GUARD) return 'skill';
    return null;
  }, [gameState.phase, me?.isAlive, myRole, currentShooter, playerId]);

  // 键盘快捷键系统
  const handleKeyboardSelectPlayer = useCallback((seatNumber: number) => {
    const targetPlayer = players.find(p => p.seatNumber === seatNumber);
    if (!targetPlayer || targetPlayer.id === playerId) return;
    if (!targetPlayer.isAlive) return;

    const currentActionType = getActionType();

    // 根据当前阶段处理选择
    if (currentActionType === 'vote') {
      setVoteTarget(voteTarget === targetPlayer.id ? null : targetPlayer.id);
      playSound(SoundType.BUTTON_CLICK);
    } else if (currentActionType === 'skill') {
      setNightTarget(nightTarget === targetPlayer.id ? null : targetPlayer.id);
      playSound(SoundType.BUTTON_CLICK);
    } else if (currentActionType === 'shoot') {
      setShootTarget(shootTarget === targetPlayer.id ? null : targetPlayer.id);
      playSound(SoundType.BUTTON_CLICK);
    }
  }, [
    players, playerId, getActionType,
    voteTarget, nightTarget, shootTarget,
    setVoteTarget, setNightTarget, setShootTarget, playSound
  ]);

  const handleKeyboardConfirm = useCallback(() => {
    const currentActionType = getActionType();

    if (gameState.phase === GamePhase.WAITING) {
      handleReady();
    } else if (currentActionType === 'vote' && voteTarget) {
      handleConfirmVote();
    } else if (currentActionType === 'skill' && nightTarget) {
      handleConfirmSkill();
    } else if (currentActionType === 'shoot') {
      handleConfirmShoot();
    }
  }, [
    gameState.phase, voteTarget, nightTarget, getActionType,
    handleReady, handleConfirmVote, handleConfirmSkill, handleConfirmShoot
  ]);

  const handleKeyboardSkip = useCallback(() => {
    const currentActionType = getActionType();
    if (currentActionType === 'shoot') {
      handleSkipShoot();
    }
  }, [getActionType, handleSkipShoot]);

  const handleKeyboardCancel = useCallback(() => {
    // 关闭快捷键帮助
    if (showShortcutsHelp) {
      setShowShortcutsHelp(false);
      return;
    }
    // 关闭移动端侧边栏
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
      return;
    }
    // 取消当前选择
    if (voteTarget) {
      setVoteTarget(null);
      playSound(SoundType.BUTTON_CLICK);
    } else if (nightTarget) {
      setNightTarget(null);
      playSound(SoundType.BUTTON_CLICK);
    } else if (shootTarget) {
      setShootTarget(null);
      playSound(SoundType.BUTTON_CLICK);
    }
  }, [
    showShortcutsHelp, isMobile, sidebarOpen, voteTarget, nightTarget, shootTarget,
    setVoteTarget, setNightTarget, setShootTarget, playSound
  ]);

  const handleKeyboardFocusChat = useCallback(() => {
    if (!isMobile) {
      setSidebarTab('chat');
    } else {
      setSidebarOpen(true);
      setSidebarTab('chat');
    }
    // 聚焦到聊天输入框（需要 ChatPanel 支持 ref）
    setTimeout(() => {
      const input = document.querySelector('[data-chat-input]') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }, [isMobile]);

  const handleKeyboardSwitchChannel = useCallback(() => {
    // 在聊天面板中触发频道切换
    const switchBtn = document.querySelector('[data-channel-switch]') as HTMLButtonElement;
    if (switchBtn) switchBtn.click();
  }, []);

  // 使用键盘快捷键 hook
  useKeyboardShortcuts({
    enabled: !showShortcutsHelp,
    onToggleChat: () => {
      if (isMobile) {
        setSidebarOpen(true);
      }
      setSidebarTab('chat');
      playSound(SoundType.BUTTON_CLICK);
    },
    onToggleVote: () => {
      if (isMobile) {
        setSidebarOpen(true);
      }
      setSidebarTab('vote');
      playSound(SoundType.BUTTON_CLICK);
    },
    onToggleSheriff: () => {
      if (isMobile) {
        setSidebarOpen(true);
      }
      setSidebarTab('sheriff');
      playSound(SoundType.BUTTON_CLICK);
    },
    onToggleSound: toggleSound,
    onReady: () => {
      if (gameState.phase === GamePhase.WAITING) {
        handleReady();
      }
    },
    onConfirm: handleKeyboardConfirm,
    onSkip: handleKeyboardSkip,
    onCancel: handleKeyboardCancel,
    onSelectPlayer: handleKeyboardSelectPlayer,
    onFocusChat: handleKeyboardFocusChat,
    onSwitchChannel: handleKeyboardSwitchChannel,
    onShowHelp: () => setShowShortcutsHelp(true),
  });

  // 投票阶段自动切换到投票面板
  const isVotingPhase = gameState.phase === GamePhase.DAY_VOTING;
  const isDiscussionPhase = gameState.phase === GamePhase.DAY_DISCUSSION;
  const isSheriffPhaseActive = isSheriffPhase(gameState.phase);
  const isLastWordsPhase = gameState.phase === GamePhase.LAST_WORDS;

  useEffect(() => {
    if (isLastWordsPhase) {
      setSidebarTab('lastwords');
    } else if (isVotingPhase) {
      setSidebarTab('vote');
    } else if (isSheriffPhaseActive) {
      setSidebarTab('sheriff');
    }
  }, [isVotingPhase, isSheriffPhaseActive, isLastWordsPhase]);

  // 监听玩家投票变化，触发飞行动画
  useEffect(() => {
    if (!isVotingPhase) {
      prevVotesRef.current = {};
      clearFlyEvents();
      return;
    }

    players.forEach((player) => {
      const prevTarget = prevVotesRef.current[player.id];
      const currentTarget = player.votedFor;

      // 如果玩家新增了投票目标，触发飞行动画
      if (currentTarget && currentTarget !== prevTarget) {
        addFlyEvent(player.id, currentTarget);
        playSound(SoundType.VOTE_CAST);
      }

      prevVotesRef.current[player.id] = currentTarget;
    });
  }, [players, isVotingPhase, addFlyEvent, clearFlyEvents, playSound]);

  // 监听投票结果，触发结果揭示动画
  useEffect(() => {
    if (voteResult && !showResultReveal) {
      triggerResultReveal();
    }
  }, [voteResult, showResultReveal, triggerResultReveal]);

  // 阶段变化时清除投票动画状态
  useEffect(() => {
    if (!isVotingPhase && gameState.phase !== GamePhase.DAY_EXECUTION) {
      hideResultReveal();
    }
  }, [gameState.phase, isVotingPhase, hideResultReveal]);

  // 获取发言顺序中的玩家对象列表
  const speakingOrderPlayers = useMemo(() => {
    return speakingState.speakingOrder
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }, [speakingState.speakingOrder, players]);

  // 获取当前发言者
  const currentSpeaker = useMemo(() => {
    if (!speakingState.currentSpeakerId) return null;
    return players.find((p) => p.id === speakingState.currentSpeakerId) || null;
  }, [speakingState.currentSpeakerId, players]);

  // 计算座位位置
  const maxSeats = 12; // 最大显示座位数
  const seatPositions = useMemo(
    () => calculateSeatPositions(Math.max(players.length, 6, maxSeats)),
    [players.length]
  );

  // 处理死亡事件队列
  useEffect(() => {
    if (currentDeathEvent) return; // 正在播放
    if (deathEvents.length === 0) return; // 队列为空

    // 从队列中获取下一个事件
    const nextEvent = popDeathEvent();
    if (nextEvent) {
      // 根据座位号计算玩家位置
      const playerIndex = players.findIndex((p) => p.id === nextEvent.playerId);
      if (playerIndex !== -1 && seatPositions[playerIndex]) {
        nextEvent.position = seatPositions[playerIndex];
      }
      setCurrentDeathEvent(nextEvent);

      // 播放死亡音效
      playSound(SoundType.PLAYER_DEATH);
    }
  }, [deathEvents, currentDeathEvent, popDeathEvent, setCurrentDeathEvent, players, seatPositions, playSound]);

  // 死亡特效完成回调
  const handleDeathEffectComplete = useCallback(() => {
    setCurrentDeathEvent(null);
  }, [setCurrentDeathEvent]);

  // 统计投票情况
  const voteStats = useMemo(() => {
    const stats: Record<string, string[]> = {};
    players.forEach((p) => {
      if (p.votedFor) {
        if (!stats[p.votedFor]) {
          stats[p.votedFor] = [];
        }
        stats[p.votedFor].push(p.id);
      }
    });
    return stats;
  }, [players]);

  // 获取玩家的被投票数
  const getVoteCount = useCallback(
    (playerId: string) => voteStats[playerId]?.length || 0,
    [voteStats]
  );

  // 阶段显示
  const phaseDisplay = getPhaseDisplay(gameState.phase, t);

  // 是否可以选择目标
  const { canSelect, actionType } = canSelectTarget(
    gameState.phase,
    myRole,
    me?.isAlive ?? false,
    playerId,
    currentShooter
  );

  // 处理座位点击
  const handleSeatClick = (targetId: string) => {
    if (!canSelect) return;

    if (actionType === 'vote') {
      setVoteTarget(voteTarget === targetId ? null : targetId);
    } else if (actionType === 'skill') {
      setNightTarget(nightTarget === targetId ? null : targetId);
    } else if (actionType === 'shoot') {
      // 开枪不能选择自己
      if (targetId !== playerId) {
        setShootTarget(shootTarget === targetId ? null : targetId);
      }
    }
  };

  // 获取当前选择的目标
  const currentTarget = actionType === 'vote'
    ? voteTarget
    : actionType === 'shoot'
    ? shootTarget
    : nightTarget;

  // 夜晚背景效果
  const isNight = gameState.phase.startsWith('night');

  // 移动端自动打开侧边栏（投票/警长阶段）
  useEffect(() => {
    if (isMobile && (isVotingPhase || isSheriffPhaseActive || isLastWordsPhase)) {
      setSidebarOpen(true);
    }
  }, [isMobile, isVotingPhase, isSheriffPhaseActive, isLastWordsPhase]);

  return (
    <div className={`relative h-full flex flex-col md:flex-row ${isNight ? 'bg-werewolf-night' : 'bg-gray-900'}`}>
      {/* 阶段过渡动画 */}
      <PhaseTransition
        transitionType={transitionType}
        dayCount={gameState.dayCount}
      />

      {/* 主游戏区域 */}
      <div className="flex-1 flex flex-col min-h-0">
      {/* 夜晚遮罩效果 */}
      <AnimatePresence>
        {isNight && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.8) 80%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* 顶部状态栏 */}
      <div className="relative z-20 flex items-center justify-between p-2 md:p-4 gap-2">
        <div className="flex items-center gap-1 md:gap-3">
          <button
            onClick={onLeave}
            className="flex items-center gap-1 md:gap-2 text-gray-400 hover:text-white
                       transition-colors px-2 md:px-3 py-1 rounded-lg hover:bg-gray-800 text-sm md:text-base"
          >
            <span>←</span>
            <span className="hidden sm:inline">{t('game.leaveRoom')}</span>
          </button>

          {/* 音效开关 */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors
                       ${soundEnabled ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-800'}`}
            title={soundEnabled ? t('settings.sound.disable') + ' (S)' : t('settings.sound.enable') + ' (S)'}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
          </button>

          {/* 快捷键帮助按钮（仅桌面端显示） */}
          {!isMobile && (
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors
                         text-gray-400 hover:text-white hover:bg-gray-800"
              title={t('shortcuts.title') + ' (Shift + ?)'}
            >
              <span>⌨️</span>
            </button>
          )}
        </div>

        {/* 阶段指示器 */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-center">
          <motion.div
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-full ${phaseDisplay.color} text-sm md:text-base`}
            key={gameState.phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span>{phaseDisplay.icon}</span>
            <span className="font-bold">{phaseDisplay.label}</span>
            {gameState.dayCount > 0 && (
              <span className="text-xs md:text-sm opacity-75 hidden xs:inline">{t('game.day', { day: gameState.dayCount })}</span>
            )}
          </motion.div>

          {/* 讨论/投票阶段显示计时器 */}
          {(isDiscussionPhase || isVotingPhase) && gameState.timer !== undefined && (
            <CompactTimer
              remainingTime={gameState.timer}
              totalTime={isDiscussionPhase ? speakingState.speakerTimeLimit : 30}
              isUrgent={gameState.timer <= 10}
              label={isDiscussionPhase ? t('phase.discussion') : t('phase.voting')}
            />
          )}
        </div>

        {/* 右侧：存活统计 + 移动端聊天按钮 */}
        <div className="flex items-center gap-2">
          <div className="text-gray-400 text-xs md:text-sm whitespace-nowrap">
            <span className="hidden xs:inline">{t('game.alive')}: </span>{players.filter((p) => p.isAlive).length}/{players.length}
          </div>

          {/* 移动端聊天按钮 */}
          {isMobile && (
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors relative
                         ${sidebarOpen ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              whileTap={{ scale: 0.95 }}
            >
              💬
              {/* 有新活动时显示红点 */}
              {!sidebarOpen && (isVotingPhase || isSheriffPhaseActive) && (
                <motion.span
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* 警长状态栏（如果有警长） */}
      {sheriffId && <SheriffStatusBar />}

      {/* 遗言状态栏 */}
      {isLastWordsPhase && lastWordsInfo && <LastWordsStatusBar />}

      {/* 圆桌区域 */}
      <div className="relative z-20 flex-1 flex items-center justify-center p-2 md:p-4 overflow-hidden">
        <div className="relative w-full max-w-[280px] xs:max-w-[340px] sm:max-w-md md:max-w-lg lg:max-w-2xl aspect-square">
          {/* 圆桌背景 */}
          <motion.div
            className={`
              absolute inset-[15%] rounded-full
              border-4 border-amber-900/50
              ${isNight ? 'bg-gray-800/50' : 'bg-amber-950/30'}
              shadow-2xl
            `}
            animate={{
              boxShadow: isNight
                ? '0 0 60px rgba(30, 41, 59, 0.8), inset 0 0 40px rgba(0,0,0,0.5)'
                : '0 0 60px rgba(120, 53, 15, 0.3), inset 0 0 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* 桌面中心提示 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {gameState.phase === GamePhase.WAITING && (
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">{t('gameRoom.waitingForPlayers')}</p>
                  <p className="text-sm">{players.filter((p) => p.isReady).length}/{players.length} {t('game.ready')}</p>
                </div>
              )}

              {/* 讨论阶段 - 发言计时器 */}
              {isDiscussionPhase && gameState.timer !== undefined && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <DayTimer
                    totalTime={speakingState.speakerTimeLimit}
                    remainingTime={gameState.timer}
                    currentSpeaker={currentSpeaker}
                    speakingOrder={speakingOrderPlayers}
                    currentSpeakerIndex={speakingState.currentSpeakerIndex}
                    isFreeDiscussion={speakingState.isFreeDiscussion}
                    isPaused={speakingState.isPaused}
                    urgentThreshold={10}
                    onSpeakEnd={!speakingState.isFreeDiscussion ? nextSpeaker : undefined}
                    onSkipSpeaker={!speakingState.isFreeDiscussion ? nextSpeaker : undefined}
                    size="md"
                    showControls={!speakingState.isFreeDiscussion && speakingState.currentSpeakerId === playerId}
                  />
                </motion.div>
              )}

              {canSelect && !isDiscussionPhase && (
                <motion.div
                  className="text-center text-gray-400"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-lg">
                    {actionType === 'vote' ? t('gameRoom.selectVoteTarget') :
                     actionType === 'shoot' ? t('gameRoom.selectShootTarget') : t('gameRoom.selectSkillTarget')}
                  </p>
                  <p className="text-sm mt-1 text-gray-500">
                    {actionType === 'shoot' ? t('gameRoom.shootHint') : t('gameRoom.clickToSelect')}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 玩家座位 */}
          {players.map((player, index) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isMe={player.id === playerId}
              isSpeaking={player.isSpeaking}
              isTargeted={currentTarget === player.id}
              isSelectable={canSelect && player.id !== playerId}
              showRole={gameState.phase === GamePhase.GAME_OVER}
              isShooter={currentShooter === player.id}
              gamePhase={gameState.phase}
              position={seatPositions[index % seatPositions.length]}
              onClick={() => handleSeatClick(player.id)}
            />
          ))}

          {/* 空座位（等待时显示） */}
          {gameState.phase === GamePhase.WAITING &&
            Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
              <motion.div
                key={`empty-${i}`}
                className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2
                           rounded-full border-2 border-dashed border-gray-700
                           flex items-center justify-center text-gray-600"
                style={{
                  left: `${seatPositions[(players.length + i) % seatPositions.length].x}%`,
                  top: `${seatPositions[(players.length + i) % seatPositions.length].y}%`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
              >
                <span>+</span>
              </motion.div>
            ))}

          {/* 投票连线可视化 */}
          <AnimatePresence>
            {isVotingPhase && Object.keys(voteStats).length > 0 && (
              <VoteLines
                votes={voteStats}
                players={players}
                seatPositions={seatPositions}
                showAnimation
              />
            )}
          </AnimatePresence>

          {/* 投票飞行动画 */}
          <VoteFlightContainer
            events={flyEvents}
            players={players}
            seatPositions={seatPositions}
            onEventComplete={removeFlyEvent}
          />

          {/* 投票目标高亮（在座位上显示票数） */}
          {isVotingPhase && players.map((player, index) => {
            const voteCount = getVoteCount(player.id);
            if (voteCount === 0) return null;
            return (
              <motion.div
                key={`vote-ring-${player.id}`}
                className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-25"
                style={{
                  left: `${seatPositions[index % seatPositions.length].x}%`,
                  top: `${seatPositions[index % seatPositions.length].y}%`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <VoteTargetRing
                  isActive={voteTarget === player.id}
                  voteCount={voteCount}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 底部操作区域 */}
      <div className="relative z-20 p-2 md:p-4 pb-safe">
        {/* 我的角色信息 - 移动端简化显示 */}
        {myRole && me?.isAlive && (
          <motion.div
            className="absolute left-2 md:left-4 bottom-2 md:bottom-4 bg-gray-800/90 rounded-lg p-2 md:p-3
                       border border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`
                w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-2xl
                ${ROLE_INFO[myRole]?.faction === Faction.WEREWOLF
                  ? 'bg-red-900/50 border border-red-600'
                  : ROLE_INFO[myRole]?.faction === Faction.VILLAGER
                    ? 'bg-green-900/50 border border-green-600'
                    : 'bg-purple-900/50 border border-purple-600'}
              `}>
                {myRole === Role.WEREWOLF ? '🐺' :
                  myRole === Role.SEER ? '🔮' :
                  myRole === Role.WITCH ? '🧙‍♀️' :
                  myRole === Role.HUNTER ? '🏹' :
                  myRole === Role.GUARD ? '🛡️' :
                  myRole === Role.ALPHA_WOLF ? '👹' :
                  myRole === Role.IDIOT ? '🤡' :
                  myRole === Role.CUPID ? '💘' : '👨‍🌾'}
              </div>
              <div className="hidden xs:block">
                <div className="font-bold text-xs md:text-sm">{ROLE_INFO[myRole]?.name}</div>
                <div className="text-xs text-gray-400 hidden md:block">
                  {ROLE_INFO[myRole]?.abilities.join(' / ')}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 中央操作按钮 */}
        <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
          {/* 等待阶段：准备按钮 */}
          {gameState.phase === GamePhase.WAITING && (
            <motion.button
              className={`
                px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all
                ${isReady
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  : 'bg-green-700 hover:bg-green-600 text-white'}
              `}
              onClick={handleReady}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isReady ? t('game.cancelReady') : t('game.readyButton')}
            </motion.button>
          )}

          {/* 投票阶段：确认投票按钮 */}
          {gameState.phase === GamePhase.DAY_VOTING && me?.isAlive && (
            <motion.button
              className={`
                px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all
                ${voteTarget
                  ? 'bg-red-700 hover:bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
              onClick={handleConfirmVote}
              disabled={!voteTarget}
              whileHover={voteTarget ? { scale: 1.05 } : {}}
              whileTap={voteTarget ? { scale: 0.95 } : {}}
            >
              {voteTarget
                ? <span className="hidden xs:inline">{t('voting.voteFor')} </span> : ''}
              {voteTarget
                ? `${players.find((p) => p.id === voteTarget)?.name}`
                : t('gameRoom.selectVoteTarget')}
            </motion.button>
          )}

          {/* 夜晚技能阶段：确认技能按钮 */}
          {canSelect && actionType === 'skill' && (
            <motion.button
              className={`
                px-4 md:px-8 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all
                ${nightTarget
                  ? 'bg-purple-700 hover:bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
              onClick={handleConfirmSkill}
              disabled={!nightTarget}
              whileHover={nightTarget ? { scale: 1.05 } : {}}
              whileTap={nightTarget ? { scale: 0.95 } : {}}
            >
              {nightTarget
                ? `${t('gameRoom.select')} ${players.find((p) => p.id === nightTarget)?.name}`
                : t('gameRoom.selectTarget')}
            </motion.button>
          )}

          {/* 死亡技能阶段：开枪按钮 */}
          {canSelect && actionType === 'shoot' && (
            <>
              <motion.button
                className={`
                  px-3 md:px-8 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all
                  ${shootTarget
                    ? 'bg-orange-700 hover:bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                `}
                onClick={handleConfirmShoot}
                disabled={!shootTarget}
                whileHover={shootTarget ? { scale: 1.05 } : {}}
                whileTap={shootTarget ? { scale: 0.95 } : {}}
              >
                {shootTarget
                  ? `🔫 ${players.find((p) => p.id === shootTarget)?.name}`
                  : t('gameRoom.selectTarget')}
              </motion.button>
              <motion.button
                className="px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg bg-gray-700
                          hover:bg-gray-600 text-gray-300 transition-all"
                onClick={handleSkipShoot}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('roles.hunter.skipShoot')}
              </motion.button>
            </>
          )}
        </div>

        {/* 游戏结束显示胜利方 */}
        {gameState.phase === GamePhase.GAME_OVER && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`
              text-3xl font-bold mb-2
              ${gameState.winner === Faction.WEREWOLF ? 'text-red-500' : 'text-green-500'}
            `}>
              {gameState.winner === Faction.WEREWOLF ? `🐺 ${t('result.werewolvesWin')}` : `🏠 ${t('result.villagersWin')}`}
            </div>
            <button
              onClick={onLeave}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg
                        transition-colors text-white"
            >
              {t('result.backToLobby')}
            </button>
          </motion.div>
        )}
      </div>
      </div>

      {/* 遗言弹窗 - 当我发表遗言时显示 */}
      <AnimatePresence>
        {isLastWordsPhase && isMyLastWords && lastWordsInfo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/80" />

            {/* 遗言面板 */}
            <motion.div
              className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
                <span className="text-2xl">⚰️</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('lastWords.title')}</h2>
                  <p className="text-sm text-gray-400">{t('gameRoom.lastWordsHint')}</p>
                </div>
              </div>
              <LastWordsPanel
                onSpeak={onLastWordsSpeak}
                onSkip={onLastWordsSkip}
                compact
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 投票结果揭示动画 */}
      <AnimatePresence>
        {showResultReveal && voteResult && (
          <VoteResultReveal
            executed={voteResult.executed}
            isTie={voteResult.isTie}
            votes={voteResult.votes}
            players={players}
            onComplete={hideResultReveal}
          />
        )}
      </AnimatePresence>

      {/* 死亡特效覆盖层 */}
      <DeathEffectOverlay
        event={currentDeathEvent}
        showRole={gameState.phase === GamePhase.GAME_OVER || gameState.phase === GamePhase.DAY_ANNOUNCE}
        onComplete={handleDeathEffectComplete}
      />

      {/* 侧边栏面板 - 桌面端右侧栏，移动端底部抽屉 */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <motion.div
            className={`
              ${isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl shadow-2xl'
                : 'w-80 h-full border-l border-gray-800'}
              flex flex-col bg-gray-900
            `}
            initial={isMobile ? { y: '100%' } : false}
            animate={isMobile ? { y: 0 } : undefined}
            exit={isMobile ? { y: '100%' } : undefined}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* 移动端拖动指示器 */}
            {isMobile && (
              <div
                className="flex justify-center py-2 cursor-grab active:cursor-grabbing"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>
            )}

            {/* 讨论阶段顶部 - 发言队列 */}
            {isDiscussionPhase && !speakingState.isFreeDiscussion && speakingOrderPlayers.length > 0 && (
              <div className="p-2 md:p-3 border-b border-gray-700">
                <SpeakingQueue
                  speakingOrder={speakingOrderPlayers}
                  currentSpeakerIndex={speakingState.currentSpeakerIndex}
                />
              </div>
            )}

            {/* 标签切换 */}
            <div className="flex border-b border-gray-700 shrink-0">
              <button
                className={`flex-1 py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium transition-colors
                           ${sidebarTab === 'chat'
                             ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                             : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                onClick={() => setSidebarTab('chat')}
              >
                💬 <span className="hidden xs:inline">{t('chat.public')}</span>
              </button>
              <button
                className={`flex-1 py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium transition-colors relative
                           ${sidebarTab === 'vote'
                             ? 'bg-gray-800 text-white border-b-2 border-red-500'
                             : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                onClick={() => setSidebarTab('vote')}
              >
                🗳️ <span className="hidden xs:inline">{t('phase.voting')}</span>
                {isVotingPhase && sidebarTab !== 'vote' && (
                  <motion.span
                    className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </button>
              <button
                className={`flex-1 py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium transition-colors relative
                           ${sidebarTab === 'sheriff'
                             ? 'bg-gray-800 text-white border-b-2 border-yellow-500'
                             : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                onClick={() => setSidebarTab('sheriff')}
              >
                🏅 <span className="hidden xs:inline">{t('sheriff.badge')}</span>
                {isSheriffPhaseActive && sidebarTab !== 'sheriff' && (
                  <motion.span
                    className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </button>
              <button
                className={`flex-1 py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium transition-colors relative
                           ${sidebarTab === 'lastwords'
                             ? 'bg-gray-800 text-white border-b-2 border-gray-500'
                             : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                onClick={() => setSidebarTab('lastwords')}
              >
                📜 <span className="hidden xs:inline">{t('lastWords.title')}</span>
                {isLastWordsPhase && sidebarTab !== 'lastwords' && (
                  <motion.span
                    className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </button>
            </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {sidebarTab === 'chat' && (
              <motion.div
                key="chat"
                className="h-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ChatPanel onSendMessage={onSendMessage} />
              </motion.div>
            )}
            {sidebarTab === 'vote' && (
              <motion.div
                key="vote"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <VotingPanel
                  onVote={onVote}
                  voteResult={voteResult}
                  compact
                />
              </motion.div>
            )}
            {sidebarTab === 'sheriff' && (
              <motion.div
                key="sheriff"
                className="h-full p-3 overflow-y-auto"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <SheriffPanel
                  onJoinCampaign={onJoinSheriffCampaign}
                  onQuitCampaign={onQuitSheriffCampaign}
                  onVote={onSheriffVote}
                  onTransfer={onSheriffTransfer}
                  compact
                />
                {/* 非警长阶段时显示警长信息 */}
                {!isSheriffPhaseActive && (
                  <div className="mt-4 text-center text-gray-400">
                    {sheriffId ? (
                      <div className="space-y-2">
                        <p className="text-sm">{t('sheriff.current')}</p>
                        <div className="flex justify-center">
                          {(() => {
                            const sheriff = players.find(p => p.id === sheriffId);
                            return sheriff ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                                <span className="text-lg">🏅</span>
                                <span className="font-bold">#{sheriff.seatNumber} {sheriff.name}</span>
                                <span className="text-xs bg-yellow-600/50 px-2 py-0.5 rounded-full">{t('sheriff.weight')}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{t('gameRoom.noSheriff')}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
            {sidebarTab === 'lastwords' && (
              <motion.div
                key="lastwords"
                className="h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LastWordsPanel
                  onSpeak={onLastWordsSpeak}
                  onSkip={onLastWordsSkip}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端背景遮罩 */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 快捷键帮助弹窗 */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* 快捷键提示（桌面端底部，首次进入时显示） */}
      {!isMobile && gameState.phase === GamePhase.WAITING && !showShortcutsHelp && (
        <ShortcutHint />
      )}
    </div>
  );
}

export default GameRoom;
