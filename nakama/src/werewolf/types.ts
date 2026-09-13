/**
 * Werewolf Game Type Definitions
 * 狼人杀游戏类型定义
 */

// ============================================================================
// 角色定义 (Roles)
// ============================================================================

/** 角色枚举 */
export enum Role {
  // 好人阵营 - 村民
  VILLAGER = 'villager',

  // 好人阵营 - 神职
  SEER = 'seer',           // 预言家：每晚可查验一人身份
  WITCH = 'witch',         // 女巫：有一瓶解药和一瓶毒药
  HUNTER = 'hunter',       // 猎人：死亡时可带走一人
  GUARD = 'guard',         // 守卫：每晚可守护一人免受狼人袭击
  IDIOT = 'idiot',         // 白痴：被投票出局时可翻牌免死一次

  // 狼人阵营
  WEREWOLF = 'werewolf',       // 狼人：每晚可集体杀死一名玩家
  ALPHA_WOLF = 'alpha_wolf',   // 狼王：死亡时可带走一人

  // 第三方阵营（可选）
  CUPID = 'cupid',         // 丘比特：首夜连接两人为情侣
  THIEF = 'thief',         // 盗贼：首夜可偷取一个角色
}

/** 阵营类型 */
export enum Faction {
  VILLAGER = 'villager',   // 好人阵营（村民方）
  WEREWOLF = 'werewolf',   // 狼人阵营
  NEUTRAL = 'neutral',     // 第三方/中立
  LOVERS = 'lovers',       // 情侣阵营（特殊获胜条件）
}

/** 角色信息 */
export interface RoleInfo {
  role: Role;
  faction: Faction;
  name: string;
  description: string;
  hasNightAction: boolean;
  nightActionOrder: number;  // 夜晚行动顺序，数字越小越先行动
}

/** 角色配置映射 */
export const ROLE_CONFIG: Record<Role, RoleInfo> = {
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    faction: Faction.VILLAGER,
    name: '村民',
    description: '无特殊能力',
    hasNightAction: false,
    nightActionOrder: 100,
  },
  [Role.SEER]: {
    role: Role.SEER,
    faction: Faction.VILLAGER,
    name: '预言家',
    description: '每晚可查验一人身份',
    hasNightAction: true,
    nightActionOrder: 30,
  },
  [Role.WITCH]: {
    role: Role.WITCH,
    faction: Faction.VILLAGER,
    name: '女巫',
    description: '有一瓶解药和一瓶毒药',
    hasNightAction: true,
    nightActionOrder: 40,
  },
  [Role.HUNTER]: {
    role: Role.HUNTER,
    faction: Faction.VILLAGER,
    name: '猎人',
    description: '死亡时可带走一人',
    hasNightAction: false,
    nightActionOrder: 100,
  },
  [Role.GUARD]: {
    role: Role.GUARD,
    faction: Faction.VILLAGER,
    name: '守卫',
    description: '每晚可守护一人免受狼人袭击',
    hasNightAction: true,
    nightActionOrder: 20,
  },
  [Role.IDIOT]: {
    role: Role.IDIOT,
    faction: Faction.VILLAGER,
    name: '白痴',
    description: '被投票出局时可翻牌免死一次',
    hasNightAction: false,
    nightActionOrder: 100,
  },
  [Role.WEREWOLF]: {
    role: Role.WEREWOLF,
    faction: Faction.WEREWOLF,
    name: '狼人',
    description: '每晚可集体杀死一名玩家',
    hasNightAction: true,
    nightActionOrder: 10,
  },
  [Role.ALPHA_WOLF]: {
    role: Role.ALPHA_WOLF,
    faction: Faction.WEREWOLF,
    name: '狼王',
    description: '死亡时可带走一人',
    hasNightAction: true,
    nightActionOrder: 10,
  },
  [Role.CUPID]: {
    role: Role.CUPID,
    faction: Faction.NEUTRAL,
    name: '丘比特',
    description: '首夜连接两人为情侣',
    hasNightAction: true,
    nightActionOrder: 1,
  },
  [Role.THIEF]: {
    role: Role.THIEF,
    faction: Faction.NEUTRAL,
    name: '盗贼',
    description: '首夜可偷取一个角色',
    hasNightAction: true,
    nightActionOrder: 0,
  },
};

// ============================================================================
// 游戏阶段 (Game Phases)
// ============================================================================

/** 游戏阶段枚举 */
export enum GamePhase {
  WAITING = 'waiting',           // 等待玩家加入
  STARTING = 'starting',         // 游戏开始，分配角色
  FIRST_NIGHT = 'first_night',   // 首夜（特殊角色行动）
  NIGHT = 'night',               // 夜晚阶段
  NIGHT_RESULT = 'night_result', // 夜晚结果公布
  SHERIFF_CAMPAIGN = 'sheriff_campaign',     // 警长竞选报名阶段
  SHERIFF_SPEECH = 'sheriff_speech',         // 警长竞选发言阶段
  SHERIFF_VOTING = 'sheriff_voting',         // 警长投票阶段
  SHERIFF_TRANSFER = 'sheriff_transfer',     // 警徽移交阶段（警长死亡时）
  DAY_DISCUSSION = 'day_discussion',   // 白天讨论/发言阶段
  DAY_VOTING = 'day_voting',     // 白天投票阶段
  VOTE_RESULT = 'vote_result',   // 投票结果
  LAST_WORDS = 'last_words',     // 遗言阶段
  DEATH_SKILL = 'death_skill',   // 死亡技能阶段（猎人/狼王开枪）
  GAME_OVER = 'game_over',       // 游戏结束
}

/** 夜晚子阶段（按顺序执行） */
export enum NightSubPhase {
  THIEF = 'thief',           // 盗贼行动（仅首夜）
  CUPID = 'cupid',           // 丘比特行动（仅首夜）
  WEREWOLF = 'werewolf',     // 狼人行动
  GUARD = 'guard',           // 守卫行动
  SEER = 'seer',             // 预言家行动
  WITCH = 'witch',           // 女巫行动
  COMPLETE = 'complete',     // 夜晚结束
}

// ============================================================================
// 玩家状态 (Player Status)
// ============================================================================

/** 玩家存活状态 */
export enum PlayerStatus {
  ALIVE = 'alive',               // 存活
  DEAD_BY_WOLF = 'dead_by_wolf', // 被狼人杀死
  DEAD_BY_VOTE = 'dead_by_vote', // 被投票处死
  DEAD_BY_POISON = 'dead_by_poison', // 被女巫毒死
  DEAD_BY_HUNTER = 'dead_by_hunter', // 被猎人带走
  DEAD_BY_ALPHA_WOLF = 'dead_by_alpha_wolf', // 被狼王带走
  DEAD_BY_LOVER = 'dead_by_lover',   // 情侣殉情
}

/** 玩家连接状态 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

// ============================================================================
// 消息协议 (Message Protocol)
// ============================================================================

/** 操作码枚举 */
export enum OpCode {
  // 游戏状态 (1-9)
  GAME_STATE = 1,          // 完整游戏状态同步
  ROLE_ASSIGNED = 2,       // 角色分配通知
  PHASE_CHANGE = 3,        // 阶段变更通知
  PLAYER_LIST = 4,         // 玩家列表更新
  TIMER_UPDATE = 5,        // 计时器更新

  // 玩家操作 (10-19)
  PLAYER_ACTION = 10,      // 通用玩家操作
  VOTE = 11,               // 投票
  USE_SKILL = 12,          // 使用技能
  READY = 13,              // 准备/取消准备
  CONFIRM_ACTION = 14,     // 确认操作

  // 聊天 (20-29)
  CHAT_MESSAGE = 20,       // 公共聊天
  WOLF_CHAT = 21,          // 狼人专属频道
  DEAD_CHAT = 22,          // 死亡玩家聊天
  SYSTEM_MESSAGE = 23,     // 系统消息

