/**
 * 狼人杀前端类型定义
 * 与后端 nakama/src/werewolf/types.ts 保持一致
 */

// 角色枚举
export enum Role {
  VILLAGER = 'villager',      // 村民
  WEREWOLF = 'werewolf',      // 狼人
  SEER = 'seer',              // 预言家
  WITCH = 'witch',            // 女巫
  HUNTER = 'hunter',          // 猎人
  GUARD = 'guard',            // 守卫
  IDIOT = 'idiot',            // 白痴
  ALPHA_WOLF = 'alpha_wolf',  // 狼王
  CUPID = 'cupid',            // 丘比特
  LOVER = 'lover',            // 情侣（标记）
}

// 阵营
export enum Faction {
  VILLAGER = 'villager',   // 好人阵营
  WEREWOLF = 'werewolf',   // 狼人阵营
  NEUTRAL = 'neutral',     // 中立阵营
  LOVERS = 'lovers',       // 情侣阵营（特殊胜利条件）
}

// 游戏阶段
export enum GamePhase {
  WAITING = 'waiting',           // 等待玩家
  STARTING = 'starting',         // 游戏开始，分配角色
  NIGHT = 'night',               // 夜晚
  NIGHT_CUPID = 'night_cupid',         // 丘比特行动（首夜）
  NIGHT_WEREWOLF = 'night_werewolf',   // 狼人行动
  NIGHT_SEER = 'night_seer',           // 预言家行动
  NIGHT_WITCH = 'night_witch',         // 女巫行动
  NIGHT_GUARD = 'night_guard',         // 守卫行动
  DAY_ANNOUNCE = 'day_announce', // 公布夜晚结果
  SHERIFF_CAMPAIGN = 'sheriff_campaign',     // 警长竞选报名阶段
  SHERIFF_SPEECH = 'sheriff_speech',         // 警长竞选发言阶段
  SHERIFF_VOTING = 'sheriff_voting',         // 警长投票阶段
  SHERIFF_TRANSFER = 'sheriff_transfer',     // 警徽移交阶段
  DAY_DISCUSSION = 'day_discussion',   // 白天讨论
  DAY_VOTING = 'day_voting',     // 投票阶段
  DAY_EXECUTION = 'day_execution',     // 处决阶段
  LAST_WORDS = 'last_words',     // 遗言阶段
  DEATH_SKILL = 'death_skill',   // 死亡技能阶段（猎人/狼王开枪）
  GAME_OVER = 'game_over',       // 游戏结束
}

// 夜晚子阶段
export enum NightSubPhase {
  CUPID = 'cupid',       // 丘比特行动（首夜）
  WEREWOLF = 'werewolf', // 狼人行动
  GUARD = 'guard',       // 守卫行动
  SEER = 'seer',         // 预言家行动
  WITCH = 'witch',       // 女巫行动
  COMPLETE = 'complete', // 夜晚结束
}

// 玩家状态
export enum PlayerStatus {
  ALIVE = 'alive',
  DEAD = 'dead',
  DISCONNECTED = 'disconnected',
}

// 操作码（与服务器对应）
export enum OpCode {
  // 游戏状态
  GAME_STATE = 1,
  ROLE_ASSIGNED = 2,
  PHASE_CHANGE = 3,

  // 玩家操作
  PLAYER_ACTION = 10,
  VOTE = 11,
  USE_SKILL = 12,

  // 聊天
  CHAT_MESSAGE = 20,
  WOLF_CHAT = 21,
  DEAD_CHAT = 22,

  // 结果
  NIGHT_RESULT = 30,
  VOTE_RESULT = 31,
  GAME_OVER = 32,
  DEATH_SKILL_PROMPT = 35,  // 死亡技能提示（猎人/狼王请开枪）
  DEATH_SKILL_RESULT = 36,  // 死亡技能结果（开枪结果）
  IDIOT_REVEALED = 37,      // 白痴翻牌（投票出局时翻牌免死）
  CUPID_LINK = 38,          // 丘比特连线（情侣确认）
  LOVER_DEATH = 39,         // 情侣殉情（一方死亡另一方随死）

