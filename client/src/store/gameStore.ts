import { create } from 'zustand';
import type { Player, GameState, ChatMessage, Role, GamePhase, VoteResult, Faction, LoverInfo, NightSubPhase, SheriffElectionInfo, SheriffTransferInfo, LastWordsInfo, Spectator, SpectatorFullState } from '../types/werewolf';
import type { DeathEvent } from '../components/DeathEffect';

// 预言家查验结果
export interface SeerCheckResult {
  targetId: string;
  targetName: string;
  faction: Faction;  // 只显示阵营
}

// 女巫药品状态
export interface WitchPotions {
  hasAntidote: boolean;  // 是否还有解药
  hasPoison: boolean;    // 是否还有毒药
}

// 今晚被杀信息（女巫可见）
export interface NightKillInfo {
  targetId: string | null;
  targetName: string | null;
}

// 发言状态
export interface SpeakingState {
  isFreeDiscussion: boolean;      // 是否自由发言
  speakingOrder: string[];        // 发言顺序（玩家ID列表）
  currentSpeakerIndex: number;    // 当前发言者索引
  currentSpeakerId: string | null; // 当前发言者ID
  speakerTimeLimit: number;       // 每人发言时间（秒）
  isPaused: boolean;              // 是否暂停
}

interface GameStore {
  // 连接状态
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // 玩家信息
  playerId: string;
  playerName: string;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;

  // 当前房间
  matchId: string | null;
  setMatchId: (id: string | null) => void;

  // 我的角色
  myRole: Role | null;
  setMyRole: (role: Role | null) => void;

  // 玩家列表
  players: Player[];
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;

  // 游戏状态
  gameState: GameState;
  setGameState: (state: Partial<GameState>) => void;

  // 聊天消息
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // 夜晚行动目标
  nightTarget: string | null;
  setNightTarget: (target: string | null) => void;

  // 投票目标
  voteTarget: string | null;
  setVoteTarget: (target: string | null) => void;

  // 投票结果
  voteResult: VoteResult | null;
  setVoteResult: (result: VoteResult | null) => void;

  // 死亡技能（开枪）目标
  shootTarget: string | null;
  setShootTarget: (target: string | null) => void;

  // 当前开枪的玩家（死亡技能阶段）
  currentShooter: string | null;
  setCurrentShooter: (shooterId: string | null) => void;

  // === 夜晚技能相关状态 ===
  // 预言家查验结果
  seerCheckResult: SeerCheckResult | null;
  setSeerCheckResult: (result: SeerCheckResult | null) => void;

  // 女巫药品状态
  witchPotions: WitchPotions;
  setWitchPotions: (potions: WitchPotions) => void;

  // 今晚被杀的玩家（女巫可见）
  nightKillInfo: NightKillInfo;
  setNightKillInfo: (info: NightKillInfo) => void;

  // 守卫上一晚守护的目标（不能连续守护同一人）
  lastGuardTarget: string | null;
  setLastGuardTarget: (targetId: string | null) => void;

  // 女巫选择的技能类型
  witchAction: 'none' | 'save' | 'poison' | null;
  setWitchAction: (action: 'none' | 'save' | 'poison' | null) => void;

  // === 情侣相关状态 ===
  // 我的情侣信息（如果我是情侣）
  myLoverInfo: LoverInfo | null;
  setMyLoverInfo: (info: LoverInfo | null) => void;

  // 丘比特选择的两个目标（丘比特专用）
  cupidTargets: { target1: string | null; target2: string | null };
  setCupidTargets: (targets: { target1: string | null; target2: string | null }) => void;

  // 当前夜晚子阶段
  nightSubPhase: NightSubPhase | null;
  setNightSubPhase: (phase: NightSubPhase | null) => void;

  // 发言状态
  speakingState: SpeakingState;
  setSpeakingState: (state: Partial<SpeakingState>) => void;
  nextSpeaker: () => void;

  // === 警长系统相关状态 ===
  // 当前警长ID
  sheriffId: string | null;
  setSheriffId: (id: string | null) => void;

  // 我是否已报名竞选
  isMySelfCandidate: boolean;
  setIsMySelfCandidate: (isCandidate: boolean) => void;

  // 警长竞选信息
  sheriffElectionInfo: SheriffElectionInfo | null;
  setSheriffElectionInfo: (info: SheriffElectionInfo | null) => void;

  // 警长投票目标
  sheriffVoteTarget: string | null;
  setSheriffVoteTarget: (target: string | null) => void;

  // 警徽移交信息
  sheriffTransferInfo: SheriffTransferInfo | null;
  setSheriffTransferInfo: (info: SheriffTransferInfo | null) => void;

  // 警徽移交目标
  sheriffTransferTarget: string | null;
  setSheriffTransferTarget: (target: string | null) => void;

  // === 遗言系统相关状态 ===
  // 遗言信息（当前发表遗言的玩家）
  lastWordsInfo: LastWordsInfo | null;
  setLastWordsInfo: (info: LastWordsInfo | null) => void;