  // 结果通知 (30-39)
  NIGHT_RESULT = 30,       // 夜晚结果
  VOTE_RESULT = 31,        // 投票结果
  SKILL_RESULT = 32,       // 技能结果
  GAME_OVER = 33,          // 游戏结束
  DEATH_INFO = 34,         // 死亡信息
  DEATH_SKILL_PROMPT = 35, // 死亡技能提示（猎人/狼王请开枪）
  DEATH_SKILL_RESULT = 36, // 死亡技能结果（开枪结果）
  IDIOT_REVEALED = 37,     // 白痴翻牌（投票出局时翻牌免死）
  CUPID_LINK = 38,         // 丘比特连线（情侣确认）
  LOVER_DEATH = 39,        // 情侣殉情（一方死亡另一方随死）

  // 系统事件 (40-49)
  PLAYER_READY = 40,       // 玩家准备状态
  PLAYER_DISCONNECTED = 41, // 玩家断开连接
  PLAYER_RECONNECTED = 42,  // 玩家重新连接
  PLAYER_KICKED = 43,       // 玩家被踢出
  MATCH_ERROR = 44,         // 匹配错误

  // 警长系统 (50-59)
  SHERIFF_CAMPAIGN_START = 50,   // 警长竞选开始
  SHERIFF_CAMPAIGN_JOIN = 51,    // 参与竞选
  SHERIFF_CAMPAIGN_QUIT = 52,    // 退出竞选
  SHERIFF_SPEECH_START = 53,     // 竞选发言开始（轮到某人发言）
  SHERIFF_VOTE = 54,             // 警长投票
  SHERIFF_ELECTED = 55,          // 警长当选
  SHERIFF_TRANSFER_START = 56,   // 警徽移交开始
  SHERIFF_TRANSFER_DONE = 57,    // 警徽移交完成
  SHERIFF_EXPLODE = 58,          // 警徽撕毁（警长选择不移交）

  // 遗言系统 (60-64)
  LAST_WORDS_START = 60,         // 遗言阶段开始（被处决玩家发表遗言）
  LAST_WORDS_SPEAK = 61,         // 遗言发言（被处决玩家发送遗言消息）
  LAST_WORDS_END = 62,           // 遗言阶段结束
  LAST_WORDS_SKIP = 63,          // 放弃遗言（被处决玩家选择不发言）

  // 观战系统 (70-74)
  SPECTATOR_JOIN = 70,           // 观战者加入
  SPECTATOR_LEAVE = 71,          // 观战者离开
  SPECTATOR_CHAT = 72,           // 观战者聊天（仅观战者可见）
  SPECTATOR_FULL_STATE = 73,     // 完整游戏状态（包含所有角色信息，仅发送给观战者）

  // 好友邀请系统 (80-85)
  INVITE_SENT = 80,              // 邀请已发送（发送者收到确认）
  INVITE_RECEIVED = 81,          // 收到邀请（被邀请者收到通知）
  INVITE_ACCEPTED = 82,          // 邀请已接受
  INVITE_DECLINED = 83,          // 邀请已拒绝
  INVITE_EXPIRED = 84,           // 邀请已过期
  INVITE_CANCELLED = 85,         // 邀请已取消
}

// ============================================================================
// 游戏配置 (Game Configuration)
// ============================================================================

/** 游戏配置 */
export interface GameConfig {
  minPlayers: number;       // 最少玩家数
  maxPlayers: number;       // 最多玩家数
  roles: Role[];            // 角色配置
  discussionTime: number;   // 讨论时间（秒）
  votingTime: number;       // 投票时间（秒）
  nightActionTime: number;  // 夜晚行动时间（秒）
  lastWordsTime: number;    // 遗言时间（秒）
  allowSheriff: boolean;    // 是否启用警长
  allowLastWords: boolean;  // 是否允许遗言
}

/** 预设角色配置 */
export const PRESET_CONFIGS: Record<number, Role[]> = {
  6: [
    Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.HUNTER,
    Role.VILLAGER, Role.VILLAGER,
  ],
  8: [
    Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.WITCH,
    Role.HUNTER,
    Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
  ],
  9: [
    Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.WITCH,
    Role.GUARD,
    Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
  ],
  12: [
    Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.WITCH,
    Role.GUARD,
    Role.HUNTER,
    Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
  ],
};

/** 默认游戏配置 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  minPlayers: 6,
  maxPlayers: 18,
  roles: PRESET_CONFIGS[9],
  discussionTime: 120,     // 2分钟讨论
  votingTime: 30,          // 30秒投票
  nightActionTime: 30,     // 30秒夜晚行动
  lastWordsTime: 30,       // 30秒遗言
  allowSheriff: false,
  allowLastWords: true,
};

// ============================================================================
// 玩家数据 (Player Data)
// ============================================================================

/** 玩家数据 */
export interface Player {
  oderId: string;          // Nakama 用户 ID
  odername: string;        // 用户名
  displayName: string;     // 显示名称
  seatNumber: number;      // 座位号（1-based）
  role: Role | null;       // 角色（游戏开始前为 null）
  status: PlayerStatus;    // 存活状态
  connection: ConnectionStatus; // 连接状态
  isReady: boolean;        // 是否准备
  votedFor: string | null; // 投票给谁（用户ID）
  lastAction: number;      // 最后操作时间戳
  isSpectator: boolean;    // 是否为观战者
}

/** 观战者数据 */
export interface Spectator {
  oderId: string;          // Nakama 用户 ID
  odername: string;        // 用户名
  displayName: string;     // 显示名称
  connection: ConnectionStatus; // 连接状态
  joinedAt: number;        // 加入时间
}

/** 女巫道具状态 */
export interface WitchItems {
  hasAntidote: boolean;    // 是否有解药
  hasPoison: boolean;      // 是否有毒药
}

/** 玩家扩展状态 */
export interface PlayerExtendedState {
  playerId: string;
  witchItems?: WitchItems;
  isProtected: boolean;    // 是否被守卫保护
  lastProtectedBy: string | null;  // 上一晚被谁守护
  idiotRevealed: boolean;  // 白痴是否已翻牌
  isLovers: boolean;       // 是否是情侣
  loverId: string | null;  // 情侣对象 ID
  /** Achievement skill counters accumulated during the match */
  seerCheckedWolves: number;
  witchSaved: boolean;
  witchPoisonedWolf: boolean;
  guardSaved: boolean;
  hunterKilledWolf: boolean;
  /** True once a seer has checked this werewolf */
  wasExposed: boolean;
  /** Wolves this player helped vote out */
  votedOutWolves: number;
}

// ============================================================================
// 游戏状态 (Game State)
// ============================================================================

/** 夜晚行动 */
export interface NightAction {
  playerId: string;
  role: Role;
  action: string;
  targetId: string | null;
  timestamp: number;
}

/** 投票记录 */
export interface VoteRecord {
  voterId: string;
  targetId: string | null;  // null 表示弃票
  timestamp: number;
}

/** 游戏状态 */
export interface GameState {
  matchId: string;
  phase: GamePhase;
  nightSubPhase: NightSubPhase | null;
  dayNumber: number;       // 第几天（从 1 开始）
  players: Map<string, Player>;
  spectators: Map<string, Spectator>;  // 观战者列表
  extendedStates: Map<string, PlayerExtendedState>;
  config: GameConfig;

  // 夜晚相关
  nightActions: NightAction[];
  wolfTarget: string | null;       // 狼人选择的目标
  wolfVotes: Map<string, string>;  // 狼人内部投票
  guardTarget: string | null;      // 守卫守护的目标
  seerTarget: string | null;       // 预言家查验的目标
  witchSaveTarget: string | null;  // 女巫救的目标
  witchPoisonTarget: string | null; // 女巫毒的目标

  // 丘比特/情侣相关
  cupidTarget1: string | null;     // 丘比特选择的第一个情侣
  cupidTarget2: string | null;     // 丘比特选择的第二个情侣
  loversLinked: boolean;           // 情侣是否已连接
  loversFaction: boolean;          // 情侣是否形成独立阵营（跨阵营情侣）

  // 白天相关
  votes: Map<string, VoteRecord>;  // 投票记录
  speakingOrder: string[];         // 发言顺序
  currentSpeaker: string | null;   // 当前发言人