  // 系统
  PLAYER_READY = 40,
  PLAYER_DISCONNECTED = 41,
  PLAYER_RECONNECTED = 42,

  // 警长系统
  SHERIFF_CAMPAIGN_START = 50,   // 警长竞选开始
  SHERIFF_CAMPAIGN_JOIN = 51,    // 参与竞选
  SHERIFF_CAMPAIGN_QUIT = 52,    // 退出竞选
  SHERIFF_SPEECH_START = 53,     // 竞选发言开始
  SHERIFF_VOTE = 54,             // 警长投票
  SHERIFF_ELECTED = 55,          // 警长当选
  SHERIFF_TRANSFER_START = 56,   // 警徽移交开始
  SHERIFF_TRANSFER_DONE = 57,    // 警徽移交完成
  SHERIFF_EXPLODE = 58,          // 警徽撕毁

  // 遗言系统
  LAST_WORDS_START = 60,         // 遗言阶段开始
  LAST_WORDS_SPEAK = 61,         // 遗言发言
  LAST_WORDS_END = 62,           // 遗言阶段结束
  LAST_WORDS_SKIP = 63,          // 放弃遗言

  // 观战系统
  SPECTATOR_JOIN = 70,           // 观战者加入
  SPECTATOR_LEAVE = 71,          // 观战者离开
  SPECTATOR_CHAT = 72,           // 观战者聊天
  SPECTATOR_FULL_STATE = 73,     // 完整游戏状态（观战者专用）

  // 好友邀请系统
  INVITE_SENT = 80,              // 邀请已发送
  INVITE_RECEIVED = 81,          // 收到邀请
  INVITE_ACCEPTED = 82,          // 邀请已接受
  INVITE_DECLINED = 83,          // 邀请已拒绝
  INVITE_EXPIRED = 84,           // 邀请已过期
  INVITE_CANCELLED = 85,         // 邀请已取消
}

// 玩家信息
export interface Player {
  id: string;
  name: string;
  seatNumber: number;
  role?: Role;           // 只有自己知道自己的角色
  faction?: Faction;
  status: PlayerStatus;
  isAlive: boolean;
  isReady: boolean;
  isSpeaking?: boolean;
  votedFor?: string;     // 投票目标的玩家ID
  idiotRevealed?: boolean; // 白痴是否已翻牌（翻牌后不能投票）
  isLover?: boolean;     // 是否是情侣
  loverId?: string;      // 情侣对象的玩家ID
  isSheriff?: boolean;   // 是否是警长
  isSheriffCandidate?: boolean; // 是否是警长候选人
  isSpectator?: boolean; // 是否是观战者
}

// 观战者信息
export interface Spectator {
  id: string;
  name: string;
  joinedAt: number;
}

// 观战者完整状态（包含所有角色信息）
export interface SpectatorFullState {
  isSpectator: true;
  phase: GamePhase;
  nightSubPhase: string | null;
  dayNumber: number;
  players: SpectatorPlayerView[];
  spectators: Spectator[];
  nightInfo: {
    wolfTarget: string | null;
    guardTarget: string | null;
    seerTarget: string | null;
    witchSaveTarget: string | null;
    witchPoisonTarget: string | null;
  };
  sheriffId: string | null;
  phaseStartTime: number;
  phaseEndTime: number;
  currentShooter: string | null;
  lastWordsSpeaker: string | null;
  votes: { voterId: string; targetId: string | null }[];
  loversLinked: boolean;
  loversFaction: boolean;
}

// 观战者视角的玩家信息（可以看到所有角色）
export interface SpectatorPlayerView extends Player {
  role: Role;  // 观战者可以看到所有角色
  faction: Faction;
  witchItems?: {
    hasAntidote: boolean;
    hasPoison: boolean;
  } | null;
}

