/**
 * useNakama Hook
 * Nakama 客户端连接和游戏操作
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, Session, Socket, Match, MatchData } from '@heroiclabs/nakama-js';

// 房间列表返回的匹配信息类型
export interface MatchInfo {
  match_id: string;
  authoritative: boolean;
  label?: string;
  size: number;
  tick_rate: number;
  handler_name: string;
  // Extended fields from our custom list_matches RPC
  isPrivate?: boolean;   // 是否是私密房间
  roomName?: string;     // 房间名称
  maxPlayers?: number;   // 最大玩家数
}
import { useGameStore } from '../store/gameStore';
import {
  OpCode, Role, GamePhase, Player, UserStats, LevelInfo, GameInvite, SearchedUser,
  UserAchievements, AchievementDefinition, AchievementProgress
} from '../types/werewolf';
import type { DeathCause } from '../components/DeathEffect';
import { decompressMessage } from '../utils/message-decompress';

// 后端 PlayerStatus 到前端 DeathCause 的映射
const statusToCause: Record<string, DeathCause> = {
  'dead_by_wolf': 'wolf',
  'dead_by_vote': 'vote',
  'dead_by_poison': 'poison',
  'dead_by_hunter': 'hunter',
  'dead_by_alpha_wolf': 'alpha_wolf',
  'dead_by_lover': 'lover',
};

// Nakama 服务器配置
const NAKAMA_HOST = 'localhost';
const NAKAMA_PORT = '7350';
const NAKAMA_USE_SSL = false;
const NAKAMA_SERVER_KEY = 'defaultkey';

// 生成设备 ID（用于匿名登录）
function getDeviceId(): string {
  let deviceId = localStorage.getItem('werewolf_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('werewolf_device_id', deviceId);
  }
  return deviceId;
}

export interface UseNakamaResult {
  // 状态
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  matchId: string | null;
  isAuthenticated: boolean;
  authMethod: 'device' | 'email' | null;
  userEmail: string | null;

  // 认证操作
  authenticate: (username?: string) => Promise<void>;
  authenticateWithEmail: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  linkEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // 房间操作
  createMatch: (settings?: {
    roomName?: string;
    maxPlayers?: number;
    roles?: string[];
    password?: string;         // 房间密码
    discussionTime?: number;
    votingTime?: number;
    nightActionTime?: number;
    lastWordsTime?: number;
    allowSheriff?: boolean;
    allowLastWords?: boolean;
  }) => Promise<string>;
  joinMatch: (matchId: string, password?: string) => Promise<void>;  // 添加密码参数
  leaveMatch: () => Promise<void>;
  listMatches: () => Promise<MatchInfo[]>;
  findMatch: () => Promise<string>;

  // 游戏操作
  sendReady: (ready: boolean) => void;
  sendVote: (targetId: string | null) => void;
  sendSkill: (skill: string, targetId: string | null, extraData?: Record<string, unknown>) => void;
  sendCupidLink: (targetId1: string, targetId2: string) => void;
  sendShoot: (targetId: string | null) => void;
  sendChat: (content: string, chatType?: 'public' | 'wolf' | 'dead' | 'spectator') => void;

  // 警长系统操作
  joinSheriffCampaign: () => void;
  quitSheriffCampaign: () => void;
  sendSheriffVote: (candidateId: string) => void;
  sendSheriffTransfer: (targetId: string | null) => void;

  // 遗言系统操作
  sendLastWords: (content: string) => void;
  sendLastWordsSkip: () => void;

  // 用户统计
  getUserStats: (userId?: string) => Promise<{ stats: UserStats; levelInfo: LevelInfo } | null>;

  // 成就系统
  getAchievements: (userId?: string) => Promise<{
    achievements: UserAchievements;
    totalAchievements: number;
    unlockedAchievements: number;
    byCategory: Record<string, Array<{ definition: AchievementDefinition; progress: AchievementProgress }>>;
    definitions: Record<string, AchievementDefinition>;
  } | null>;

  // 好友邀请系统
  searchUsers: (query: string) => Promise<SearchedUser[]>;
  sendInvite: (matchId: string, receiverId: string) => Promise<{ success: boolean; inviteId?: string; error?: string }>;
  getInvites: (type?: 'sent' | 'received') => Promise<GameInvite[]>;
  respondInvite: (inviteId: string, accept: boolean) => Promise<{ success: boolean; matchId?: string; password?: string; error?: string }>;
  cancelInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;

  // 排行榜
  getLeaderboard: (type?: 'level' | 'wins' | 'winRate' | 'winStreak', limit?: number, offset?: number) => Promise<{
    leaderboard: Array<{
      rank: number;
      userId: string;
      username: string;
      displayName: string;
      value: number;
      level: number;
      totalGames: number;
      wins: number;
      winRate: number;
      maxWinStreak: number;
    }>;
    type: string;
    total: number;
    myRank: {
      rank: number;
      userId: string;
      username: string;
      displayName: string;
      value: number;
      level: number;
      totalGames: number;
      wins: number;
      winRate: number;
      maxWinStreak: number;
    } | null;
  } | null>;

  // 回放系统
  getReplays: (limit?: number, offset?: number) => Promise<{
    replays: Array<{
      id: string;
      matchId: string;
      createdAt: string;
      duration: number;
      playerCount: number;
      winner: string | null;
      days: number;
      myRole?: string;
      myResult?: 'win' | 'lose';
    }>;
    total: number;
  } | null>;
  getReplayById: (replayId: string, ownerId?: string) => Promise<{
    replay: {
      meta: {
        id: string;
        matchId: string;
        createdAt: string;
        endedAt: string;
        duration: number;
        playerCount: number;
        winner: string | null;
        days: number;
        config: Record<string, unknown>;
        players: Array<{
          id: string;
          name: string;
          seatNumber: number;
          role: string;
          faction: string;
          isAlive: boolean;
          isSheriff: boolean;
          isLover: boolean;
          loverId?: string;
        }>;
      };
      events: Array<{
        type: string;
        timestamp: number;
        day: number;
        phase: string;
        actor?: { id: string; name: string; seat: number; role?: string };
        target?: { id: string; name: string; seat: number; role?: string };
        data?: Record<string, unknown>;
      }>;
    };
    stats: {
      totalKills: number;
      wolfKills: number;
      witchSaves: number;
      witchPoisons: number;
      hunterShots: number;
      votedOut: number;
      skillsUsed: number;
    };
    keyEvents: Array<{
      type: string;
      timestamp: number;
      day: number;
      phase: string;
      actor?: { id: string; name: string; seat: number; role?: string };
      target?: { id: string; name: string; seat: number; role?: string };
      data?: Record<string, unknown>;
    }>;
  } | null>;
}

// 保存会话到 localStorage
function saveSession(session: Session, authMethod: 'device' | 'email', email?: string): void {
  const sessionData = {
    token: session.token,
    refresh_token: session.refresh_token,
    user_id: session.user_id,
    username: session.username,
    expires_at: session.expires_at,
    created: session.created,
    authMethod,
    email,
  };
  localStorage.setItem('werewolf_session', JSON.stringify(sessionData));
}

// 从 localStorage 恢复会话
function loadSession(): { session: Session | null; authMethod: 'device' | 'email' | null; email: string | null } {
  try {
    const savedSession = localStorage.getItem('werewolf_session');
    if (savedSession) {
      const data = JSON.parse(savedSession);
      // 检查会话是否过期
      if (data.expires_at && data.expires_at * 1000 > Date.now()) {
        const session = {
          token: data.token,
          refresh_token: data.refresh_token,
          user_id: data.user_id,
          username: data.username,
          expires_at: data.expires_at,
          created: data.created,
        } as Session;
        return { session, authMethod: data.authMethod, email: data.email || null };
      }
    }
  } catch (e) {
    console.error('Failed to load session:', e);
  }
  return { session: null, authMethod: null, email: null };
}

// 清除保存的会话
function clearSession(): void {
  localStorage.removeItem('werewolf_session');
}

export function useNakama(): UseNakamaResult {
  const clientRef = useRef<Client | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const matchRef = useRef<Match | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<'device' | 'email' | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const {
    isConnected,
    setConnected,
    playerId,
    setPlayerId,
    playerName,
    setPlayerName,
    matchId,
    setMatchId,
    setMyRole,
    setPlayers,
    setGameState,
    addMessage,
    resetGame,
  } = useGameStore();

  // 初始化 Nakama 客户端
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new Client(
        NAKAMA_SERVER_KEY,
        NAKAMA_HOST,
        NAKAMA_PORT,
        NAKAMA_USE_SSL
      );
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect(true);
      }
    };
  }, []);

  // 尝试恢复保存的会话
  useEffect(() => {
    const restoreSession = async () => {
      const { session, authMethod: savedAuthMethod, email } = loadSession();
      if (session && clientRef.current) {
        try {
          sessionRef.current = session;
          setIsAuthenticated(true);
          setAuthMethod(savedAuthMethod);
          setUserEmail(email);
          if (session.user_id) {
            setPlayerId(session.user_id);
          }
          if (session.username) {
            setPlayerName(session.username);
          }
          console.log('Session restored successfully');
        } catch (e) {
          console.error('Failed to restore session:', e);
          clearSession();
        }
      }
    };
    restoreSession();
  }, [setPlayerId, setPlayerName]);

  // 处理匹配数据
  const handleMatchData = useCallback((matchData: MatchData) => {
    const opCode = matchData.op_code;
    let data: Record<string, unknown> = {};

    try {
      if (matchData.data) {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(matchData.data as Uint8Array);
        const rawData = JSON.parse(jsonStr);
        // 解压消息（自动检测是否压缩）
        data = decompressMessage(rawData);
      }
    } catch (e) {
      console.error('Failed to parse match data:', e);
      return;
    }

    switch (opCode) {
      case OpCode.GAME_STATE:
        handleGameState(data);
        break;

      case OpCode.ROLE_ASSIGNED:
        handleRoleAssigned(data);
        break;

      case OpCode.PHASE_CHANGE:
        handlePhaseChange(data);
        break;

      case OpCode.PLAYER_READY:
        handlePlayerReady(data);
        break;

      case OpCode.CHAT_MESSAGE:
      case OpCode.WOLF_CHAT:
      case OpCode.DEAD_CHAT:
        handleChatMessage(data, opCode);
        break;

      case OpCode.NIGHT_RESULT:
        handleNightResult(data);
        break;

      case OpCode.VOTE_RESULT:
        handleVoteResult(data);
        break;

      case OpCode.GAME_OVER:
        handleGameOver(data);
        break;

      case OpCode.PLAYER_DISCONNECTED:
        handlePlayerDisconnected(data);
        break;

      case OpCode.PLAYER_RECONNECTED:
        handlePlayerReconnected(data);
        break;

      case OpCode.DEATH_SKILL_PROMPT:
        handleDeathSkillPrompt(data);
        break;

      case OpCode.DEATH_SKILL_RESULT:
        handleDeathSkillResult(data);
        break;

      case OpCode.IDIOT_REVEALED:
        handleIdiotRevealed(data);
        break;

      case OpCode.CUPID_LINK:
        handleCupidLink(data);
        break;

      case OpCode.LOVER_DEATH:
        handleLoverDeath(data);
        break;

      // 警长系统消息
      case OpCode.SHERIFF_CAMPAIGN_START:
        handleSheriffCampaignStart(data);
        break;

      case OpCode.SHERIFF_CAMPAIGN_JOIN:
        handleSheriffCampaignJoin(data);
        break;

      case OpCode.SHERIFF_CAMPAIGN_QUIT:
        handleSheriffCampaignQuit(data);
        break;

      case OpCode.SHERIFF_SPEECH_START:
        handleSheriffSpeechStart(data);
        break;

      case OpCode.SHERIFF_VOTE:
        handleSheriffVote(data);
        break;

      case OpCode.SHERIFF_ELECTED:
        handleSheriffElected(data);
        break;

      case OpCode.SHERIFF_TRANSFER_START:
        handleSheriffTransferStart(data);
        break;

      case OpCode.SHERIFF_TRANSFER_DONE:
        handleSheriffTransferDone(data);
        break;

      case OpCode.SHERIFF_EXPLODE:
        handleSheriffExplode(data);
        break;

      // 遗言系统消息
      case OpCode.LAST_WORDS_START:
        handleLastWordsStart(data);
        break;

      case OpCode.LAST_WORDS_SPEAK:
        handleLastWordsSpeak(data);
        break;

      case OpCode.LAST_WORDS_END:
        handleLastWordsEnd(data);
        break;

      // 观战系统
      case OpCode.SPECTATOR_JOIN:
        handleSpectatorJoin(data);
        break;

      case OpCode.SPECTATOR_LEAVE:
        handleSpectatorLeave(data);
        break;

      case OpCode.SPECTATOR_CHAT:
        handleSpectatorChat(data);
        break;

      case OpCode.SPECTATOR_FULL_STATE:
        handleSpectatorFullState(data);
        break;

      default:
        console.log('Unknown OpCode:', opCode, data);
    }
  }, []);

  // 处理游戏状态更新
  const handleGameState = useCallback((data: Record<string, unknown>) => {
    const players = (data.players as Player[]) || [];
    const phase = data.phase as GamePhase;
    const dayCount = (data.dayCount as number) || 0;

    setPlayers(players);
    setGameState({
      phase,
      dayCount,
      timer: data.timer as number | undefined,
    });
  }, [setPlayers, setGameState]);

  // 处理角色分配
  const handleRoleAssigned = useCallback((data: Record<string, unknown>) => {
    const role = data.role as Role;
    setMyRole(role);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `你的角色是：${getRoleName(role)}`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setMyRole, addMessage]);

  // 处理阶段变更
  const handlePhaseChange = useCallback((data: Record<string, unknown>) => {
    const phase = data.phase as GamePhase;
    const timer = data.timer as number | undefined;
    const subPhase = data.subPhase as string | undefined;

    setGameState({ phase, timer });

    // 更新夜晚子阶段
    if (subPhase) {
      const { setNightSubPhase } = useGameStore.getState();
      setNightSubPhase(subPhase as never);
    }

    // 获取显示消息
    let phaseMessage = getPhaseMessage(phase);

    // 如果是夜晚阶段且有子阶段，显示子阶段消息
    if (phase === GamePhase.NIGHT && subPhase) {
      if (subPhase === 'cupid') {
        phaseMessage = '💘 丘比特请睁眼，选择一对情侣';
      } else if (subPhase === 'werewolf') {
        phaseMessage = '🐺 狼人请睁眼';
      } else if (subPhase === 'seer') {
        phaseMessage = '🔮 预言家请睁眼';
      } else if (subPhase === 'witch') {
        phaseMessage = '🧪 女巫请睁眼';
      } else if (subPhase === 'guard') {
        phaseMessage = '🛡️ 守卫请睁眼';
      }
    }

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: phaseMessage,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理玩家准备状态
  const handlePlayerReady = useCallback((data: Record<string, unknown>) => {
    const playerId = data.playerId as string;
    const isReady = data.isReady as boolean;
    const { players } = useGameStore.getState();

    setPlayers(
      players.map((p) =>
        p.id === playerId ? { ...p, isReady } : p
      )
    );
  }, [setPlayers]);

  // 处理聊天消息
  const handleChatMessage = useCallback((data: Record<string, unknown>, opCode: OpCode) => {
    const messageType = opCode === OpCode.WOLF_CHAT ? 'wolf'
      : opCode === OpCode.DEAD_CHAT ? 'dead'
      : 'public';

    addMessage({
      id: Date.now().toString(),
      senderId: data.senderId as string,
      senderName: data.senderName as string,
      seatNumber: data.seatNumber as number | undefined,
      role: data.role as Role | undefined, // 死亡聊天显示角色
      content: data.content as string,
      timestamp: Date.now(),
      type: messageType,
    });
  }, [addMessage]);

  // 处理夜晚结果
  const handleNightResult = useCallback((data: Record<string, unknown>) => {
    // deaths 可能是两种格式：
    // 1. 简单格式：string[]（旧版）
    // 2. 完整格式：{ playerId, playerName, cause }[]
    const rawDeaths = data.deaths as unknown;
    const { players, addDeathEvents } = useGameStore.getState();

    // 解析死亡信息
    interface DeathInfo {
      playerId: string;
      playerName: string;
      cause: string;
      seatNumber?: number;
      role?: Role;
    }

    let deathInfos: DeathInfo[] = [];

    if (Array.isArray(rawDeaths)) {
      if (rawDeaths.length > 0 && typeof rawDeaths[0] === 'string') {
        // 旧格式：纯 ID 数组，默认狼人击杀
        deathInfos = rawDeaths.map((id: string) => {
          const player = players.find((p) => p.id === id);
          return {
            playerId: id,
            playerName: player?.name || id,
            cause: 'dead_by_wolf',
            seatNumber: player?.seatNumber,
            role: player?.role,
          };
        });
      } else {
        // 新格式：包含详细信息的数组
        deathInfos = (rawDeaths as Array<{
          playerId: string;
          playerName: string;
          cause: string;
        }>).map((d) => {
          const player = players.find((p) => p.id === d.playerId);
          return {
            ...d,
            seatNumber: player?.seatNumber,
            role: player?.role,
          };
        });
      }
    }

    // 更新死亡玩家状态
    const deadIds = deathInfos.map((d) => d.playerId);
    setPlayers(
      players.map((p) =>
        deadIds.includes(p.id) ? { ...p, isAlive: false } : p
      )
    );

    if (deathInfos.length > 0) {
      // 触发死亡特效事件
      const deathEvents = deathInfos.map((d) => ({
        playerId: d.playerId,
        playerName: d.playerName,
        seatNumber: d.seatNumber || 0,
        role: d.role,
        cause: statusToCause[d.cause] || 'wolf',
        position: { x: 50, y: 50 }, // 位置将由 GameRoom 组件根据座位号计算
      }));
      addDeathEvents(deathEvents);

      const deadNames = deathInfos.map((d) => d.playerName);
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `昨晚死亡：${deadNames.join('、')}`,
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: '昨晚是平安夜，无人死亡',
        timestamp: Date.now(),
        type: 'system',
      });
    }
  }, [setPlayers, addMessage]);

  // 处理投票结果
  const handleVoteResult = useCallback((data: Record<string, unknown>) => {
    const executed = data.executed as string | undefined;
    const isTie = data.isTie as boolean;
    const votes = data.votes as Record<string, string[]> | undefined;
    const { players, addDeathEvent, setVoteResult } = useGameStore.getState();

    // 设置投票结果用于动画展示
    setVoteResult({
      executed: executed,
      isTie,
      votes: votes || {},
    });

    if (executed) {
      const player = players.find((p) => p.id === executed);

      // 触发死亡特效事件
      if (player) {
        addDeathEvent({
          playerId: executed,
          playerName: player.name,
          seatNumber: player.seatNumber,
          role: player.role,
          cause: 'vote',
          position: { x: 50, y: 50 }, // 位置将由 GameRoom 组件根据座位号计算
        });
      }

      setPlayers(
        players.map((p) =>
          p.id === executed ? { ...p, isAlive: false } : p
        )
      );

      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `${player?.name || executed} 被投票出局`,
        timestamp: Date.now(),
        type: 'system',
      });
    } else if (isTie) {
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: '平票，无人出局',
        timestamp: Date.now(),
        type: 'system',
      });
    }
  }, [setPlayers, addMessage]);

  // 处理游戏结束
  const handleGameOver = useCallback((data: Record<string, unknown>) => {
    const winner = data.winner as string;
    const reason = data.reason as string | undefined;

    setGameState({
      phase: GamePhase.GAME_OVER,
      winner: winner as never,
    });

    let winMessage = '';
    if (winner === 'lovers') {
      winMessage = '💕 情侣阵营胜利！爱情战胜了一切！';
    } else if (winner === 'werewolf') {
      winMessage = '🐺 狼人阵营胜利！';
    } else {
      winMessage = '👨‍🌾 好人阵营胜利！';
    }

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: reason || winMessage,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理玩家断开连接
  const handlePlayerDisconnected = useCallback((data: Record<string, unknown>) => {
    const disconnectedId = data.playerId as string;
    const { players } = useGameStore.getState();
    const player = players.find((p) => p.id === disconnectedId);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `${player?.name || disconnectedId} 断开连接`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理玩家重新连接
  const handlePlayerReconnected = useCallback((data: Record<string, unknown>) => {
    const reconnectedId = data.playerId as string;
    const { players } = useGameStore.getState();
    const player = players.find((p) => p.id === reconnectedId);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `${player?.name || reconnectedId} 重新连接`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理死亡技能提示（猎人/狼王开枪）
  const handleDeathSkillPrompt = useCallback((data: Record<string, unknown>) => {
    const shooterId = data.shooterId as string;
    const shooterName = data.shooterName as string;
    const shooterRole = data.shooterRole as string;

    setGameState({
      phase: GamePhase.DEATH_SKILL,
      timer: data.duration as number,
    });

    // 设置当前开枪的玩家
    const { setCurrentShooter, setShootTarget } = useGameStore.getState();
    setCurrentShooter(shooterId);
    setShootTarget(null);

    const roleDisplay = shooterRole === 'hunter' ? '猎人' : '狼王';
    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `${shooterName}（${roleDisplay}）正在选择开枪目标...`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理死亡技能结果
  const handleDeathSkillResult = useCallback((data: Record<string, unknown>) => {
    const shooterName = data.shooterName as string;
    const shooterRole = data.shooterRole as string;
    const targetName = data.targetName as string | null;
    const success = data.success as boolean;
    const targetId = data.targetId as string | null;

    const { players, addDeathEvent } = useGameStore.getState();
    const roleDisplay = shooterRole === 'hunter' ? '猎人' : '狼王';
    const deathCause: DeathCause = shooterRole === 'hunter' ? 'hunter' : 'alpha_wolf';

    if (success && targetId && targetName) {
      const targetPlayer = players.find((p) => p.id === targetId);

      // 触发死亡特效事件
      if (targetPlayer) {
        addDeathEvent({
          playerId: targetId,
          playerName: targetName,
          seatNumber: targetPlayer.seatNumber,
          role: targetPlayer.role,
          cause: deathCause,
          position: { x: 50, y: 50 },
        });
      }

      // 更新被击杀玩家状态
      setPlayers(
        players.map((p) =>
          p.id === targetId ? { ...p, isAlive: false } : p
        )
      );

      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `${shooterName}（${roleDisplay}）开枪带走了 ${targetName}！`,
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `${shooterName}（${roleDisplay}）选择不开枪`,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  }, [setPlayers, addMessage]);

  // 处理白痴翻牌
  const handleIdiotRevealed = useCallback((data: Record<string, unknown>) => {
    const revealedId = data.playerId as string;
    const playerName = data.playerName as string;
    const message = data.message as string;

    const { players } = useGameStore.getState();

    // 更新白痴玩家状态，标记为已翻牌
    setPlayers(
      players.map((p) =>
        p.id === revealedId ? { ...p, idiotRevealed: true } : p
      )
    );

    // 添加系统消息
    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: message || `${playerName} 亮出了白痴身份，免于被处决！但今后无法参与投票。`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setPlayers, addMessage]);

  // 处理丘比特连线（情侣确认）
  const handleCupidLink = useCallback((data: Record<string, unknown>) => {
    const loverId = data.loverId as string;
    const loverName = data.loverName as string;
    const loverSeatNumber = data.loverSeatNumber as number;
    const loverRole = data.loverRole as Role | undefined;
    const crossFaction = data.crossFaction as boolean;

    // 保存情侣信息到 store
    const { setMyLoverInfo, players } = useGameStore.getState();
    setMyLoverInfo({
      loverId,
      loverName,
      loverSeatNumber,
      loverRole,
      crossFaction,
    });

    // 更新自己和情侣的玩家状态
    const { playerId } = useGameStore.getState();
    setPlayers(
      players.map((p) => {
        if (p.id === playerId || p.id === loverId) {
          return { ...p, isLover: true, loverId: p.id === playerId ? loverId : playerId };
        }
        return p;
      })
    );

    // 添加系统消息（只有自己能看到）
    const crossFactionMsg = crossFaction
      ? '💕 你们来自不同阵营，只有你们两人存活才能获胜！'
      : '';

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `💘 丘比特之箭命中了你！你和 ${loverName}（${loverSeatNumber}号）成为了情侣。${loverRole ? `对方的角色是：${getRoleName(loverRole)}。` : ''}一方死亡，另一方将殉情而死。${crossFactionMsg}`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setPlayers, addMessage]);

  // 处理情侣殉情
  const handleLoverDeath = useCallback((data: Record<string, unknown>) => {
    const deadLoverName = data.deadLoverName as string; // 死亡触发者名称
    const dyingLoverId = data.dyingLoverId as string;
    const dyingLoverName = data.dyingLoverName as string;
    const message = data.message as string;

    const { players, addDeathEvent } = useGameStore.getState();
    const dyingPlayer = players.find((p) => p.id === dyingLoverId);

    // 触发殉情死亡特效
    if (dyingPlayer) {
      addDeathEvent({
        playerId: dyingLoverId,
        playerName: dyingLoverName,
        seatNumber: dyingPlayer.seatNumber,
        role: dyingPlayer.role,
        cause: 'lover',
        position: { x: 50, y: 50 },
      });
    }

    // 更新殉情玩家状态
    setPlayers(
      players.map((p) =>
        p.id === dyingLoverId ? { ...p, isAlive: false } : p
      )
    );

    // 添加系统消息
    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: message || `💔 ${dyingLoverName} 因情侣 ${deadLoverName} 死亡而殉情`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setPlayers, addMessage]);

  // ============================================================================
  // 警长系统消息处理
  // ============================================================================

  // 处理警长竞选开始
  const handleSheriffCampaignStart = useCallback((data: Record<string, unknown>) => {
    const duration = data.duration as number;
    // alivePlayers is included in the message for reference but not used in UI
    // const alivePlayers = data.alivePlayers as Array<{ id: string; name: string; seatNumber: number }>;

    setGameState({
      phase: GamePhase.SHERIFF_CAMPAIGN,
      timer: duration,
    });

    // 设置初始竞选信息
    const { setSheriffElectionInfo, setIsMySelfCandidate } = useGameStore.getState();
    setSheriffElectionInfo({
      candidates: [],
      speakerIndex: 0,
      totalSpeakers: 0,
      duration,
    });
    setIsMySelfCandidate(false);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: '🏅 警长竞选开始！有意参选者请报名',
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理玩家加入竞选
  const handleSheriffCampaignJoin = useCallback((data: Record<string, unknown>) => {
    const joinedPlayerId = data.playerId as string;
    const playerName = data.playerName as string;
    const seatNumber = data.seatNumber as number;

    const { sheriffElectionInfo, setSheriffElectionInfo, playerId, setIsMySelfCandidate } = useGameStore.getState();
    const newCandidate = { id: joinedPlayerId, name: playerName, seatNumber };

    // 更新候选人列表
    const existingCandidates = sheriffElectionInfo?.candidates || [];
    if (!existingCandidates.find(c => c.id === joinedPlayerId)) {
      setSheriffElectionInfo({
        ...sheriffElectionInfo,
        candidates: [...existingCandidates, newCandidate],
        speakerIndex: 0,
        totalSpeakers: existingCandidates.length + 1,
        duration: sheriffElectionInfo?.duration || 20,
      });
    }

    // 检查是否是自己
    if (joinedPlayerId === playerId) {
      setIsMySelfCandidate(true);
    }

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `📢 ${seatNumber}号 ${playerName} 参与警长竞选`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理玩家退出竞选
  const handleSheriffCampaignQuit = useCallback((data: Record<string, unknown>) => {
    const quitPlayerId = data.playerId as string;
    const playerName = data.playerName as string;

    const { sheriffElectionInfo, setSheriffElectionInfo, playerId, setIsMySelfCandidate } = useGameStore.getState();

    // 从候选人列表中移除
    const existingCandidates = sheriffElectionInfo?.candidates || [];
    setSheriffElectionInfo({
      ...sheriffElectionInfo,
      candidates: existingCandidates.filter(c => c.id !== quitPlayerId),
      speakerIndex: 0,
      totalSpeakers: Math.max(0, existingCandidates.length - 1),
      duration: sheriffElectionInfo?.duration || 20,
    });

    // 检查是否是自己
    if (quitPlayerId === playerId) {
      setIsMySelfCandidate(false);
    }

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `${playerName} 退出了警长竞选`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理竞选发言开始
  const handleSheriffSpeechStart = useCallback((data: Record<string, unknown>) => {
    const speakerId = data.speakerId as string;
    const speakerName = data.speakerName as string;
    const seatNumber = data.seatNumber as number;
    const speakerIndex = data.speakerIndex as number;
    const totalSpeakers = data.totalSpeakers as number;
    const duration = data.duration as number;

    setGameState({
      phase: GamePhase.SHERIFF_SPEECH,
      timer: duration,
    });

    const { sheriffElectionInfo, setSheriffElectionInfo } = useGameStore.getState();
    setSheriffElectionInfo({
      ...sheriffElectionInfo,
      candidates: sheriffElectionInfo?.candidates || [],
      currentSpeaker: { id: speakerId, name: speakerName, seatNumber },
      speakerIndex,
      totalSpeakers,
      duration,
    });

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `🎤 ${seatNumber}号 ${speakerName} 开始竞选发言（${speakerIndex + 1}/${totalSpeakers}）`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理警长投票
  const handleSheriffVote = useCallback((data: Record<string, unknown>) => {
    const voterId = data.voterId as string;
    const hasVoted = data.hasVoted as boolean;

    const { players } = useGameStore.getState();
    const voter = players.find(p => p.id === voterId);

    if (voter && hasVoted) {
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `${voter.name} 已投票`,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  }, [addMessage]);

  // 处理警长当选
  const handleSheriffElected = useCallback((data: Record<string, unknown>) => {
    const newSheriffId = data.sheriffId as string | null;
    const sheriffName = data.sheriffName as string | null;
    const seatNumber = data.seatNumber as number | null;
    const isAutoElected = data.isAutoElected as boolean | undefined;

    const { setSheriffId, setSheriffElectionInfo } = useGameStore.getState();

    if (newSheriffId) {
      setSheriffId(newSheriffId);

      // 更新玩家列表中的警长标识
      const { players } = useGameStore.getState();
      setPlayers(
        players.map(p => ({
          ...p,
          isSheriff: p.id === newSheriffId,
        }))
      );

      const autoMsg = isAutoElected ? '（唯一候选人，自动当选）' : '';
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `🏅 ${seatNumber}号 ${sheriffName} 当选警长！${autoMsg}`,
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      // 平票，无警长
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: '⚖️ 警长选举平票，本局没有警长',
        timestamp: Date.now(),
        type: 'system',
      });
    }

    // 清空竞选信息
    setSheriffElectionInfo(null);
  }, [setPlayers, addMessage]);

  // 处理警徽移交开始
  const handleSheriffTransferStart = useCallback((data: Record<string, unknown>) => {
    const sheriffId = data.sheriffId as string;
    const sheriffName = data.sheriffName as string;
    const duration = data.duration as number;
    const eligiblePlayers = data.eligiblePlayers as Array<{ id: string; name: string; seatNumber: number }>;

    setGameState({
      phase: GamePhase.SHERIFF_TRANSFER,
      timer: duration,
    });

    const { setSheriffTransferInfo, setSheriffTransferTarget } = useGameStore.getState();
    setSheriffTransferInfo({
      sheriffId,
      sheriffName,
      eligiblePlayers,
      duration,
    });
    setSheriffTransferTarget(null);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `🏅 警长 ${sheriffName} 正在移交警徽...`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理警徽移交完成
  const handleSheriffTransferDone = useCallback((data: Record<string, unknown>) => {
    const newSheriffId = data.newSheriffId as string;
    const newSheriffName = data.newSheriffName as string;
    const seatNumber = data.seatNumber as number;

    const { setSheriffId, setSheriffTransferInfo, players } = useGameStore.getState();
    setSheriffId(newSheriffId);
    setSheriffTransferInfo(null);

    // 更新玩家列表中的警长标识
    setPlayers(
      players.map(p => ({
        ...p,
        isSheriff: p.id === newSheriffId,
      }))
    );

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `🏅 警徽移交给 ${seatNumber}号 ${newSheriffName}`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setPlayers, addMessage]);

  // 处理警徽撕毁
  const handleSheriffExplode = useCallback((data: Record<string, unknown>) => {
    const reason = data.reason as string;

    const { setSheriffId, setSheriffTransferInfo, players } = useGameStore.getState();

    // 移除警长标识
    setPlayers(
      players.map(p => ({
        ...p,
        isSheriff: false,
      }))
    );

    setSheriffId(null);
    setSheriffTransferInfo(null);

    const reasonMsg = reason === 'timeout' ? '（超时未选择）' : '';
    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `💥 警徽被撕毁！${reasonMsg}`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setPlayers, addMessage]);

  // ============================================================================
  // 遗言系统消息处理
  // ============================================================================

  // 处理遗言阶段开始
  const handleLastWordsStart = useCallback((data: Record<string, unknown>) => {
    const speakerId = data.speakerId as string;
    const speakerName = data.speakerName as string;
    const seatNumber = data.seatNumber as number;
    const deathCause = data.deathCause as string;
    const duration = data.duration as number;

    setGameState({
      phase: GamePhase.LAST_WORDS,
      timer: duration,
    });

    // 设置遗言信息
    const { setLastWordsInfo, setLastWordsMessage, setIsMyLastWords, playerId } = useGameStore.getState();
    setLastWordsInfo({
      speakerId,
      speakerName,
      seatNumber,
      deathCause: deathCause as 'vote' | 'wolf' | 'poison' | 'hunter' | 'alpha_wolf' | 'lover',
      duration,
    });
    setLastWordsMessage(null);
    setIsMyLastWords(speakerId === playerId);

    const causeText = {
      vote: '被投票出局',
      wolf: '被狼人杀害',
      poison: '被女巫毒死',
      hunter: '被猎人带走',
      alpha_wolf: '被狼王带走',
      lover: '殉情而亡',
    }[deathCause] || '死亡';

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `⚰️ ${seatNumber}号 ${speakerName}（${causeText}）进入遗言时间`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [setGameState, addMessage]);

  // 处理遗言发言
  const handleLastWordsSpeak = useCallback((data: Record<string, unknown>) => {
    const speakerName = data.speakerName as string;
    const content = data.content as string;

    // 保存遗言内容
    const { setLastWordsMessage } = useGameStore.getState();
    setLastWordsMessage(content);

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `📜 ${speakerName} 的遗言：「${content}」`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理遗言结束
  const handleLastWordsEnd = useCallback((data: Record<string, unknown>) => {
    const speakerName = data.speakerName as string;
    const skipped = data.skipped as boolean;

    // 清除遗言信息
    const { setLastWordsInfo, setLastWordsMessage, setIsMyLastWords } = useGameStore.getState();

    if (skipped) {
      addMessage({
        id: Date.now().toString(),
        senderId: 'system',
        senderName: '系统',
        content: `${speakerName} 选择不发表遗言`,
        timestamp: Date.now(),
        type: 'system',
      });
    }

    // 延迟清除状态，让 UI 有时间显示结果
    setTimeout(() => {
      setLastWordsInfo(null);
      setLastWordsMessage(null);
      setIsMyLastWords(false);
    }, 1000);
  }, [addMessage]);

  // ========== 观战系统处理函数 ==========

  // 处理观战者加入
  const handleSpectatorJoin = useCallback((data: Record<string, unknown>) => {
    const spectatorName = data.displayName as string || data.odername as string;
    const spectatorCount = data.spectatorCount as number;

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `👁️ ${spectatorName} 进入观战（共 ${spectatorCount} 人观战）`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理观战者离开
  const handleSpectatorLeave = useCallback((data: Record<string, unknown>) => {
    const spectatorName = data.displayName as string || data.odername as string;
    const spectatorCount = data.spectatorCount as number;

    addMessage({
      id: Date.now().toString(),
      senderId: 'system',
      senderName: '系统',
      content: `👁️ ${spectatorName} 退出观战（剩余 ${spectatorCount} 人观战）`,
      timestamp: Date.now(),
      type: 'system',
    });
  }, [addMessage]);

  // 处理观战者聊天
  const handleSpectatorChat = useCallback((data: Record<string, unknown>) => {
    const senderId = data.senderId as string;
    const senderName = data.senderName as string;
    const content = data.content as string;
    const timestamp = (data.timestamp as number) || Date.now();

    addMessage({
      id: `spectator_${timestamp}_${senderId}`,
      senderId,
      senderName,
      content,
      timestamp,
      type: 'spectator',
      isSpectator: true,
    });
  }, [addMessage]);

  // 处理观战者完整状态（接收所有角色信息）
  const handleSpectatorFullState = useCallback((data: Record<string, unknown>) => {
    const {
      setIsSpectator,
      setSpectatorFullState,
      setPlayers,
      setGameState,
      setSpectators
    } = useGameStore.getState();

    // 设置为观战模式
    setIsSpectator(true);

    // 保存完整状态
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSpectatorFullState(data as any);

    // 更新玩家列表（观战者可以看到所有角色）
    const players = (data.players as Player[]) || [];
    setPlayers(players.map(p => ({
      ...p,
      isAlive: p.status === 'alive',
    })));

    // 更新游戏状态
    setGameState({
      phase: data.phase as GamePhase,
      dayCount: data.dayNumber as number,
    });

    // 更新观战者列表
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spectators = (data.spectators as any[]) || [];
    setSpectators(spectators);

    console.log('Spectator mode: received full game state', data);
  }, []);

  // 连接 WebSocket
  const connectSocket = useCallback(async (session: Session) => {
    if (!clientRef.current) throw new Error('Client not initialized');

    const socket = clientRef.current.createSocket(NAKAMA_USE_SSL, false);

    socket.onmatchdata = handleMatchData;

    socket.onmatchpresence = (matchPresence) => {
      console.log('Match presence:', matchPresence);
    };

    socket.ondisconnect = () => {
      setConnected(false);
      setIsAuthenticated(false);
      console.log('Socket disconnected');
    };

    await socket.connect(session, true);
    socketRef.current = socket;
    setConnected(true);
    setIsAuthenticated(true);
    console.log('Connected to Nakama:', session.user_id);
  }, [handleMatchData, setConnected]);

  // 设备认证（匿名登录）
  const authenticate = useCallback(async (username?: string) => {
    if (!clientRef.current) return;

    setIsConnecting(true);
    setError(null);

    try {
      const deviceId = getDeviceId();
      const name = username || playerName || `玩家${deviceId.slice(-4)}`;

      // 设备认证（匿名登录）
      const session = await clientRef.current.authenticateDevice(deviceId, true, name);
      sessionRef.current = session;

      setPlayerId(session.user_id || '');
      setPlayerName(name);
      setAuthMethod('device');
      setUserEmail(null);

      // 保存会话
      saveSession(session, 'device');

      // 连接 WebSocket
      await connectSocket(session);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Authentication failed';
      setError(message);
      console.error('Authentication error:', e);
    } finally {
      setIsConnecting(false);
    }
  }, [playerName, setPlayerId, setPlayerName, connectSocket]);

  // 邮箱登录
  const authenticateWithEmail = useCallback(async (
    email: string,
    password: string,
    remember: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 邮箱认证
      const session = await clientRef.current.authenticateEmail(email, password, false);
      sessionRef.current = session;

      setPlayerId(session.user_id || '');
      setPlayerName(session.username || email.split('@')[0]);
      setAuthMethod('email');
      setUserEmail(email);

      // 保存会话（如果记住登录）
      if (remember) {
        saveSession(session, 'email', email);
      }

      // 连接 WebSocket
      await connectSocket(session);

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      setError(message);
      console.error('Email login error:', e);

      // 更友好的错误消息
      if (message.includes('not found') || message.includes('invalid')) {
        return { success: false, error: '邮箱或密码错误' };
      }
      return { success: false, error: message };
    } finally {
      setIsConnecting(false);
    }
  }, [setPlayerId, setPlayerName, connectSocket]);

  // 邮箱注册
  const registerWithEmail = useCallback(async (
    email: string,
    password: string,
    username: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }

    // 验证输入
    if (!email || !email.includes('@')) {
      return { success: false, error: '请输入有效的邮箱地址' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: '密码至少需要6个字符' };
    }
    if (!username || username.length < 2) {
      return { success: false, error: '用户名至少需要2个字符' };
    }
    if (username.length > 12) {
      return { success: false, error: '用户名最多12个字符' };
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 创建账户（create=true）
      const session = await clientRef.current.authenticateEmail(email, password, true, username);
      sessionRef.current = session;

      setPlayerId(session.user_id || '');
      setPlayerName(username);
      setAuthMethod('email');
      setUserEmail(email);

      // 保存会话
      saveSession(session, 'email', email);

      // 连接 WebSocket
      await connectSocket(session);

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      setError(message);
      console.error('Email registration error:', e);

      // 更友好的错误消息
      if (message.includes('already exists') || message.includes('taken')) {
        return { success: false, error: '该邮箱已被注册' };
      }
      if (message.includes('username')) {
        return { success: false, error: '该用户名已被使用' };
      }
      return { success: false, error: message };
    } finally {
      setIsConnecting(false);
    }
  }, [setPlayerId, setPlayerName, connectSocket]);

  // 绑定邮箱（将设备账户升级为邮箱账户）
  const linkEmail = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clientRef.current || !sessionRef.current) {
      return { success: false, error: 'Not authenticated' };
    }

    // 验证输入
    if (!email || !email.includes('@')) {
      return { success: false, error: '请输入有效的邮箱地址' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: '密码至少需要6个字符' };
    }

    try {
      await clientRef.current.linkEmail(sessionRef.current, { email, password });

      setAuthMethod('email');
      setUserEmail(email);

      // 更新保存的会话
      saveSession(sessionRef.current, 'email', email);

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Link email failed';
      console.error('Link email error:', e);

      if (message.includes('already exists') || message.includes('taken')) {
        return { success: false, error: '该邮箱已被其他账户使用' };
      }
      return { success: false, error: message };
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect(true);
      socketRef.current = null;
    }
    sessionRef.current = null;
    matchRef.current = null;
    setConnected(false);
    setIsAuthenticated(false);
    setAuthMethod(null);
    setUserEmail(null);
    clearSession();
    resetGame();
  }, [setConnected, resetGame]);

  // 创建房间
  const createMatch = useCallback(async (settings?: {
    roomName?: string;
    maxPlayers?: number;
    roles?: string[];
    password?: string;         // 房间密码
    discussionTime?: number;
    votingTime?: number;
    nightActionTime?: number;
    lastWordsTime?: number;
    allowSheriff?: boolean;
    allowLastWords?: boolean;
  }): Promise<string> => {
    if (!clientRef.current || !sessionRef.current) {
      throw new Error('Not authenticated');
    }

    try {
      const payload: Record<string, string> = {
        maxPlayers: String(settings?.maxPlayers || 9),
      };

      // Add optional room settings
      if (settings?.roomName) {
        payload.roomName = settings.roomName;
      }
      if (settings?.roles && settings.roles.length > 0) {
        payload.roles = JSON.stringify(settings.roles);
      }
      // Add password for private rooms
      if (settings?.password && settings.password.trim().length > 0) {
        payload.password = settings.password.trim();
      }
      if (settings?.discussionTime !== undefined) {
        payload.discussionTime = String(settings.discussionTime);
      }
      if (settings?.votingTime !== undefined) {
        payload.votingTime = String(settings.votingTime);
      }
      if (settings?.nightActionTime !== undefined) {
        payload.nightActionTime = String(settings.nightActionTime);
      }
      if (settings?.lastWordsTime !== undefined) {
        payload.lastWordsTime = String(settings.lastWordsTime);
      }
      if (settings?.allowSheriff !== undefined) {
        payload.allowSheriff = String(settings.allowSheriff);
      }
      if (settings?.allowLastWords !== undefined) {
        payload.allowLastWords = String(settings.allowLastWords);
      }

      const response = await clientRef.current.rpc(
        sessionRef.current,
        'create_match',
        payload
      );

      const result = response.payload as { matchId: string };
      return result.matchId;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create match';
      throw new Error(message);
    }
  }, []);

  // 加入房间（支持密码）
  const joinMatch = useCallback(async (matchId: string, password?: string) => {
    if (!socketRef.current) {
      throw new Error('Not connected');
    }

    try {
      // Pass password as metadata if provided
      const metadata = password ? { password } : {};
      const match = await socketRef.current.joinMatch(matchId, undefined, metadata);
      matchRef.current = match;
      setMatchId(matchId);

      console.log('Joined match:', matchId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to join match';
      throw new Error(message);
    }
  }, [setMatchId]);

  // 离开房间
  const leaveMatch = useCallback(async () => {
    if (!socketRef.current || !matchId) return;

    try {
      await socketRef.current.leaveMatch(matchId);
      matchRef.current = null;
      setMatchId(null);
      resetGame();

      console.log('Left match');
    } catch (e) {
      console.error('Failed to leave match:', e);
    }
  }, [matchId, setMatchId, resetGame]);

  // 列出房间（使用自定义 RPC 获取扩展字段）
  const listMatches = useCallback(async (): Promise<MatchInfo[]> => {
    if (!clientRef.current || !sessionRef.current) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'list_matches',
        { includeInProgress: true }
      );
      const result = response.payload as {
        success: boolean;
        matches: Array<{
          matchId: string;
          players: number;
          phase: string;
          hostName: string;
          roomName: string;
          isPrivate: boolean;
          maxPlayers: number;
          settings: Record<string, unknown>;
        }>;
      };

      if (!result.success) {
        return [];
      }

      // Map to MatchInfo format
      return result.matches.map((m) => ({
        match_id: m.matchId,
        authoritative: true,
        label: JSON.stringify({
          phase: m.phase,
          hostName: m.hostName,
          roomName: m.roomName,
          isPrivate: m.isPrivate,
          maxPlayers: m.maxPlayers,
          playerCount: m.players,
          settings: m.settings,
        }),
        size: m.players,
        tick_rate: 1,
        handler_name: 'werewolf',
        isPrivate: m.isPrivate,
        roomName: m.roomName,
        maxPlayers: m.maxPlayers,
      }));
    } catch (e) {
      console.error('Failed to list matches:', e);
      return [];
    }
  }, []);

  // 快速匹配
  const findMatch = useCallback(async (): Promise<string> => {
    if (!clientRef.current || !sessionRef.current) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await clientRef.current.rpc(sessionRef.current, 'find_match', {});
      const result = response.payload as { matchId: string };
      return result.matchId;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to find match';
      throw new Error(message);
    }
  }, []);

  // 发送消息的通用函数
  const sendMatchData = useCallback((opCode: OpCode, data: Record<string, unknown>) => {
    if (!socketRef.current || !matchId) {
      console.warn('Cannot send data: not in a match');
      return;
    }

    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(data));
    socketRef.current.sendMatchState(matchId, opCode, payload);
  }, [matchId]);

  // 发送准备状态
  const sendReady = useCallback((ready: boolean) => {
    sendMatchData(OpCode.PLAYER_READY, { isReady: ready });
  }, [sendMatchData]);

  // 发送投票
  const sendVote = useCallback((targetId: string | null) => {
    sendMatchData(OpCode.VOTE, { targetId });
  }, [sendMatchData]);

  // 发送技能使用
  const sendSkill = useCallback((skill: string, targetId: string | null, extraData?: Record<string, unknown>) => {
    sendMatchData(OpCode.USE_SKILL, { skill, targetId, ...extraData });
  }, [sendMatchData]);

  // 发送丘比特连线（选择两个情侣）
  const sendCupidLink = useCallback((targetId1: string, targetId2: string) => {
    sendMatchData(OpCode.USE_SKILL, { skill: 'link', targetId1, targetId2 });
  }, [sendMatchData]);

  // 发送开枪（死亡技能）
  const sendShoot = useCallback((targetId: string | null) => {
    sendMatchData(OpCode.USE_SKILL, { skill: 'shoot', targetId });
  }, [sendMatchData]);

  // 发送聊天消息
  const sendChat = useCallback((content: string, chatType: 'public' | 'wolf' | 'dead' | 'spectator' = 'public') => {
    const opCode = chatType === 'wolf' ? OpCode.WOLF_CHAT
      : chatType === 'dead' ? OpCode.DEAD_CHAT
      : chatType === 'spectator' ? OpCode.SPECTATOR_CHAT
      : OpCode.CHAT_MESSAGE;
    sendMatchData(opCode, {
      content,
      senderId: playerId,
      senderName: playerName,
    });
  }, [sendMatchData, playerId, playerName]);

  // ============================================================================
  // 警长系统操作
  // ============================================================================

  // 加入警长竞选
  const joinSheriffCampaign = useCallback(() => {
    sendMatchData(OpCode.SHERIFF_CAMPAIGN_JOIN, {});
  }, [sendMatchData]);

  // 退出警长竞选
  const quitSheriffCampaign = useCallback(() => {
    sendMatchData(OpCode.SHERIFF_CAMPAIGN_QUIT, {});
  }, [sendMatchData]);

  // 警长投票
  const sendSheriffVote = useCallback((candidateId: string) => {
    sendMatchData(OpCode.SHERIFF_VOTE, { candidateId });
  }, [sendMatchData]);

  // 移交警徽
  const sendSheriffTransfer = useCallback((targetId: string | null) => {
    sendMatchData(OpCode.SHERIFF_TRANSFER_DONE, { targetId });
  }, [sendMatchData]);

  // ============================================================================
  // 遗言系统操作
  // ============================================================================

  // 发送遗言
  const sendLastWords = useCallback((content: string) => {
    sendMatchData(OpCode.LAST_WORDS_SPEAK, { content });
  }, [sendMatchData]);

  // 放弃遗言
  const sendLastWordsSkip = useCallback(() => {
    sendMatchData(OpCode.LAST_WORDS_SKIP, {});
  }, [sendMatchData]);

  // ============================================================================
  // 用户统计操作
  // ============================================================================

  // 获取用户统计数据
  const getUserStats = useCallback(async (userId?: string): Promise<{ stats: UserStats; levelInfo: LevelInfo } | null> => {
    if (!clientRef.current || !sessionRef.current) {
      console.warn('Not connected, cannot get user stats');
      return null;
    }

    try {
      const payload = userId ? { userId } : {};
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_user_stats',
        payload
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success && data.stats) {
          // Ensure stats have level fields with defaults
          const stats = data.stats as UserStats;
          if (stats.level === undefined) {
            stats.level = 1;
            stats.currentXP = 0;
            stats.totalXP = 0;
            stats.winStreak = 0;
            stats.maxWinStreak = 0;
            stats.lastWinDate = '';
          }
          // Use server-provided levelInfo or create a default one
          const levelInfo: LevelInfo = data.levelInfo || {
            level: stats.level || 1,
            title: '初入狼村',
            titleColor: '#9CA3AF',
            currentXP: stats.currentXP || 0,
            requiredXP: 100,
            totalXP: stats.totalXP || 0,
            progress: 0,
          };
          return { stats, levelInfo };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  }, []);

  // 获取用户成就数据
  const getAchievements = useCallback(async (userId?: string): Promise<{
    achievements: UserAchievements;
    totalAchievements: number;
    unlockedAchievements: number;
    byCategory: Record<string, Array<{ definition: AchievementDefinition; progress: AchievementProgress }>>;
    definitions: Record<string, AchievementDefinition>;
  } | null> => {
    if (!clientRef.current || !sessionRef.current) {
      console.warn('Not connected, cannot get achievements');
      return null;
    }

    try {
      const payload = userId ? { userId } : {};
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_achievements',
        payload
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success) {
          return {
            achievements: data.achievements as UserAchievements,
            totalAchievements: data.totalAchievements || 0,
            unlockedAchievements: data.unlockedAchievements || 0,
            byCategory: data.byCategory || {},
            definitions: data.definitions || {},
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get achievements:', error);
      return null;
    }
  }, []);

  // ============================================================================
  // 好友邀请系统操作
  // ============================================================================

  // 搜索用户
  const searchUsers = useCallback(async (query: string): Promise<SearchedUser[]> => {
    if (!clientRef.current || !sessionRef.current) {
      console.warn('Not connected, cannot search users');
      return [];
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'search_users',
        { query }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success && data.users) {
          return data.users as SearchedUser[];
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }, []);

  // 发送邀请
  const sendInvite = useCallback(async (
    matchId: string,
    receiverId: string
  ): Promise<{ success: boolean; inviteId?: string; error?: string }> => {
    if (!clientRef.current || !sessionRef.current) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'send_invite',
        { matchId, receiverId }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        return data as { success: boolean; inviteId?: string; error?: string };
      }
      return { success: false, error: 'No response' };
    } catch (error) {
      console.error('Failed to send invite:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  // 获取邀请列表
  const getInvites = useCallback(async (type: 'sent' | 'received' = 'received'): Promise<GameInvite[]> => {
    if (!clientRef.current || !sessionRef.current) {
      console.warn('Not connected, cannot get invites');
      return [];
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_invites',
        { type }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success && data.invites) {
          return data.invites as GameInvite[];
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to get invites:', error);
      return [];
    }
  }, []);

  // 响应邀请
  const respondInvite = useCallback(async (
    inviteId: string,
    accept: boolean
  ): Promise<{ success: boolean; matchId?: string; password?: string; error?: string }> => {
    if (!clientRef.current || !sessionRef.current) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'respond_invite',
        { inviteId, accept }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        return data as { success: boolean; matchId?: string; password?: string; error?: string };
      }
      return { success: false, error: 'No response' };
    } catch (error) {
      console.error('Failed to respond to invite:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  // 取消邀请
  const cancelInvite = useCallback(async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    if (!clientRef.current || !sessionRef.current) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'cancel_invite',
        { inviteId }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        return data as { success: boolean; error?: string };
      }
      return { success: false, error: 'No response' };
    } catch (error) {
      console.error('Failed to cancel invite:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  // 获取排行榜
  const getLeaderboard = useCallback(async (
    type: 'level' | 'wins' | 'winRate' | 'winStreak' = 'level',
    limit: number = 50,
    offset: number = 0
  ) => {
    if (!clientRef.current || !sessionRef.current) {
      return null;
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_leaderboard',
        { type, limit, offset }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success) {
          return {
            leaderboard: data.leaderboard,
            type: data.type,
            total: data.total,
            myRank: data.myRank,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return null;
    }
  }, []);

  // 获取回放列表
  const getReplays = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!clientRef.current || !sessionRef.current) {
      return null;
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_replays',
        { limit, offset }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success) {
          return {
            replays: data.replays,
            total: data.total,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get replays:', error);
      return null;
    }
  }, []);

  // 获取单个回放详情
  const getReplayById = useCallback(async (replayId: string, ownerId?: string) => {
    if (!clientRef.current || !sessionRef.current) {
      return null;
    }

    try {
      const response = await clientRef.current.rpc(
        sessionRef.current,
        'get_replay',
        { replayId, ownerId }
      );

      if (response.payload) {
        const data = typeof response.payload === 'string'
          ? JSON.parse(response.payload)
          : response.payload;
        if (data.success) {
          return {
            replay: data.replay,
            stats: data.stats,
            keyEvents: data.keyEvents,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get replay:', error);
      return null;
    }
  }, []);

  return {
    isConnecting,
    isConnected,
    error,
    matchId,
    isAuthenticated,
    authMethod,
    userEmail,

    authenticate,
    authenticateWithEmail,
    registerWithEmail,
    linkEmail,
    logout,

    createMatch,
    joinMatch,
    leaveMatch,
    listMatches,
    findMatch,

    sendReady,
    sendVote,
    sendSkill,
    sendCupidLink,
    sendShoot,
    sendChat,

    // 警长系统
    joinSheriffCampaign,
    quitSheriffCampaign,
    sendSheriffVote,
    sendSheriffTransfer,

    // 遗言系统
    sendLastWords,
    sendLastWordsSkip,

    // 用户统计
    getUserStats,

    // 成就系统
    getAchievements,

    // 好友邀请系统
    searchUsers,
    sendInvite,
    getInvites,
    respondInvite,
    cancelInvite,

    // 排行榜
    getLeaderboard,

    // 回放系统
    getReplays,
    getReplayById,
  };
}

// 辅助函数：获取角色名称
function getRoleName(role: Role): string {
  const names: Record<Role, string> = {
    [Role.VILLAGER]: '村民',
    [Role.WEREWOLF]: '狼人',
    [Role.SEER]: '预言家',
    [Role.WITCH]: '女巫',
    [Role.HUNTER]: '猎人',
    [Role.GUARD]: '守卫',
    [Role.IDIOT]: '白痴',
    [Role.ALPHA_WOLF]: '狼王',
    [Role.CUPID]: '丘比特',
    [Role.LOVER]: '情侣',
  };
  return names[role] || role;
}

// 辅助函数：获取阶段消息
function getPhaseMessage(phase: GamePhase): string {
  const messages: Record<GamePhase, string> = {
    [GamePhase.WAITING]: '等待玩家加入...',
    [GamePhase.STARTING]: '游戏开始，正在分配角色...',
    [GamePhase.NIGHT]: '天黑请闭眼',
    [GamePhase.NIGHT_CUPID]: '💘 丘比特请睁眼，选择一对情侣',
    [GamePhase.NIGHT_WEREWOLF]: '狼人请睁眼',
    [GamePhase.NIGHT_SEER]: '预言家请睁眼',
    [GamePhase.NIGHT_WITCH]: '女巫请睁眼',
    [GamePhase.NIGHT_GUARD]: '守卫请睁眼',
    [GamePhase.DAY_ANNOUNCE]: '天亮了',
    [GamePhase.SHERIFF_CAMPAIGN]: '🏅 警长竞选开始',
    [GamePhase.SHERIFF_SPEECH]: '🎤 警长竞选发言',
    [GamePhase.SHERIFF_VOTING]: '🗳️ 警长投票',
    [GamePhase.SHERIFF_TRANSFER]: '🏅 警徽移交',
    [GamePhase.DAY_DISCUSSION]: '进入讨论阶段',
    [GamePhase.DAY_VOTING]: '进入投票阶段',
    [GamePhase.DAY_EXECUTION]: '投票结束',
    [GamePhase.LAST_WORDS]: '遗言时间',
    [GamePhase.DEATH_SKILL]: '猎人/狼王开枪',
    [GamePhase.GAME_OVER]: '游戏结束',
  };
  return messages[phase] || phase;
}

export default useNakama;