  // 警长系统相关
  sheriffId: string | null;                    // 当前警长ID
  sheriffCampaignCandidates: string[];         // 竞选候选人列表
  sheriffVotes: Map<string, string>;           // 警长投票记录 (voterId -> candidateId)
  sheriffElectionDone: boolean;                // 警长竞选是否已完成（第一天后为true）
  currentCampaignSpeaker: string | null;       // 当前发言的竞选者
  campaignSpeakingOrder: string[];             // 竞选发言顺序
  sheriffTransferTarget: string | null;        // 警徽移交目标

  // 死亡技能相关（猎人/狼王）
  pendingShooters: string[];       // 待开枪的玩家队列（猎人/狼王）
  currentShooter: string | null;   // 当前正在开枪的玩家
  shooterTarget: string | null;    // 开枪目标
  previousPhase: GamePhase | null; // 进入死亡技能阶段前的阶段
  deathSkillDeaths: string[];      // 死亡技能阶段新增的死亡

  // 遗言相关
  lastWordsSpeaker: string | null; // 当前发表遗言的玩家
  lastWordsMessage: string | null; // 遗言内容
  lastWordsDeathCause: PlayerStatus | null; // 死亡原因

  // 计时器
  phaseStartTime: number;
  phaseEndTime: number;

  // 游戏结果
  winner: Faction | null;
  gameEndReason: string | null;
  /** When endGame ran without nk, flush stats/replay on next matchLoop tick */
  pendingStatsRecord: boolean;

  // 私密房间相关
  password: string | null;         // 房间密码（null 表示公开房间）
  roomName: string;                // 房间名称
}

// ============================================================================
// 消息类型 (Message Types)
// ============================================================================

/** 基础消息 */
export interface BaseMessage {
  opCode: OpCode;
  timestamp: number;
}

/** 游戏状态消息 */
export interface GameStateMessage extends BaseMessage {
  opCode: OpCode.GAME_STATE;
  phase: GamePhase;
  dayNumber: number;
  players: Player[];
  phaseEndTime: number;
}

/** 角色分配消息 */
export interface RoleAssignedMessage extends BaseMessage {
  opCode: OpCode.ROLE_ASSIGNED;
  role: Role;
  roleInfo: RoleInfo;
}

/** 阶段变更消息 */
export interface PhaseChangeMessage extends BaseMessage {
  opCode: OpCode.PHASE_CHANGE;
  phase: GamePhase;
  subPhase?: NightSubPhase;
  duration: number;        // 阶段持续时间（秒）
}

/** 投票消息 */
export interface VoteMessage extends BaseMessage {
  opCode: OpCode.VOTE;
  voterId: string;
  targetId: string | null;
}

/** 使用技能消息 */
export interface UseSkillMessage extends BaseMessage {
  opCode: OpCode.USE_SKILL;
  playerId: string;
  skill: string;
  targetId: string | null;
  extraData?: Record<string, unknown>;
}

/** 聊天消息 */
export interface ChatMessage extends BaseMessage {
  opCode: OpCode.CHAT_MESSAGE | OpCode.WOLF_CHAT | OpCode.DEAD_CHAT;
  senderId: string;
  senderName: string;
  content: string;
}

/** 夜晚结果消息 */
export interface NightResultMessage extends BaseMessage {
  opCode: OpCode.NIGHT_RESULT;
  deaths: Array<{
    playerId: string;
    playerName: string;
    cause: PlayerStatus;
  }>;
  savedByWitch: boolean;
}

/** 投票结果消息 */
export interface VoteResultMessage extends BaseMessage {
  opCode: OpCode.VOTE_RESULT;
  votes: Array<{
    voterId: string;
    targetId: string | null;
  }>;
  eliminated: string | null;  // 被处决的玩家 ID
  isTie: boolean;             // 是否平票
}

/** 游戏结束消息 */
export interface GameOverMessage extends BaseMessage {
  opCode: OpCode.GAME_OVER;
  winner: Faction;
  reason: string;
  players: Array<{
    playerId: string;
    playerName: string;
    role: Role;
    status: PlayerStatus;
  }>;
}

/** 技能结果消息（仅发送给使用者） */
export interface SkillResultMessage extends BaseMessage {
  opCode: OpCode.SKILL_RESULT;
  skill: string;
  success: boolean;
  result?: {
    targetId: string;
    faction?: Faction;       // 预言家查验结果
    isSaved?: boolean;       // 女巫救人结果
  };
}

// ============================================================================
// 用户统计 (User Statistics)
// ============================================================================

/** 角色统计 */
export interface RoleStats {
  played: number;        // 扮演次数
  wins: number;          // 胜利次数
}

/** 等级信息 */
export interface LevelInfo {
  level: number;           // 当前等级 (1-100)
  title: string;           // 等级称号
  titleColor: string;      // 称号颜色（CSS 颜色值）
  currentXP: number;       // 当前经验值
  requiredXP: number;      // 升级所需经验值
  totalXP: number;         // 累计总经验值
  progress: number;        // 升级进度 (0-100)
}

/** 等级配置 */
export interface LevelConfig {
  level: number;
  title: string;
  titleColor: string;
  minXP: number;           // 达到此等级所需的累计经验值
}