// 情侣信息
export interface LoverInfo {
  loverId: string;
  loverName: string;
  loverSeatNumber: number;
  loverRole?: Role;
  crossFaction: boolean;  // 是否跨阵营情侣（可共同获胜）
}

// 警长竞选候选人
export interface SheriffCandidate {
  id: string;
  name: string;
  seatNumber: number;
}

// 警长竞选信息
export interface SheriffElectionInfo {
  candidates: SheriffCandidate[];
  currentSpeaker?: SheriffCandidate;
  speakerIndex: number;
  totalSpeakers: number;
  duration: number;
}

// 警长移交信息
export interface SheriffTransferInfo {
  sheriffId: string;
  sheriffName: string;
  eligiblePlayers: SheriffCandidate[];
  duration: number;
}

// 遗言信息
export interface LastWordsInfo {
  speakerId: string;
  speakerName: string;
  seatNumber: number;
  deathCause: 'vote' | 'wolf' | 'poison' | 'hunter' | 'alpha_wolf' | 'lover';
  duration: number;
  message?: string;
}

// 游戏状态
export interface GameState {
  matchId: string;
  phase: GamePhase;
  dayCount: number;
  currentTurn?: string;  // 当前轮到的玩家/角色
  timer?: number;        // 倒计时（秒）
  winner?: Faction;
}

// 夜晚结果
export interface NightResult {
  deaths: string[];      // 死亡玩家ID列表
  savedBy?: 'witch' | 'guard';  // 被谁救活
}

// 投票结果
export interface VoteResult {
  votes: Record<string, string[]>;  // 被投票者ID -> 投票者ID列表
  executed?: string;    // 被处决的玩家ID
  isTie: boolean;       // 是否平票
}

// 技能使用
export interface SkillAction {
  skill: 'kill' | 'check' | 'save' | 'poison' | 'protect' | 'shoot';
  targetId: string;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  seatNumber?: number;
  role?: Role;          // 死亡玩家聊天时显示角色
  content: string;
  timestamp: number;
  type: 'public' | 'wolf' | 'system' | 'dead' | 'spectator';  // spectator for spectator-only chat
  isSpectator?: boolean; // 是否是观战者发送的消息
}

// 角色信息（展示用）
export interface RoleInfo {
  role: Role;
  name: string;
  faction: Faction;
  description: string;
  abilities: string[];
}

// 角色详细信息
export const ROLE_INFO: Record<Role, RoleInfo> = {
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    name: '村民',
    faction: Faction.VILLAGER,
    description: '普通村民，没有特殊能力，但投票权同样重要',
    abilities: ['投票'],
  },
  [Role.WEREWOLF]: {
    role: Role.WEREWOLF,
    name: '狼人',
    faction: Faction.WEREWOLF,
    description: '每晚可以和同伴一起选择击杀一名玩家',
    abilities: ['夜晚击杀', '狼人密语'],
  },
  [Role.SEER]: {
    role: Role.SEER,
    name: '预言家',
    faction: Faction.VILLAGER,
    description: '每晚可以查验一名玩家的真实身份',
    abilities: ['查验身份'],
  },
  [Role.WITCH]: {
    role: Role.WITCH,
    name: '女巫',
    faction: Faction.VILLAGER,
    description: '拥有一瓶解药和一瓶毒药，各只能使用一次',
    abilities: ['解药救人', '毒药杀人'],
  },
  [Role.HUNTER]: {
    role: Role.HUNTER,
    name: '猎人',
    faction: Faction.VILLAGER,
    description: '死亡时可以开枪带走一名玩家',
    abilities: ['死亡开枪'],
  },
  [Role.GUARD]: {
    role: Role.GUARD,
    name: '守卫',
    faction: Faction.VILLAGER,
    description: '每晚可以守护一名玩家免受狼人袭击（不能连续守护同一人）',
    abilities: ['守护'],
  },
  [Role.IDIOT]: {
    role: Role.IDIOT,
    name: '白痴',
    faction: Faction.VILLAGER,
    description: '被投票处决时可以翻牌免死一次，但之后失去投票权',
    abilities: ['免死金牌'],
  },
  [Role.ALPHA_WOLF]: {
    role: Role.ALPHA_WOLF,
    name: '狼王',
    faction: Faction.WEREWOLF,
    description: '死亡时可以带走一名玩家',
    abilities: ['夜晚击杀', '狼人密语', '死亡反杀'],
  },
  [Role.CUPID]: {
    role: Role.CUPID,
    name: '丘比特',
    faction: Faction.NEUTRAL,
    description: '首夜可以将两名玩家连接为情侣',
    abilities: ['连接情侣'],
  },
  [Role.LOVER]: {
    role: Role.LOVER,
    name: '情侣',
    faction: Faction.NEUTRAL,
    description: '与另一名玩家心灵相连，一方死亡另一方也会殉情',
    abilities: ['殉情'],
  },
};