  // 遗言内容（已发表的遗言）
  lastWordsMessage: string | null;
  setLastWordsMessage: (message: string | null) => void;

  // 是否是我在发表遗言
  isMyLastWords: boolean;
  setIsMyLastWords: (isMyLastWords: boolean) => void;

  // === 死亡特效相关状态 ===
  // 死亡事件队列
  deathEvents: DeathEvent[];
  // 添加单个死亡事件
  addDeathEvent: (event: Omit<DeathEvent, 'timestamp'>) => void;
  // 批量添加死亡事件
  addDeathEvents: (events: Omit<DeathEvent, 'timestamp'>[]) => void;
  // 获取并移除第一个死亡事件
  popDeathEvent: () => DeathEvent | null;
  // 当前正在播放的死亡事件
  currentDeathEvent: DeathEvent | null;
  setCurrentDeathEvent: (event: DeathEvent | null) => void;
  // 清空死亡事件
  clearDeathEvents: () => void;

  // === 观战模式相关状态 ===
  // 是否为观战者
  isSpectator: boolean;
  setIsSpectator: (isSpectator: boolean) => void;

  // 观战者列表
  spectators: Spectator[];
  setSpectators: (spectators: Spectator[]) => void;

  // 观战者完整状态（包含所有角色信息）
  spectatorFullState: SpectatorFullState | null;
  setSpectatorFullState: (state: SpectatorFullState | null) => void;

  // 重置游戏状态
  resetGame: () => void;
}

const initialGameState: GameState = {
  matchId: '',
  phase: 'waiting' as GamePhase,
  dayCount: 0,
  timer: undefined,
  winner: undefined,
};

const initialWitchPotions: WitchPotions = {
  hasAntidote: true,
  hasPoison: true,
};

const initialNightKillInfo: NightKillInfo = {
  targetId: null,
  targetName: null,
};