/** 等级称号配置（1-100级） */
export const LEVEL_CONFIGS: LevelConfig[] = [
  // 新手阶段 (1-10)
  { level: 1,  title: '初入狼村', titleColor: '#9CA3AF', minXP: 0 },
  { level: 2,  title: '狼村新人', titleColor: '#9CA3AF', minXP: 100 },
  { level: 3,  title: '懵懂村民', titleColor: '#9CA3AF', minXP: 250 },
  { level: 4,  title: '学徒猎人', titleColor: '#9CA3AF', minXP: 450 },
  { level: 5,  title: '见习守卫', titleColor: '#6EE7B7', minXP: 700 },
  { level: 6,  title: '初级预言', titleColor: '#6EE7B7', minXP: 1000 },
  { level: 7,  title: '女巫学徒', titleColor: '#6EE7B7', minXP: 1350 },
  { level: 8,  title: '狼崽子', titleColor: '#6EE7B7', minXP: 1750 },
  { level: 9,  title: '丘比特箭', titleColor: '#6EE7B7', minXP: 2200 },
  { level: 10, title: '月下旅人', titleColor: '#60A5FA', minXP: 2700 },

  // 成长阶段 (11-25)
  { level: 11, title: '资深村民', titleColor: '#60A5FA', minXP: 3250 },
  { level: 12, title: '神职新星', titleColor: '#60A5FA', minXP: 3850 },
  { level: 13, title: '狼人新秀', titleColor: '#60A5FA', minXP: 4500 },
  { level: 14, title: '夜行者', titleColor: '#60A5FA', minXP: 5200 },
  { level: 15, title: '月光使者', titleColor: '#A78BFA', minXP: 5950 },
  { level: 16, title: '暗夜猎手', titleColor: '#A78BFA', minXP: 6750 },
  { level: 17, title: '预言见习', titleColor: '#A78BFA', minXP: 7600 },
  { level: 18, title: '药剂调配', titleColor: '#A78BFA', minXP: 8500 },
  { level: 19, title: '守护之心', titleColor: '#A78BFA', minXP: 9450 },
  { level: 20, title: '狼群新贵', titleColor: '#F472B6', minXP: 10450 },
  { level: 21, title: '逻辑推理', titleColor: '#F472B6', minXP: 11500 },
  { level: 22, title: '读心初阶', titleColor: '#F472B6', minXP: 12600 },
  { level: 23, title: '伪装入门', titleColor: '#F472B6', minXP: 13750 },
  { level: 24, title: '表演天赋', titleColor: '#F472B6', minXP: 14950 },
  { level: 25, title: '月夜行者', titleColor: '#FBBF24', minXP: 16200 },

  // 精英阶段 (26-50)
  { level: 26, title: '精英村民', titleColor: '#FBBF24', minXP: 17500 },
  { level: 27, title: '王牌预言', titleColor: '#FBBF24', minXP: 18850 },
  { level: 28, title: '神级女巫', titleColor: '#FBBF24', minXP: 20250 },
  { level: 29, title: '铁壁守卫', titleColor: '#FBBF24', minXP: 21700 },
  { level: 30, title: '神枪猎人', titleColor: '#FB923C', minXP: 23200 },
  { level: 31, title: '狼族精英', titleColor: '#FB923C', minXP: 24750 },
  { level: 32, title: '心理专家', titleColor: '#FB923C', minXP: 26350 },
  { level: 33, title: '演技大师', titleColor: '#FB923C', minXP: 28000 },
  { level: 34, title: '察言观色', titleColor: '#FB923C', minXP: 29700 },
  { level: 35, title: '夜之统领', titleColor: '#F87171', minXP: 31450 },
  { level: 36, title: '村庄守护', titleColor: '#F87171', minXP: 33250 },
  { level: 37, title: '真理追寻', titleColor: '#F87171', minXP: 35100 },
  { level: 38, title: '暗影行者', titleColor: '#F87171', minXP: 37000 },
  { level: 39, title: '月下审判', titleColor: '#F87171', minXP: 38950 },
  { level: 40, title: '荣耀战士', titleColor: '#E11D48', minXP: 40950 },
  { level: 41, title: '狼群领袖', titleColor: '#E11D48', minXP: 43000 },
  { level: 42, title: '神职翘楚', titleColor: '#E11D48', minXP: 45100 },
  { level: 43, title: '战术大师', titleColor: '#E11D48', minXP: 47250 },
  { level: 44, title: '读心高手', titleColor: '#E11D48', minXP: 49450 },
  { level: 45, title: '月夜君王', titleColor: '#C026D3', minXP: 51700 },
  { level: 46, title: '预言圣者', titleColor: '#C026D3', minXP: 54000 },
  { level: 47, title: '药王传人', titleColor: '#C026D3', minXP: 56350 },
  { level: 48, title: '不朽守卫', titleColor: '#C026D3', minXP: 58750 },
  { level: 49, title: '死神猎手', titleColor: '#C026D3', minXP: 61200 },
  { level: 50, title: '狼人王者', titleColor: '#7C3AED', minXP: 63700 },

  // 大师阶段 (51-75)
  { level: 51, title: '村庄贤者', titleColor: '#7C3AED', minXP: 66250 },
  { level: 52, title: '战略家', titleColor: '#7C3AED', minXP: 68850 },
  { level: 53, title: '心灵捕手', titleColor: '#7C3AED', minXP: 71500 },
  { level: 54, title: '影之主宰', titleColor: '#7C3AED', minXP: 74200 },
  { level: 55, title: '月神使徒', titleColor: '#6366F1', minXP: 76950 },
  { level: 56, title: '全知先知', titleColor: '#6366F1', minXP: 79750 },
  { level: 57, title: '永恒女巫', titleColor: '#6366F1', minXP: 82600 },
  { level: 58, title: '圣盾守护', titleColor: '#6366F1', minXP: 85500 },
  { level: 59, title: '传奇猎人', titleColor: '#6366F1', minXP: 88450 },
  { level: 60, title: '狼皇', titleColor: '#DC2626', minXP: 91450 },
  { level: 61, title: '村庄元老', titleColor: '#DC2626', minXP: 94500 },
  { level: 62, title: '谋略宗师', titleColor: '#DC2626', minXP: 97600 },
  { level: 63, title: '洞察一切', titleColor: '#DC2626', minXP: 100750 },
  { level: 64, title: '暗夜帝王', titleColor: '#DC2626', minXP: 103950 },
  { level: 65, title: '月之化身', titleColor: '#EA580C', minXP: 107200 },
  { level: 66, title: '命运预言', titleColor: '#EA580C', minXP: 110500 },
  { level: 67, title: '万毒不侵', titleColor: '#EA580C', minXP: 113850 },
  { level: 68, title: '神圣守护', titleColor: '#EA580C', minXP: 117250 },
  { level: 69, title: '猎魔使者', titleColor: '#EA580C', minXP: 120700 },
  { level: 70, title: '嗜血狼王', titleColor: '#B91C1C', minXP: 124200 },
  { level: 71, title: '村庄传说', titleColor: '#B91C1C', minXP: 127750 },
  { level: 72, title: '战神化身', titleColor: '#B91C1C', minXP: 131350 },
  { level: 73, title: '心灵大师', titleColor: '#B91C1C', minXP: 135000 },
  { level: 74, title: '黑暗领主', titleColor: '#B91C1C', minXP: 138700 },
  { level: 75, title: '月光审判', titleColor: '#9333EA', minXP: 142450 },

  // 传奇阶段 (76-100)
  { level: 76, title: '万古预言', titleColor: '#9333EA', minXP: 146250 },
  { level: 77, title: '巫王后裔', titleColor: '#9333EA', minXP: 150100 },
  { level: 78, title: '神盾化身', titleColor: '#9333EA', minXP: 154000 },
  { level: 79, title: '猎神传人', titleColor: '#9333EA', minXP: 157950 },
  { level: 80, title: '远古狼灵', titleColor: '#D97706', minXP: 161950 },
  { level: 81, title: '村庄圣者', titleColor: '#D97706', minXP: 166000 },
  { level: 82, title: '策略之神', titleColor: '#D97706', minXP: 170100 },
  { level: 83, title: '心灵操控', titleColor: '#D97706', minXP: 174250 },
  { level: 84, title: '影界之主', titleColor: '#D97706', minXP: 178450 },
  { level: 85, title: '月神代言', titleColor: '#CA8A04', minXP: 182700 },
  { level: 86, title: '先知圣殿', titleColor: '#CA8A04', minXP: 187000 },
  { level: 87, title: '毒王转世', titleColor: '#CA8A04', minXP: 191350 },
  { level: 88, title: '不灭守护', titleColor: '#CA8A04', minXP: 195750 },
  { level: 89, title: '猎神降临', titleColor: '#CA8A04', minXP: 200200 },
  { level: 90, title: '狼神后裔', titleColor: '#A3E635', minXP: 204700 },
  { level: 91, title: '村庄之光', titleColor: '#A3E635', minXP: 209250 },
  { level: 92, title: '无双战神', titleColor: '#A3E635', minXP: 213850 },
  { level: 93, title: '天眼通明', titleColor: '#A3E635', minXP: 218500 },
  { level: 94, title: '暗界霸主', titleColor: '#A3E635', minXP: 223200 },
  { level: 95, title: '月神化身', titleColor: '#22D3EE', minXP: 227950 },
  { level: 96, title: '万古先知', titleColor: '#22D3EE', minXP: 232750 },
  { level: 97, title: '药神重生', titleColor: '#22D3EE', minXP: 237600 },
  { level: 98, title: '永恒守护', titleColor: '#22D3EE', minXP: 242500 },
  { level: 99, title: '狩猎之神', titleColor: '#22D3EE', minXP: 247450 },
  { level: 100, title: '狼人杀传说', titleColor: '#FFD700', minXP: 252450 },
];

/** 经验值奖励配置 */
export const XP_REWARDS = {
  // 基础奖励
  GAME_COMPLETED: 20,       // 完成一局游戏
  GAME_WON: 50,             // 获胜
  GAME_LOST: 10,            // 失败

  // 存活奖励
  SURVIVED: 15,             // 活到游戏结束

  // 特殊角色奖励
  SHERIFF_ELECTED: 10,      // 当选警长
  SHERIFF_WIN: 20,          // 作为警长获胜

  // 技能使用奖励
  SEER_CORRECT: 15,         // 预言家正确查验狼人
  WITCH_SAVE: 20,           // 女巫成功救人
  WITCH_POISON_WOLF: 25,    // 女巫毒死狼人
  GUARD_SAVE: 20,           // 守卫成功守护
  HUNTER_KILL_WOLF: 30,     // 猎人带走狼人

  // 连胜奖励
  WIN_STREAK_3: 20,         // 3连胜额外奖励
  WIN_STREAK_5: 40,         // 5连胜额外奖励
  WIN_STREAK_10: 80,        // 10连胜额外奖励

  // 首胜奖励
  FIRST_WIN_OF_DAY: 30,     // 每日首胜
};