// 游戏配置
export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  roles: Role[];
  discussionTime: number;  // 讨论时间（秒）
  votingTime: number;      // 投票时间（秒）
}

// 房间设置（创建房间时使用）
export interface RoomSettings {
  roomName: string;
  maxPlayers: number;
  roles: Role[];
  password?: string;           // 房间密码（为空表示公开房间）
  discussionTime?: number;
  votingTime?: number;
  nightActionTime?: number;
  lastWordsTime?: number;
  allowSheriff?: boolean;
  allowLastWords?: boolean;
}

// 预设角色配置（与后端保持一致）
export const PRESET_ROLE_CONFIGS: Record<number, Role[]> = {
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
  10: [
    Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.WITCH,
    Role.GUARD,
    Role.HUNTER,
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

// 预设配置
export const GAME_CONFIGS: Record<number, { werewolves: number; roles: Role[] }> = {
  6: {
    werewolves: 2,
    roles: [Role.SEER, Role.HUNTER, Role.VILLAGER, Role.VILLAGER],
  },
  8: {
    werewolves: 2,
    roles: [Role.SEER, Role.WITCH, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
  },
  9: {
    werewolves: 3,
    roles: [Role.SEER, Role.WITCH, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
  },
  12: {
    werewolves: 4,
    roles: [Role.SEER, Role.WITCH, Role.GUARD, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
  },
};

// ============================================================================
// 用户统计 (User Statistics)
// ============================================================================

// 角色统计
export interface RoleStats {
  played: number;        // 扮演次数
  wins: number;          // 胜利次数
}

// 等级信息
export interface LevelInfo {
  level: number;           // 当前等级 (1-100)
  title: string;           // 等级称号
  titleColor: string;      // 称号颜色（CSS 颜色值）
  currentXP: number;       // 当前经验值
  requiredXP: number;      // 升级所需经验值
  totalXP: number;         // 累计总经验值
  progress: number;        // 升级进度 (0-100)
}

// 等级配置
export interface LevelConfig {
  level: number;
  title: string;
  titleColor: string;
  minXP: number;
}

// 等级称号配置（前端只需要部分关键等级用于显示）
export const LEVEL_TIERS = [
  { minLevel: 1, maxLevel: 10, tier: '新手', color: '#9CA3AF' },
  { minLevel: 11, maxLevel: 25, tier: '成长', color: '#60A5FA' },
  { minLevel: 26, maxLevel: 50, tier: '精英', color: '#FBBF24' },
  { minLevel: 51, maxLevel: 75, tier: '大师', color: '#7C3AED' },
  { minLevel: 76, maxLevel: 100, tier: '传奇', color: '#FFD700' },
];

// 获取等级段位
export function getLevelTier(level: number) {
  return LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) || LEVEL_TIERS[0];
}

// 经验值奖励配置（用于前端显示）
export const XP_REWARDS = {
  GAME_COMPLETED: 20,
  GAME_WON: 50,
  GAME_LOST: 10,
  SURVIVED: 15,
  SHERIFF_ELECTED: 10,
  SHERIFF_WIN: 20,
  WIN_STREAK_3: 20,
  WIN_STREAK_5: 40,
  WIN_STREAK_10: 80,
  FIRST_WIN_OF_DAY: 30,
};

// 用户统计数据
export interface UserStats {
  userId: string;         // 用户 ID
  totalGames: number;     // 总场次
  wins: number;           // 胜利场次
  losses: number;         // 失败场次
  winRate: number;        // 胜率（0-100）

  // 等级系统
  level: number;          // 当前等级
  currentXP: number;      // 当前经验值（相对于当前等级）
  totalXP: number;        // 累计总经验值
  winStreak: number;      // 当前连胜
  maxWinStreak: number;   // 最高连胜
  lastWinDate: string;    // 最后获胜日期

  // 阵营统计
  villagerWins: number;   // 好人阵营胜利
  villagerGames: number;  // 好人阵营场次
  werewolfWins: number;   // 狼人阵营胜利
  werewolfGames: number;  // 狼人阵营场次
  loversWins: number;     // 情侣胜利
  loversGames: number;    // 情侣场次

  // 角色统计
  roleStats: Record<string, RoleStats>;

  // 其他统计
  survivalRate: number;   // 存活率（游戏结束时存活的比例）
  gamesAsSheriff: number; // 当选警长次数
  sheriffWins: number;    // 作为警长时的胜利次数

  // 时间戳
  firstGameAt: number;    // 首次游戏时间
  lastGameAt: number;     // 最后游戏时间
}

// ============================================================================
// 好友邀请系统 (Friend Invite System)
// ============================================================================

// 邀请状态
export enum InviteStatus {
  PENDING = 'pending',       // 等待响应
  ACCEPTED = 'accepted',     // 已接受
  DECLINED = 'declined',     // 已拒绝
  EXPIRED = 'expired',       // 已过期
  CANCELLED = 'cancelled',   // 已取消
}

// 邀请数据
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
  password?: string;          // 私密房间密码（仅接受时返回）
}

// 搜索用户结果
export interface SearchedUser {
  userId: string;
  username: string;
  displayName: string;
  online: boolean;
}

// ============================================================================
// 成就系统 (Achievement System)
// ============================================================================

/** 成就 ID 枚举 */
export enum AchievementId {
  // 新手成就 (入门级)
  FIRST_GAME = 'first_game',
  FIRST_WIN = 'first_win',
  FIRST_WOLF_WIN = 'first_wolf_win',
  FIRST_VILLAGER_WIN = 'first_villager_win',

  // 场次成就 (进阶级)
  GAMES_10 = 'games_10',
  GAMES_50 = 'games_50',
  GAMES_100 = 'games_100',
  GAMES_500 = 'games_500',
  GAMES_1000 = 'games_1000',

  // 胜利成就
  WINS_10 = 'wins_10',
  WINS_50 = 'wins_50',
  WINS_100 = 'wins_100',
  WINS_500 = 'wins_500',

  // 连胜成就
  WIN_STREAK_3 = 'win_streak_3',
  WIN_STREAK_5 = 'win_streak_5',
  WIN_STREAK_10 = 'win_streak_10',
  WIN_STREAK_20 = 'win_streak_20',

  // 角色大师成就
  VILLAGER_MASTER = 'villager_master',
  SEER_MASTER = 'seer_master',
  WITCH_MASTER = 'witch_master',
  HUNTER_MASTER = 'hunter_master',
  GUARD_MASTER = 'guard_master',
  IDIOT_MASTER = 'idiot_master',
  WEREWOLF_MASTER = 'werewolf_master',
  ALPHA_WOLF_MASTER = 'alpha_wolf_master',
  CUPID_MASTER = 'cupid_master',

  // 技能成就
  SEER_CORRECT_10 = 'seer_correct_10',
  SEER_CORRECT_50 = 'seer_correct_50',
  WITCH_SAVE_10 = 'witch_save_10',
  WITCH_POISON_WOLF_10 = 'witch_poison_wolf_10',
  GUARD_SAVE_10 = 'guard_save_10',
  HUNTER_KILL_WOLF_10 = 'hunter_kill_wolf_10',

  // 警长成就
  SHERIFF_ELECTED_10 = 'sheriff_elected_10',
  SHERIFF_WIN_10 = 'sheriff_win_10',

  // 特殊成就
  PERFECT_SEER = 'perfect_seer',
  DOUBLE_KILL_WITCH = 'double_kill_witch',
  LAST_STAND = 'last_stand',
  WOLF_EXTERMINATOR = 'wolf_exterminator',
  SILENT_KILLER = 'silent_killer',
  LOVER_VICTORY = 'lover_victory',
  IDIOT_REVEAL = 'idiot_reveal',
  COMEBACK_KING = 'comeback_king',

  // 存活成就
  SURVIVOR_10 = 'survivor_10',
  SURVIVOR_50 = 'survivor_50',
  PERFECT_SURVIVAL = 'perfect_survival',

  // 等级成就
  LEVEL_10 = 'level_10',
  LEVEL_25 = 'level_25',
  LEVEL_50 = 'level_50',
  LEVEL_75 = 'level_75',
  LEVEL_100 = 'level_100',

  // 社交成就
  INVITE_FRIEND = 'invite_friend',
  INVITE_FRIEND_10 = 'invite_friend_10',
}

/** 成就类别 */
export enum AchievementCategory {
  BEGINNER = 'beginner',
  GAMES = 'games',
  WINS = 'wins',
  STREAK = 'streak',
  ROLE_MASTER = 'role_master',
  SKILL = 'skill',
  SHERIFF = 'sheriff',
  SPECIAL = 'special',
  SURVIVAL = 'survival',
  LEVEL = 'level',
  SOCIAL = 'social',
}

/** 成就稀有度 */
export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

/** 成就定义 */
export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  xpReward: number;
  requirement: number;
  hidden?: boolean;
}

/** 成就进度 */
export interface AchievementProgress {
  achievementId: AchievementId;
  current: number;
  required: number;
  completed: boolean;
  unlockedAt?: number;
}

/** 用户成就数据 */
export interface UserAchievements {
  userId: string;
  achievements: Record<string, AchievementProgress>;
  totalUnlocked: number;
  totalXPFromAchievements: number;
  lastUpdated: number;
}

/** 成就解锁通知 */
export interface AchievementUnlock {
  achievement: AchievementDefinition;
  progress: AchievementProgress;
  xpEarned: number;
}

/** 成就类别名称 */
export const ACHIEVEMENT_CATEGORY_NAMES: Record<AchievementCategory, string> = {
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

/** 稀有度颜色 */
export const ACHIEVEMENT_RARITY_COLORS: Record<AchievementRarity, string> = {
  [AchievementRarity.COMMON]: '#9CA3AF',
  [AchievementRarity.UNCOMMON]: '#22C55E',
  [AchievementRarity.RARE]: '#3B82F6',
  [AchievementRarity.EPIC]: '#A855F7',
  [AchievementRarity.LEGENDARY]: '#F59E0B',
};

/** 稀有度名称 */
export const ACHIEVEMENT_RARITY_NAMES: Record<AchievementRarity, string> = {
  [AchievementRarity.COMMON]: '普通',
  [AchievementRarity.UNCOMMON]: '优秀',
  [AchievementRarity.RARE]: '稀有',
  [AchievementRarity.EPIC]: '史诗',
  [AchievementRarity.LEGENDARY]: '传说',
};

// ============================================================================
// Leaderboard Types
// ============================================================================

/** 排行榜类型 */
export type LeaderboardType = 'level' | 'wins' | 'winRate' | 'winStreak';

/** 排行榜条目 */
export interface LeaderboardEntry {
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
}

/** 排行榜响应 */
export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  type: LeaderboardType;
  total: number;
  offset: number;
  limit: number;
  myRank: LeaderboardEntry | null;
  error?: string;
}

/** 排行榜类型名称 */
export const LEADERBOARD_TYPE_NAMES: Record<LeaderboardType, string> = {
  level: '等级榜',
  wins: '胜场榜',
  winRate: '胜率榜',
  winStreak: '连胜榜',
};

/** 排行榜类型图标 */
export const LEADERBOARD_TYPE_ICONS: Record<LeaderboardType, string> = {
  level: '📈',
  wins: '🏆',
  winRate: '📊',
  winStreak: '🔥',
};

/** 排行榜类型描述 */
export const LEADERBOARD_TYPE_DESCRIPTIONS: Record<LeaderboardType, string> = {
  level: '按玩家等级排名',
  wins: '按总胜场数排名',
  winRate: '按胜率排名（需10场以上）',
  winStreak: '按历史最高连胜排名',
};

// ============================================================================
// 回放系统类型
// ============================================================================

/** 回放事件类型 */
export enum GameEventType {
  MATCH_CREATED = 'match_created',
  MATCH_STARTED = 'match_started',
  MATCH_ENDED = 'match_ended',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_DIED = 'player_died',
  PHASE_CHANGED = 'phase_changed',
  NIGHT_STARTED = 'night_started',
  DAY_STARTED = 'day_started',
  VOTING_STARTED = 'voting_started',
  VOTING_ENDED = 'voting_ended',
  WOLF_KILL = 'wolf_kill',
  SEER_CHECK = 'seer_check',
  WITCH_SAVE = 'witch_save',
  WITCH_POISON = 'witch_poison',
  GUARD_PROTECT = 'guard_protect',
  HUNTER_SHOOT = 'hunter_shoot',
  ALPHA_WOLF_SHOOT = 'alpha_wolf_shoot',
  CUPID_LINK = 'cupid_link',
  VOTE_CAST = 'vote_cast',
  VOTE_RESULT = 'vote_result',
  SHERIFF_CAMPAIGN = 'sheriff_campaign',
  SHERIFF_ELECTED = 'sheriff_elected',
  SHERIFF_TRANSFER = 'sheriff_transfer',
  IDIOT_REVEALED = 'idiot_revealed',
  LOVER_DIED = 'lover_died',
  GAME_WIN = 'game_win',
}

/** 回放玩家信息 */
export interface ReplayPlayer {
  id: string;
  name: string;
  seatNumber: number;
  role: Role;
  faction: Faction;
  isAlive: boolean;
  isSheriff: boolean;
  isLover: boolean;
  loverId?: string;
}

/** 回放配置 */
export interface ReplayConfig {
  maxPlayers: number;
  roles: Role[];
  discussionTime: number;
  votingTime: number;
  nightActionTime: number;
  allowSheriff: boolean;
  allowLastWords: boolean;
  roomName?: string;
  isPrivate: boolean;
}

/** 回放元信息 */
export interface ReplayMeta {
  id: string;
  matchId: string;
  createdAt: string;
  endedAt: string;
  duration: number;
  playerCount: number;
  winner: Faction | 'lovers' | null;
  days: number;
  config: ReplayConfig;
  players: ReplayPlayer[];
}

/** 回放事件 */
export interface ReplayEvent {
  type: GameEventType;
  timestamp: number;
  day: number;
  phase: GamePhase | string;
  actor?: {
    id: string;
    name: string;
    seat: number;
    role?: Role;
  };
  target?: {
    id: string;
    name: string;
    seat: number;
    role?: Role;
  };
  data?: Record<string, unknown>;
}

/** 完整回放数据 */
export interface GameReplay {
  meta: ReplayMeta;
  events: ReplayEvent[];
}

/** 回放列表项 */
export interface ReplayListItem {
  id: string;
  matchId: string;
  createdAt: string;
  duration: number;
  playerCount: number;
  winner: string | null;
  days: number;
  myRole?: Role;
  myResult?: 'win' | 'lose';
}

/** 回放统计 */
export interface ReplayStats {
  totalKills: number;
  wolfKills: number;
  witchSaves: number;
  witchPoisons: number;
  hunterShots: number;
  votedOut: number;
  skillsUsed: number;
}