const initialSpeakingState: SpeakingState = {
  isFreeDiscussion: true,
  speakingOrder: [],
  currentSpeakerIndex: 0,
  currentSpeakerId: null,
  speakerTimeLimit: 60,
  isPaused: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  // 连接状态
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // 玩家信息
  playerId: '',
  playerName: '',
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),

  // 当前房间
  matchId: null,
  setMatchId: (id) => set({ matchId: id }),

  // 我的角色
  myRole: null,
  setMyRole: (role) => set({ myRole: role }),

  // 玩家列表
  players: [],
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, updates) => {
    const { players } = get();
    set({
      players: players.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  },

  // 游戏状态
  gameState: initialGameState,
  setGameState: (state) => set((prev) => ({
    gameState: { ...prev.gameState, ...state },
  })),

  // 聊天消息
  messages: [],
  addMessage: (message) => set((prev) => ({
    messages: [...prev.messages, message].slice(-100), // 保留最近100条
  })),
  clearMessages: () => set({ messages: [] }),

  // 夜晚行动目标
  nightTarget: null,
  setNightTarget: (target) => set({ nightTarget: target }),

  // 投票目标
  voteTarget: null,
  setVoteTarget: (target) => set({ voteTarget: target }),

  // 投票结果
  voteResult: null,
  setVoteResult: (result) => set({ voteResult: result }),

  // 死亡技能（开枪）目标
  shootTarget: null,
  setShootTarget: (target) => set({ shootTarget: target }),

  // 当前开枪的玩家
  currentShooter: null,
  setCurrentShooter: (shooterId) => set({ currentShooter: shooterId }),

  // === 夜晚技能相关状态 ===
  // 预言家查验结果
  seerCheckResult: null,
  setSeerCheckResult: (result) => set({ seerCheckResult: result }),

  // 女巫药品状态
  witchPotions: initialWitchPotions,
  setWitchPotions: (potions) => set({ witchPotions: potions }),

  // 今晚被杀的玩家
  nightKillInfo: initialNightKillInfo,
  setNightKillInfo: (info) => set({ nightKillInfo: info }),

  // 守卫上一晚守护的目标
  lastGuardTarget: null,
  setLastGuardTarget: (targetId) => set({ lastGuardTarget: targetId }),

  // 女巫选择的技能类型
  witchAction: null,
  setWitchAction: (action) => set({ witchAction: action }),

  // === 情侣相关状态 ===
  // 我的情侣信息
  myLoverInfo: null,
  setMyLoverInfo: (info) => set({ myLoverInfo: info }),

  // 丘比特选择的目标
  cupidTargets: { target1: null, target2: null },
  setCupidTargets: (targets) => set({ cupidTargets: targets }),

  // 当前夜晚子阶段
  nightSubPhase: null,
  setNightSubPhase: (phase) => set({ nightSubPhase: phase }),

  // 发言状态
  speakingState: initialSpeakingState,
  setSpeakingState: (state) => set((prev) => ({
    speakingState: { ...prev.speakingState, ...state },
  })),
  nextSpeaker: () => {
    const { speakingState } = get();
    const nextIndex = speakingState.currentSpeakerIndex + 1;
    if (nextIndex < speakingState.speakingOrder.length) {
      set({
        speakingState: {
          ...speakingState,
          currentSpeakerIndex: nextIndex,
          currentSpeakerId: speakingState.speakingOrder[nextIndex],
        },
      });
    }
  },

  // === 警长系统相关状态 ===
  // 当前警长ID
  sheriffId: null,
  setSheriffId: (id) => set({ sheriffId: id }),

  // 我是否已报名竞选
  isMySelfCandidate: false,
  setIsMySelfCandidate: (isCandidate) => set({ isMySelfCandidate: isCandidate }),

  // 警长竞选信息
  sheriffElectionInfo: null,
  setSheriffElectionInfo: (info) => set({ sheriffElectionInfo: info }),

  // 警长投票目标
  sheriffVoteTarget: null,
  setSheriffVoteTarget: (target) => set({ sheriffVoteTarget: target }),

  // 警徽移交信息
  sheriffTransferInfo: null,
  setSheriffTransferInfo: (info) => set({ sheriffTransferInfo: info }),

  // 警徽移交目标
  sheriffTransferTarget: null,
  setSheriffTransferTarget: (target) => set({ sheriffTransferTarget: target }),

  // === 遗言系统相关状态 ===
  // 遗言信息
  lastWordsInfo: null,
  setLastWordsInfo: (info) => set({ lastWordsInfo: info }),

  // 遗言内容
  lastWordsMessage: null,
  setLastWordsMessage: (message) => set({ lastWordsMessage: message }),

  // 是否是我在发表遗言
  isMyLastWords: false,
  setIsMyLastWords: (isMyLastWords) => set({ isMyLastWords }),

  // === 死亡特效相关状态 ===
  // 死亡事件队列
  deathEvents: [],
  // 添加单个死亡事件
  addDeathEvent: (event) => set((prev) => ({
    deathEvents: [...prev.deathEvents, { ...event, timestamp: Date.now() }],
  })),
  // 批量添加死亡事件
  addDeathEvents: (events) => set((prev) => ({
    deathEvents: [
      ...prev.deathEvents,
      ...events.map((event, index) => ({ ...event, timestamp: Date.now() + index * 100 })),
    ],
  })),
  // 获取并移除第一个死亡事件
  popDeathEvent: () => {
    const { deathEvents } = get();
    if (deathEvents.length === 0) return null;
    const [first, ...rest] = deathEvents;
    set({ deathEvents: rest });
    return first;
  },
  // 当前正在播放的死亡事件
  currentDeathEvent: null,
  setCurrentDeathEvent: (event) => set({ currentDeathEvent: event }),
  // 清空死亡事件
  clearDeathEvents: () => set({ deathEvents: [], currentDeathEvent: null }),

  // === 观战模式相关状态 ===
  // 是否为观战者
  isSpectator: false,
  setIsSpectator: (isSpectator) => set({ isSpectator }),

  // 观战者列表
  spectators: [],
  setSpectators: (spectators) => set({ spectators }),

  // 观战者完整状态
  spectatorFullState: null,
  setSpectatorFullState: (state) => set({ spectatorFullState: state }),

  // 重置游戏状态
  resetGame: () => set({
    matchId: null,
    myRole: null,
    players: [],
    gameState: initialGameState,
    messages: [],
    nightTarget: null,
    voteTarget: null,
    voteResult: null,
    shootTarget: null,
    currentShooter: null,
    seerCheckResult: null,
    witchPotions: initialWitchPotions,
    nightKillInfo: initialNightKillInfo,
    lastGuardTarget: null,
    witchAction: null,
    myLoverInfo: null,
    cupidTargets: { target1: null, target2: null },
    nightSubPhase: null,
    speakingState: initialSpeakingState,
    // 警长系统重置
    sheriffId: null,
    isMySelfCandidate: false,
    sheriffElectionInfo: null,
    sheriffVoteTarget: null,
    sheriffTransferInfo: null,
    sheriffTransferTarget: null,
    // 遗言系统重置
    lastWordsInfo: null,
    lastWordsMessage: null,
    isMyLastWords: false,
    // 死亡特效系统重置
    deathEvents: [],
    currentDeathEvent: null,
    // 观战模式重置
    isSpectator: false,
    spectators: [],
    spectatorFullState: null,
  }),
}));

// 辅助函数：获取存活的玩家
export function getAlivePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive);
}

// 辅助函数：获取存活的狼人数量
export function getAliveWerewolfCount(players: Player[]): number {
  return players.filter(
    (p) => p.isAlive && (p.role === 'werewolf' || p.role === 'alpha_wolf')
  ).length;
}

// 辅助函数：获取存活的好人数量
export function getAliveVillagerCount(players: Player[]): number {
  return players.filter(
    (p) => p.isAlive && p.role !== 'werewolf' && p.role !== 'alpha_wolf'
  ).length;
}

// 辅助函数：根据座位号获取玩家
export function getPlayerBySeat(players: Player[], seatNumber: number): Player | undefined {
  return players.find((p) => p.seatNumber === seatNumber);
}