/** 用户统计数据 */
export interface UserStats {
  userId: string;           // 用户 ID
  totalGames: number;       // 总场次
  wins: number;             // 胜利场次
  losses: number;           // 失败场次
  winRate: number;          // 胜率（0-100）

  // 等级系统
  level: number;            // 当前等级
  currentXP: number;        // 当前经验值（相对于当前等级）
  totalXP: number;          // 累计总经验值
  winStreak: number;        // 当前连胜
  maxWinStreak: number;     // 最高连胜
  lastWinDate: string;      // 最后获胜日期（用于首胜判断）

  // 阵营统计
  villagerWins: number;     // 好人阵营胜利
  villagerGames: number;    // 好人阵营场次
  werewolfWins: number;     // 狼人阵营胜利
  werewolfGames: number;    // 狼人阵营场次
  loversWins: number;       // 情侣胜利
  loversGames: number;      // 情侣场次

  // 角色统计
  roleStats: Record<string, RoleStats>;

  // 其他统计
  survivalRate: number;     // 存活率（游戏结束时存活的比例）
  gamesAsSheriff: number;   // 当选警长次数
  sheriffWins: number;      // 作为警长时的胜利次数

  // 时间戳
  firstGameAt: number;      // 首次游戏时间
  lastGameAt: number;       // 最后游戏时间
}

/** 创建初始用户统计 */
export function createInitialUserStats(userId: string): UserStats {
  return {
    userId,
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    level: 1,
    currentXP: 0,
    totalXP: 0,
    winStreak: 0,
    maxWinStreak: 0,
    lastWinDate: '',
    villagerWins: 0,
    villagerGames: 0,
    werewolfWins: 0,
    werewolfGames: 0,
    loversWins: 0,
    loversGames: 0,
    roleStats: {},
    survivalRate: 0,
    gamesAsSheriff: 0,
    sheriffWins: 0,
    firstGameAt: 0,
    lastGameAt: 0,
  };
}

/** 根据累计经验值计算等级信息 */
export function calculateLevelInfo(totalXP: number): LevelInfo {
  // 找到当前等级
  let currentLevel = LEVEL_CONFIGS[0];
  let nextLevel: LevelConfig | null = null;

  for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
    if (totalXP >= LEVEL_CONFIGS[i].minXP) {
      currentLevel = LEVEL_CONFIGS[i];
      nextLevel = i < LEVEL_CONFIGS.length - 1 ? LEVEL_CONFIGS[i + 1] : null;
    } else {
      break;
    }
  }

  // 计算当前等级内的经验值和进度
  const currentLevelXP = totalXP - currentLevel.minXP;
  const requiredXP = nextLevel ? nextLevel.minXP - currentLevel.minXP : 0;
  const progress = requiredXP > 0 ? Math.floor((currentLevelXP / requiredXP) * 100) : 100;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    titleColor: currentLevel.titleColor,
    currentXP: currentLevelXP,
    requiredXP,
    totalXP,
    progress,
  };
}

/** 计算游戏结束后获得的经验值 */
export function calculateGameXP(params: {
  won: boolean;
  survived: boolean;
  wasSheriff: boolean;
  sheriffWon: boolean;
  currentWinStreak: number;
  isFirstWinOfDay: boolean;
}): number {
  let xp = XP_REWARDS.GAME_COMPLETED;

  if (params.won) {
    xp += XP_REWARDS.GAME_WON;
  } else {
    xp += XP_REWARDS.GAME_LOST;
  }

  if (params.survived) {
    xp += XP_REWARDS.SURVIVED;
  }

  if (params.wasSheriff) {
    xp += XP_REWARDS.SHERIFF_ELECTED;
    if (params.sheriffWon) {
      xp += XP_REWARDS.SHERIFF_WIN;
    }
  }

  // 连胜奖励
  if (params.won && params.currentWinStreak >= 10) {
    xp += XP_REWARDS.WIN_STREAK_10;
  } else if (params.won && params.currentWinStreak >= 5) {
    xp += XP_REWARDS.WIN_STREAK_5;
  } else if (params.won && params.currentWinStreak >= 3) {
    xp += XP_REWARDS.WIN_STREAK_3;
  }

  // 首胜奖励
  if (params.won && params.isFirstWinOfDay) {
    xp += XP_REWARDS.FIRST_WIN_OF_DAY;
  }

  return xp;
}

// ============================================================================
// 辅助函数类型
// ============================================================================

/** 判断角色是否属于狼人阵营 */
export function isWerewolf(role: Role): boolean {
  return role === Role.WEREWOLF || role === Role.ALPHA_WOLF;
}

/** 判断角色是否是神职 */
export function isSpecialRole(role: Role): boolean {
  return role !== Role.VILLAGER && !isWerewolf(role);
}

/** 获取角色信息 */
export function getRoleInfo(role: Role): RoleInfo {
  return ROLE_CONFIG[role];
}

/** 获取角色阵营 */
export function getRoleFaction(role: Role): Faction {
  return ROLE_CONFIG[role].faction;
}

// ============================================================================
// 好友邀请系统 (Friend Invite System)
// ============================================================================

/** 邀请状态 */
export enum InviteStatus {
  PENDING = 'pending',       // 等待响应
  ACCEPTED = 'accepted',     // 已接受
  DECLINED = 'declined',     // 已拒绝
  EXPIRED = 'expired',       // 已过期
  CANCELLED = 'cancelled',   // 已取消
}

/** 邀请数据 */
export interface GameInvite {
  inviteId: string;           // 邀请唯一 ID
  matchId: string;            // 房间 ID
  roomName: string;           // 房间名称
  senderId: string;           // 发送者 ID
  senderName: string;         // 发送者名称
  receiverId: string;         // 接收者 ID
  receiverName: string;       // 接收者名称
  status: InviteStatus;       // 邀请状态
  currentPlayers: number;     // 房间当前人数
  maxPlayers: number;         // 房间最大人数
  createdAt: number;          // 创建时间戳
  expiresAt: number;          // 过期时间戳
  password?: string;          // 私密房间密码（仅发送给被邀请者）
}

/** 创建邀请请求 */
export interface CreateInviteRequest {
  matchId: string;            // 房间 ID
  receiverId?: string;        // 接收者 ID（按 ID 邀请）
  receiverName?: string;      // 接收者名称（按名称邀请）
}

/** 创建邀请响应 */
export interface CreateInviteResponse {
  success: boolean;
  inviteId?: string;
  error?: string;
}

/** 获取邀请列表响应 */
export interface GetInvitesResponse {
  success: boolean;
  invites: GameInvite[];
  error?: string;
}

/** 响应邀请请求 */
export interface RespondInviteRequest {
  inviteId: string;
  accept: boolean;            // true = 接受, false = 拒绝
}

/** 响应邀请响应 */
export interface RespondInviteResponse {
  success: boolean;
  matchId?: string;           // 接受时返回房间 ID
  password?: string;          // 接受时返回密码（如果有）
  error?: string;
}

/** 邀请配置 */
export const INVITE_CONFIG = {
  EXPIRE_TIME: 5 * 60 * 1000,  // 邀请有效期 5 分钟
  MAX_PENDING: 10,             // 每人最多待处理邀请数
  STORAGE_COLLECTION: 'werewolf_invites',
  STORAGE_KEY_SENT: 'sent_invites',
  STORAGE_KEY_RECEIVED: 'received_invites',
};

// ============================================================================
// 成就系统 (Achievement System)
// ============================================================================

/** 成就 ID 枚举 */
export enum AchievementId {
  // 新手成就 (入门级)
  FIRST_GAME = 'first_game',                   // 首次参加游戏
  FIRST_WIN = 'first_win',                     // 首次获胜
  FIRST_WOLF_WIN = 'first_wolf_win',           // 首次作为狼人获胜
  FIRST_VILLAGER_WIN = 'first_villager_win',   // 首次作为好人获胜

  // 场次成就 (进阶级)
  GAMES_10 = 'games_10',                       // 参与 10 场游戏
  GAMES_50 = 'games_50',                       // 参与 50 场游戏
  GAMES_100 = 'games_100',                     // 参与 100 场游戏
  GAMES_500 = 'games_500',                     // 参与 500 场游戏
  GAMES_1000 = 'games_1000',                   // 参与 1000 场游戏

  // 胜利成就
  WINS_10 = 'wins_10',                         // 获胜 10 场
  WINS_50 = 'wins_50',                         // 获胜 50 场
  WINS_100 = 'wins_100',                       // 获胜 100 场
  WINS_500 = 'wins_500',                       // 获胜 500 场

  // 连胜成就
  WIN_STREAK_3 = 'win_streak_3',               // 3 连胜
  WIN_STREAK_5 = 'win_streak_5',               // 5 连胜
  WIN_STREAK_10 = 'win_streak_10',             // 10 连胜
  WIN_STREAK_20 = 'win_streak_20',             // 20 连胜

  // 角色大师成就
  VILLAGER_MASTER = 'villager_master',         // 村民大师（胜利 20 场）
  SEER_MASTER = 'seer_master',                 // 预言家大师（胜利 20 场）
  WITCH_MASTER = 'witch_master',               // 女巫大师（胜利 20 场）
  HUNTER_MASTER = 'hunter_master',             // 猎人大师（胜利 20 场）
  GUARD_MASTER = 'guard_master',               // 守卫大师（胜利 20 场）
  IDIOT_MASTER = 'idiot_master',               // 白痴大师（胜利 20 场）
  WEREWOLF_MASTER = 'werewolf_master',         // 狼人大师（胜利 30 场）
  ALPHA_WOLF_MASTER = 'alpha_wolf_master',     // 狼王大师（胜利 20 场）
  CUPID_MASTER = 'cupid_master',               // 丘比特大师（胜利 15 场）

  // 技能成就
  SEER_CORRECT_10 = 'seer_correct_10',         // 预言家正确查验 10 次
  SEER_CORRECT_50 = 'seer_correct_50',         // 预言家正确查验 50 次
  WITCH_SAVE_10 = 'witch_save_10',             // 女巫成功救人 10 次
  WITCH_POISON_WOLF_10 = 'witch_poison_wolf_10', // 女巫毒死狼人 10 次
  GUARD_SAVE_10 = 'guard_save_10',             // 守卫成功守护 10 次
  HUNTER_KILL_WOLF_10 = 'hunter_kill_wolf_10', // 猎人带走狼人 10 次

  // 警长成就
  SHERIFF_ELECTED_10 = 'sheriff_elected_10',   // 当选警长 10 次
  SHERIFF_WIN_10 = 'sheriff_win_10',           // 作为警长获胜 10 次

  // 特殊成就
  PERFECT_SEER = 'perfect_seer',               // 完美预言家（单局查验全对）
  DOUBLE_KILL_WITCH = 'double_kill_witch',     // 女巫双杀（同一局用解药和毒药）
  LAST_STAND = 'last_stand',                   // 孤胆英雄（作为最后一个好人获胜）
  WOLF_EXTERMINATOR = 'wolf_exterminator',     // 屠狼手（单局投票出 2+ 狼人）
  SILENT_KILLER = 'silent_killer',             // 沉默杀手（狼人单局零暴露获胜）
  LOVER_VICTORY = 'lover_victory',             // 情侣胜利
  IDIOT_REVEAL = 'idiot_reveal',               // 白痴翻牌存活
  COMEBACK_KING = 'comeback_king',             // 逆转王（己方仅剩1人时逆转获胜）

  // 存活成就
  SURVIVOR_10 = 'survivor_10',                 // 存活至游戏结束 10 次
  SURVIVOR_50 = 'survivor_50',                 // 存活至游戏结束 50 次
  PERFECT_SURVIVAL = 'perfect_survival',       // 连续 5 场存活

  // 等级成就
  LEVEL_10 = 'level_10',                       // 达到 10 级
  LEVEL_25 = 'level_25',                       // 达到 25 级
  LEVEL_50 = 'level_50',                       // 达到 50 级
  LEVEL_75 = 'level_75',                       // 达到 75 级
  LEVEL_100 = 'level_100',                     // 达到 100 级

  // 社交成就
  INVITE_FRIEND = 'invite_friend',             // 邀请好友
  INVITE_FRIEND_10 = 'invite_friend_10',       // 邀请好友 10 次
}

/** 成就类别 */
export enum AchievementCategory {
  BEGINNER = 'beginner',           // 新手成就
  GAMES = 'games',                 // 场次成就
  WINS = 'wins',                   // 胜利成就
  STREAK = 'streak',               // 连胜成就
  ROLE_MASTER = 'role_master',     // 角色大师
  SKILL = 'skill',                 // 技能成就
  SHERIFF = 'sheriff',             // 警长成就
  SPECIAL = 'special',             // 特殊成就
  SURVIVAL = 'survival',           // 存活成就
  LEVEL = 'level',                 // 等级成就
  SOCIAL = 'social',               // 社交成就
}

/** 成就稀有度 */
export enum AchievementRarity {
  COMMON = 'common',               // 普通（灰色）
  UNCOMMON = 'uncommon',           // 优秀（绿色）
  RARE = 'rare',                   // 稀有（蓝色）
  EPIC = 'epic',                   // 史诗（紫色）
  LEGENDARY = 'legendary',         // 传说（金色）
}

/** 成就定义 */
export interface AchievementDefinition {
  id: AchievementId;
  name: string;                    // 成就名称
  description: string;             // 成就描述
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;                    // 图标（emoji）
  xpReward: number;                // 经验值奖励
  requirement: number;             // 完成需求（次数/级别等）
  hidden?: boolean;                // 是否隐藏成就（未解锁前不显示）
}

/** 用户成就进度 */
export interface AchievementProgress {
  achievementId: AchievementId;
  current: number;                 // 当前进度
  required: number;                // 需要的进度
  completed: boolean;              // 是否已完成
  unlockedAt?: number;             // 解锁时间戳
}

/** 用户成就数据 */
export interface UserAchievements {
  userId: string;
  achievements: Record<string, AchievementProgress>;
  totalUnlocked: number;           // 已解锁数量
  totalXPFromAchievements: number; // 从成就获得的总经验值
  lastUpdated: number;             // 最后更新时间
}

/** 成就解锁通知 */
export interface AchievementUnlock {
  achievement: AchievementDefinition;
  progress: AchievementProgress;
  xpEarned: number;
}

/** 成就定义配置 */
export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, AchievementDefinition> = {
  // 新手成就
  [AchievementId.FIRST_GAME]: {
    id: AchievementId.FIRST_GAME,
    name: '初出茅庐',
    description: '完成第一场游戏',
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
    icon: '🎮',
    xpReward: 50,
    requirement: 1,
  },
  [AchievementId.FIRST_WIN]: {
    id: AchievementId.FIRST_WIN,
    name: '初尝胜果',
    description: '获得第一场胜利',
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
    icon: '🏆',
    xpReward: 100,
    requirement: 1,
  },
  [AchievementId.FIRST_WOLF_WIN]: {
    id: AchievementId.FIRST_WOLF_WIN,
    name: '狼群崛起',
    description: '首次作为狼人阵营获胜',
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
    icon: '🐺',
    xpReward: 100,
    requirement: 1,
  },
  [AchievementId.FIRST_VILLAGER_WIN]: {
    id: AchievementId.FIRST_VILLAGER_WIN,
    name: '村庄卫士',
    description: '首次作为好人阵营获胜',
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
    icon: '🏠',
    xpReward: 100,
    requirement: 1,
  },

  // 场次成就
  [AchievementId.GAMES_10]: {
    id: AchievementId.GAMES_10,
    name: '小试牛刀',
    description: '参与 10 场游戏',
    category: AchievementCategory.GAMES,
    rarity: AchievementRarity.COMMON,
    icon: '🎯',
    xpReward: 100,
    requirement: 10,
  },
  [AchievementId.GAMES_50]: {
    id: AchievementId.GAMES_50,
    name: '游戏达人',
    description: '参与 50 场游戏',
    category: AchievementCategory.GAMES,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🎪',
    xpReward: 300,
    requirement: 50,
  },
  [AchievementId.GAMES_100]: {
    id: AchievementId.GAMES_100,
    name: '百战老将',
    description: '参与 100 场游戏',
    category: AchievementCategory.GAMES,
    rarity: AchievementRarity.RARE,
    icon: '⭐',
    xpReward: 500,
    requirement: 100,
  },
  [AchievementId.GAMES_500]: {
    id: AchievementId.GAMES_500,
    name: '狼人杀专家',
    description: '参与 500 场游戏',
    category: AchievementCategory.GAMES,
    rarity: AchievementRarity.EPIC,
    icon: '💎',
    xpReward: 1000,
    requirement: 500,
  },
  [AchievementId.GAMES_1000]: {
    id: AchievementId.GAMES_1000,
    name: '千场传说',
    description: '参与 1000 场游戏',
    category: AchievementCategory.GAMES,
    rarity: AchievementRarity.LEGENDARY,
    icon: '👑',
    xpReward: 2000,
    requirement: 1000,
  },

  // 胜利成就
  [AchievementId.WINS_10]: {
    id: AchievementId.WINS_10,
    name: '初露锋芒',
    description: '获胜 10 场',
    category: AchievementCategory.WINS,
    rarity: AchievementRarity.COMMON,
    icon: '🎖️',
    xpReward: 150,
    requirement: 10,
  },
  [AchievementId.WINS_50]: {
    id: AchievementId.WINS_50,
    name: '战无不胜',
    description: '获胜 50 场',
    category: AchievementCategory.WINS,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🏅',
    xpReward: 400,
    requirement: 50,
  },
  [AchievementId.WINS_100]: {
    id: AchievementId.WINS_100,
    name: '百胜将军',
    description: '获胜 100 场',
    category: AchievementCategory.WINS,
    rarity: AchievementRarity.RARE,
    icon: '🎗️',
    xpReward: 800,
    requirement: 100,
  },
  [AchievementId.WINS_500]: {
    id: AchievementId.WINS_500,
    name: '不败神话',
    description: '获胜 500 场',
    category: AchievementCategory.WINS,
    rarity: AchievementRarity.LEGENDARY,
    icon: '🌟',
    xpReward: 2000,
    requirement: 500,
  },

  // 连胜成就
  [AchievementId.WIN_STREAK_3]: {
    id: AchievementId.WIN_STREAK_3,
    name: '三连胜',
    description: '达成 3 连胜',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.COMMON,
    icon: '🔥',
    xpReward: 100,
    requirement: 3,
  },
  [AchievementId.WIN_STREAK_5]: {
    id: AchievementId.WIN_STREAK_5,
    name: '五连胜',
    description: '达成 5 连胜',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🔥🔥',
    xpReward: 200,
    requirement: 5,
  },
  [AchievementId.WIN_STREAK_10]: {
    id: AchievementId.WIN_STREAK_10,
    name: '十连胜',
    description: '达成 10 连胜',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.RARE,
    icon: '💫',
    xpReward: 500,
    requirement: 10,
  },
  [AchievementId.WIN_STREAK_20]: {
    id: AchievementId.WIN_STREAK_20,
    name: '二十连胜',
    description: '达成 20 连胜',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.LEGENDARY,
    icon: '🌈',
    xpReward: 1500,
    requirement: 20,
  },

  // 角色大师成就
  [AchievementId.VILLAGER_MASTER]: {
    id: AchievementId.VILLAGER_MASTER,
    name: '村民领袖',
    description: '作为村民获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '👨‍🌾',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.SEER_MASTER]: {
    id: AchievementId.SEER_MASTER,
    name: '真理使者',
    description: '作为预言家获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '🔮',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.WITCH_MASTER]: {
    id: AchievementId.WITCH_MASTER,
    name: '药剂大师',
    description: '作为女巫获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '🧪',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.HUNTER_MASTER]: {
    id: AchievementId.HUNTER_MASTER,
    name: '神枪手',
    description: '作为猎人获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '🔫',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.GUARD_MASTER]: {
    id: AchievementId.GUARD_MASTER,
    name: '铜墙铁壁',
    description: '作为守卫获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '🛡️',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.IDIOT_MASTER]: {
    id: AchievementId.IDIOT_MASTER,
    name: '大智若愚',
    description: '作为白痴获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '🤪',
    xpReward: 500,
    requirement: 20,
  },
  [AchievementId.WEREWOLF_MASTER]: {
    id: AchievementId.WEREWOLF_MASTER,
    name: '狼族之王',
    description: '作为狼人获胜 30 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.EPIC,
    icon: '🐺',
    xpReward: 800,
    requirement: 30,
  },
  [AchievementId.ALPHA_WOLF_MASTER]: {
    id: AchievementId.ALPHA_WOLF_MASTER,
    name: '狼王霸主',
    description: '作为狼王获胜 20 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.EPIC,
    icon: '👿',
    xpReward: 600,
    requirement: 20,
  },
  [AchievementId.CUPID_MASTER]: {
    id: AchievementId.CUPID_MASTER,
    name: '月老再世',
    description: '作为丘比特获胜 15 场',
    category: AchievementCategory.ROLE_MASTER,
    rarity: AchievementRarity.RARE,
    icon: '💘',
    xpReward: 400,
    requirement: 15,
  },

  // 技能成就
  [AchievementId.SEER_CORRECT_10]: {
    id: AchievementId.SEER_CORRECT_10,
    name: '洞察之眼',
    description: '作为预言家正确查验狼人 10 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.UNCOMMON,
    icon: '👁️',
    xpReward: 200,
    requirement: 10,
  },
  [AchievementId.SEER_CORRECT_50]: {
    id: AchievementId.SEER_CORRECT_50,
    name: '全知之眼',
    description: '作为预言家正确查验狼人 50 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.EPIC,
    icon: '👁️‍🗨️',
    xpReward: 600,
    requirement: 50,
  },
  [AchievementId.WITCH_SAVE_10]: {
    id: AchievementId.WITCH_SAVE_10,
    name: '起死回生',
    description: '作为女巫成功救人 10 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.UNCOMMON,
    icon: '💊',
    xpReward: 200,
    requirement: 10,
  },
  [AchievementId.WITCH_POISON_WOLF_10]: {
    id: AchievementId.WITCH_POISON_WOLF_10,
    name: '以毒攻毒',
    description: '作为女巫毒死狼人 10 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.RARE,
    icon: '☠️',
    xpReward: 300,
    requirement: 10,
  },
  [AchievementId.GUARD_SAVE_10]: {
    id: AchievementId.GUARD_SAVE_10,
    name: '守护之盾',
    description: '作为守卫成功守护 10 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🛡️',
    xpReward: 200,
    requirement: 10,
  },
  [AchievementId.HUNTER_KILL_WOLF_10]: {
    id: AchievementId.HUNTER_KILL_WOLF_10,
    name: '百发百中',
    description: '作为猎人带走狼人 10 次',
    category: AchievementCategory.SKILL,
    rarity: AchievementRarity.RARE,
    icon: '🎯',
    xpReward: 300,
    requirement: 10,
  },

  // 警长成就
  [AchievementId.SHERIFF_ELECTED_10]: {
    id: AchievementId.SHERIFF_ELECTED_10,
    name: '众望所归',
    description: '当选警长 10 次',
    category: AchievementCategory.SHERIFF,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🎖️',
    xpReward: 200,
    requirement: 10,
  },
  [AchievementId.SHERIFF_WIN_10]: {
    id: AchievementId.SHERIFF_WIN_10,
    name: '警长荣耀',
    description: '作为警长获胜 10 次',
    category: AchievementCategory.SHERIFF,
    rarity: AchievementRarity.RARE,
    icon: '⚔️',
    xpReward: 300,
    requirement: 10,
  },

  // 特殊成就
  [AchievementId.PERFECT_SEER]: {
    id: AchievementId.PERFECT_SEER,
    name: '完美预言',
    description: '单局游戏中预言家查验全部正确',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.EPIC,
    icon: '🌙',
    xpReward: 500,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.DOUBLE_KILL_WITCH]: {
    id: AchievementId.DOUBLE_KILL_WITCH,
    name: '生死一念',
    description: '单局游戏中女巫同时使用解药和毒药',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: '⚗️',
    xpReward: 300,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.LAST_STAND]: {
    id: AchievementId.LAST_STAND,
    name: '孤胆英雄',
    description: '作为最后一个好人时逆转获胜',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.LEGENDARY,
    icon: '🦸',
    xpReward: 1000,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.WOLF_EXTERMINATOR]: {
    id: AchievementId.WOLF_EXTERMINATOR,
    name: '屠狼高手',
    description: '单局游戏中成功投票出 2 个以上狼人',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: '⚡',
    xpReward: 300,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.SILENT_KILLER]: {
    id: AchievementId.SILENT_KILLER,
    name: '沉默杀手',
    description: '作为狼人全程零暴露获胜',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.EPIC,
    icon: '🤫',
    xpReward: 500,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.LOVER_VICTORY]: {
    id: AchievementId.LOVER_VICTORY,
    name: '永恒爱情',
    description: '作为情侣获胜',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: '💕',
    xpReward: 300,
    requirement: 1,
  },
  [AchievementId.IDIOT_REVEAL]: {
    id: AchievementId.IDIOT_REVEAL,
    name: '大智若愚',
    description: '作为白痴翻牌后存活到游戏结束',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    icon: '🃏',
    xpReward: 300,
    requirement: 1,
    hidden: true,
  },
  [AchievementId.COMEBACK_KING]: {
    id: AchievementId.COMEBACK_KING,
    name: '逆转之王',
    description: '己方仅剩 1 人时成功逆转获胜',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.LEGENDARY,
    icon: '♔',
    xpReward: 1000,
    requirement: 1,
    hidden: true,
  },

  // 存活成就
  [AchievementId.SURVIVOR_10]: {
    id: AchievementId.SURVIVOR_10,
    name: '苟活者',
    description: '存活至游戏结束 10 次',
    category: AchievementCategory.SURVIVAL,
    rarity: AchievementRarity.COMMON,
    icon: '💪',
    xpReward: 150,
    requirement: 10,
  },
  [AchievementId.SURVIVOR_50]: {
    id: AchievementId.SURVIVOR_50,
    name: '生存大师',
    description: '存活至游戏结束 50 次',
    category: AchievementCategory.SURVIVAL,
    rarity: AchievementRarity.RARE,
    icon: '🏃',
    xpReward: 400,
    requirement: 50,
  },
  [AchievementId.PERFECT_SURVIVAL]: {
    id: AchievementId.PERFECT_SURVIVAL,
    name: '不死之身',
    description: '连续 5 场游戏存活至结束',
    category: AchievementCategory.SURVIVAL,
    rarity: AchievementRarity.EPIC,
    icon: '🧬',
    xpReward: 500,
    requirement: 5,
    hidden: true,
  },

  // 等级成就
  [AchievementId.LEVEL_10]: {
    id: AchievementId.LEVEL_10,
    name: '月下旅人',
    description: '达到 10 级',
    category: AchievementCategory.LEVEL,
    rarity: AchievementRarity.COMMON,
    icon: '🌒',
    xpReward: 100,
    requirement: 10,
  },
  [AchievementId.LEVEL_25]: {
    id: AchievementId.LEVEL_25,
    name: '月夜行者',
    description: '达到 25 级',
    category: AchievementCategory.LEVEL,
    rarity: AchievementRarity.UNCOMMON,
    icon: '🌓',
    xpReward: 250,
    requirement: 25,
  },
  [AchievementId.LEVEL_50]: {
    id: AchievementId.LEVEL_50,
    name: '狼人王者',
    description: '达到 50 级',
    category: AchievementCategory.LEVEL,
    rarity: AchievementRarity.RARE,
    icon: '🌔',
    xpReward: 500,
    requirement: 50,
  },
  [AchievementId.LEVEL_75]: {
    id: AchievementId.LEVEL_75,
    name: '月光审判',
    description: '达到 75 级',
    category: AchievementCategory.LEVEL,
    rarity: AchievementRarity.EPIC,
    icon: '🌕',
    xpReward: 750,
    requirement: 75,
  },
  [AchievementId.LEVEL_100]: {
    id: AchievementId.LEVEL_100,
    name: '狼人杀传说',
    description: '达到 100 级',
    category: AchievementCategory.LEVEL,
    rarity: AchievementRarity.LEGENDARY,
    icon: '🌝',
    xpReward: 1500,
    requirement: 100,
  },

  // 社交成就
  [AchievementId.INVITE_FRIEND]: {
    id: AchievementId.INVITE_FRIEND,
    name: '广交朋友',
    description: '邀请一位好友进入游戏',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.COMMON,
    icon: '🤝',
    xpReward: 50,
    requirement: 1,
  },
  [AchievementId.INVITE_FRIEND_10]: {
    id: AchievementId.INVITE_FRIEND_10,
    name: '社交达人',
    description: '邀请 10 位好友进入游戏',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.RARE,
    icon: '🎉',
    xpReward: 300,
    requirement: 10,
  },
};

/** 成就存储配置 */
export const ACHIEVEMENT_CONFIG = {
  STORAGE_COLLECTION: 'werewolf_achievements',
  STORAGE_KEY: 'user_achievements',
};

/** 创建初始用户成就数据 */
export function createInitialUserAchievements(userId: string): UserAchievements {
  const achievements: Record<string, AchievementProgress> = {};

  // 为每个成就创建初始进度
  for (const id of Object.values(AchievementId)) {
    const def = ACHIEVEMENT_DEFINITIONS[id];
    achievements[id] = {
      achievementId: id,
      current: 0,
      required: def.requirement,
      completed: false,
    };
  }

  return {
    userId,
    achievements,
    totalUnlocked: 0,
    totalXPFromAchievements: 0,
    lastUpdated: Date.now(),
  };
}

/** 检查成就是否可以解锁 */
export function checkAchievementUnlock(
  progress: AchievementProgress,
  currentValue: number
): { unlocked: boolean; progress: AchievementProgress } {
  const newProgress = { ...progress, current: currentValue };

  if (!progress.completed && currentValue >= progress.required) {
    newProgress.completed = true;
    newProgress.unlockedAt = Date.now();
    return { unlocked: true, progress: newProgress };
  }

  return { unlocked: false, progress: newProgress };
}

/** 获取成就类别名称 */
export function getAchievementCategoryName(category: AchievementCategory): string {
  const names: Record<AchievementCategory, string> = {
    [AchievementCategory.BEGINNER]: '新手成就',
    [AchievementCategory.GAMES]: '场次成就',
    [AchievementCategory.WINS]: '胜利成就',
    [AchievementCategory.STREAK]: '连胜成就',
    [AchievementCategory.ROLE_MASTER]: '角色大师',
    [AchievementCategory.SKILL]: '技能成就',
    [AchievementCategory.SHERIFF]: '警长成就',
    [AchievementCategory.SPECIAL]: '特殊成就',
    [AchievementCategory.SURVIVAL]: '存活成就',
    [AchievementCategory.LEVEL]: '等级成就',
    [AchievementCategory.SOCIAL]: '社交成就',
  };
  return names[category];
}

/** 获取稀有度颜色 */
export function getAchievementRarityColor(rarity: AchievementRarity): string {
  const colors: Record<AchievementRarity, string> = {
    [AchievementRarity.COMMON]: '#9CA3AF',     // 灰色
    [AchievementRarity.UNCOMMON]: '#22C55E',   // 绿色
    [AchievementRarity.RARE]: '#3B82F6',       // 蓝色
    [AchievementRarity.EPIC]: '#A855F7',       // 紫色
    [AchievementRarity.LEGENDARY]: '#F59E0B',  // 金色
  };
  return colors[rarity];
}

/** 获取稀有度名称 */
export function getAchievementRarityName(rarity: AchievementRarity): string {
  const names: Record<AchievementRarity, string> = {
    [AchievementRarity.COMMON]: '普通',
    [AchievementRarity.UNCOMMON]: '优秀',
    [AchievementRarity.RARE]: '稀有',
    [AchievementRarity.EPIC]: '史诗',
    [AchievementRarity.LEGENDARY]: '传说',
  };
  return names[rarity];
}
