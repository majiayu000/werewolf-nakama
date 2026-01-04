/**
 * Message Compression Module
 * 消息压缩模块 - 减少网络传输数据量
 *
 * 优化策略：
 * 1. 短字段名映射 - 将长字段名映射为1-2个字符
 * 2. 值压缩 - 使用数字代替枚举字符串
 * 3. 移除默认值 - 不传输默认值字段
 */

import { Role, Faction, GamePhase, PlayerStatus, ConnectionStatus, NightSubPhase } from './types';

// ============================================================================
// 字段名映射 (Field Name Mapping)
// ============================================================================

/** 字段名映射：长名 -> 短名 */
const FIELD_MAP: Record<string, string> = {
  // 玩家字段
  'id': 'i',
  'oderId': 'i',
  'name': 'n',
  'displayName': 'n',
  'odername': 'u',
  'seatNumber': 's',
  'role': 'r',
  'faction': 'f',
  'status': 't',
  'connection': 'c',
  'isReady': 'y',
  'votedFor': 'v',
  'isSpectator': 'sp',
  'isLovers': 'lv',
  'loverId': 'li',
  'idiotRevealed': 'ir',
  'witchItems': 'wi',
  'lastAction': 'la',

  // 游戏状态字段
  'phase': 'p',
  'nightSubPhase': 'ns',
  'dayNumber': 'd',
  'players': 'ps',
  'spectators': 'ss',
  'phaseStartTime': 'st',
  'phaseEndTime': 'et',
  'sheriffId': 'sh',
  'currentShooter': 'cs',
  'lastWordsSpeaker': 'ls',
  'loversLinked': 'll',
  'loversFaction': 'lf',
  'votes': 'vs',

  // 夜晚信息
  'wolfTarget': 'wt',
  'guardTarget': 'gt',
  'seerTarget': 'st2',
  'witchSaveTarget': 'ws',
  'witchPoisonTarget': 'wp',
  'nightInfo': 'ni',

  // 消息相关
  'playerId': 'pi',
  'playerName': 'pn',
  'targetId': 'ti',
  'voterId': 'vi',
  'message': 'm',
  'sender': 'sd',
  'channel': 'ch',
  'timestamp': 'ts',

  // 警长系统
  'candidates': 'cd',
  'currentSpeaker': 'ck',
  'campaignSpeakingOrder': 'co',

  // 遗言系统
  'deathCause': 'dc',
  'content': 'ct',

  // 邀请系统
  'matchId': 'mi',
  'roomName': 'rn',
  'maxPlayers': 'mp',
  'playerCount': 'pc',
  'spectatorCount': 'sc',
  'isPrivate': 'ip',
  'joinedAt': 'ja',
};

/** 反向映射：短名 -> 长名 */
const FIELD_MAP_REVERSE: Record<string, string> = {};
for (const [long, short] of Object.entries(FIELD_MAP)) {
  if (!FIELD_MAP_REVERSE[short]) {
    FIELD_MAP_REVERSE[short] = long;
  }
}

// ============================================================================
// 枚举值压缩 (Enum Value Compression)
// ============================================================================

/** 角色 -> 数字 */
const ROLE_MAP: Record<Role, number> = {
  [Role.VILLAGER]: 0,
  [Role.SEER]: 1,
  [Role.WITCH]: 2,
  [Role.HUNTER]: 3,
  [Role.GUARD]: 4,
  [Role.IDIOT]: 5,
  [Role.WEREWOLF]: 6,
  [Role.ALPHA_WOLF]: 7,
  [Role.CUPID]: 8,
  [Role.THIEF]: 9,
};

/** 数字 -> 角色 */
const ROLE_MAP_REVERSE: Record<number, Role> = {};
for (const [role, num] of Object.entries(ROLE_MAP)) {
  ROLE_MAP_REVERSE[num] = role as Role;
}

/** 阵营 -> 数字 */
const FACTION_MAP: Record<Faction, number> = {
  [Faction.VILLAGER]: 0,
  [Faction.WEREWOLF]: 1,
  [Faction.NEUTRAL]: 2,
  [Faction.LOVERS]: 3,
};

/** 数字 -> 阵营 */
const FACTION_MAP_REVERSE: Record<number, Faction> = {};
for (const [faction, num] of Object.entries(FACTION_MAP)) {
  FACTION_MAP_REVERSE[num] = faction as Faction;
}

/** 游戏阶段 -> 数字 */
const PHASE_MAP: Record<GamePhase, number> = {
  [GamePhase.WAITING]: 0,
  [GamePhase.STARTING]: 1,
  [GamePhase.FIRST_NIGHT]: 2,
  [GamePhase.NIGHT]: 3,
  [GamePhase.NIGHT_RESULT]: 4,
  [GamePhase.SHERIFF_CAMPAIGN]: 5,
  [GamePhase.SHERIFF_SPEECH]: 6,
  [GamePhase.SHERIFF_VOTING]: 7,
  [GamePhase.SHERIFF_TRANSFER]: 8,
  [GamePhase.DAY_DISCUSSION]: 9,
  [GamePhase.DAY_VOTING]: 10,
  [GamePhase.VOTE_RESULT]: 11,
  [GamePhase.LAST_WORDS]: 12,
  [GamePhase.DEATH_SKILL]: 13,
  [GamePhase.GAME_OVER]: 14,
};

/** 数字 -> 游戏阶段 */
const PHASE_MAP_REVERSE: Record<number, GamePhase> = {};
for (const [phase, num] of Object.entries(PHASE_MAP)) {
  PHASE_MAP_REVERSE[num] = phase as GamePhase;
}

/** 玩家状态 -> 数字 */
const STATUS_MAP: Record<PlayerStatus, number> = {
  [PlayerStatus.ALIVE]: 0,
  [PlayerStatus.DEAD_BY_WOLF]: 1,
  [PlayerStatus.DEAD_BY_VOTE]: 2,
  [PlayerStatus.DEAD_BY_POISON]: 3,
  [PlayerStatus.DEAD_BY_HUNTER]: 4,
  [PlayerStatus.DEAD_BY_ALPHA_WOLF]: 5,
  [PlayerStatus.DEAD_BY_LOVER]: 6,
};

/** 数字 -> 玩家状态 */
const STATUS_MAP_REVERSE: Record<number, PlayerStatus> = {};
for (const [status, num] of Object.entries(STATUS_MAP)) {
  STATUS_MAP_REVERSE[num] = status as PlayerStatus;
}

/** 连接状态 -> 数字 */
const CONN_MAP: Record<ConnectionStatus, number> = {
  [ConnectionStatus.CONNECTED]: 0,
  [ConnectionStatus.DISCONNECTED]: 1,
  [ConnectionStatus.RECONNECTING]: 2,
};

/** 数字 -> 连接状态 */
const CONN_MAP_REVERSE: Record<number, ConnectionStatus> = {};
for (const [conn, num] of Object.entries(CONN_MAP)) {
  CONN_MAP_REVERSE[num] = conn as ConnectionStatus;
}

/** 夜晚子阶段 -> 数字 */
const NIGHT_SUB_MAP: Record<NightSubPhase, number> = {
  [NightSubPhase.THIEF]: 0,
  [NightSubPhase.CUPID]: 1,
  [NightSubPhase.WEREWOLF]: 2,
  [NightSubPhase.GUARD]: 3,
  [NightSubPhase.SEER]: 4,
  [NightSubPhase.WITCH]: 5,
  [NightSubPhase.COMPLETE]: 6,
};

/** 数字 -> 夜晚子阶段 */
const NIGHT_SUB_MAP_REVERSE: Record<number, NightSubPhase> = {};
for (const [sub, num] of Object.entries(NIGHT_SUB_MAP)) {
  NIGHT_SUB_MAP_REVERSE[num] = sub as NightSubPhase;
}

// ============================================================================
// 压缩函数 (Compression Functions)
// ============================================================================

/**
 * 压缩单个值（枚举转数字）
 */
function compressValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  // 枚举值压缩
  if (key === 'role' || key === 'r') {
    return typeof value === 'string' && value in ROLE_MAP ? ROLE_MAP[value as Role] : value;
  }
  if (key === 'faction' || key === 'f') {
    return typeof value === 'string' && value in FACTION_MAP ? FACTION_MAP[value as Faction] : value;
  }
  if (key === 'phase' || key === 'p') {
    return typeof value === 'string' && value in PHASE_MAP ? PHASE_MAP[value as GamePhase] : value;
  }
  if (key === 'status' || key === 't') {
    return typeof value === 'string' && value in STATUS_MAP ? STATUS_MAP[value as PlayerStatus] : value;
  }
  if (key === 'connection' || key === 'c') {
    return typeof value === 'string' && value in CONN_MAP ? CONN_MAP[value as ConnectionStatus] : value;
  }
  if (key === 'nightSubPhase' || key === 'ns') {
    return typeof value === 'string' && value in NIGHT_SUB_MAP ? NIGHT_SUB_MAP[value as NightSubPhase] : value;
  }

  return value;
}

/**
 * 解压单个值（数字转枚举）
 */
function decompressValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  // 枚举值解压
  if ((key === 'role' || key === 'r') && typeof value === 'number') {
    return ROLE_MAP_REVERSE[value] ?? value;
  }
  if ((key === 'faction' || key === 'f') && typeof value === 'number') {
    return FACTION_MAP_REVERSE[value] ?? value;
  }
  if ((key === 'phase' || key === 'p') && typeof value === 'number') {
    return PHASE_MAP_REVERSE[value] ?? value;
  }
  if ((key === 'status' || key === 't') && typeof value === 'number') {
    return STATUS_MAP_REVERSE[value] ?? value;
  }
  if ((key === 'connection' || key === 'c') && typeof value === 'number') {
    return CONN_MAP_REVERSE[value] ?? value;
  }
  if ((key === 'nightSubPhase' || key === 'ns') && typeof value === 'number') {
    return NIGHT_SUB_MAP_REVERSE[value] ?? value;
  }

  return value;
}

/**
 * 压缩消息对象
 * @param data 原始消息对象
 * @returns 压缩后的消息对象
 */
export function compressMessage(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => compressMessage(item));
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const shortKey = FIELD_MAP[key] || key;

    // 移除默认值和 null 值以节省空间
    if (value === null || value === undefined) continue;
    if (value === false && (key === 'isReady' || key === 'isSpectator' || key === 'idiotRevealed' || key === 'isLovers')) continue;
    if (value === 0 && key === 'seatNumber') continue;

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      result[shortKey] = compressMessage(value);
    } else {
      result[shortKey] = compressValue(key, value);
    }
  }

  return result;
}

/**
 * 解压消息对象
 * @param data 压缩后的消息对象
 * @returns 原始消息对象
 */
export function decompressMessage(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => decompressMessage(item));
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const longKey = FIELD_MAP_REVERSE[key] || key;

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      result[longKey] = decompressMessage(value);
    } else {
      result[longKey] = decompressValue(key, value);
    }
  }

  return result;
}

/**
 * 压缩玩家列表（常用优化）
 * 将玩家对象数组压缩为更紧凑的格式
 */
export function compressPlayerList(players: any[]): any[] {
  return players.map(p => {
    // 只保留必要字段，使用数组而非对象进一步减少体积
    // 格式: [id, name, seatNumber, role, status, isReady, connection, votedFor]
    return [
      p.id || p.oderId || p.i,
      p.name || p.displayName || p.n,
      p.seatNumber || p.s || 0,
      p.role ? (typeof p.role === 'string' ? ROLE_MAP[p.role as Role] : p.role) : null,
      p.status ? (typeof p.status === 'string' ? STATUS_MAP[p.status as PlayerStatus] : p.status) : 0,
      p.isReady || p.y ? 1 : 0,
      p.connection ? (typeof p.connection === 'string' ? CONN_MAP[p.connection as ConnectionStatus] : p.connection) : 0,
      p.votedFor || p.v || null,
    ];
  });
}

/**
 * 解压玩家列表
 */
export function decompressPlayerList(players: any[]): any[] {
  return players.map(p => {
    if (Array.isArray(p)) {
      return {
        id: p[0],
        name: p[1],
        seatNumber: p[2],
        role: p[3] !== null ? ROLE_MAP_REVERSE[p[3]] : null,
        status: STATUS_MAP_REVERSE[p[4]] ?? PlayerStatus.ALIVE,
        isReady: p[5] === 1,
        connection: CONN_MAP_REVERSE[p[6]] ?? ConnectionStatus.CONNECTED,
        votedFor: p[7],
      };
    }
    return decompressMessage(p);
  });
}

/**
 * 计算压缩后的消息大小估算
 */
export function estimateCompressedSize(data: any): { original: number; compressed: number; ratio: number } {
  const originalStr = JSON.stringify(data);
  const compressedStr = JSON.stringify(compressMessage(data));

  return {
    original: originalStr.length,
    compressed: compressedStr.length,
    ratio: compressedStr.length / originalStr.length,
  };
}

// ============================================================================
// 增量更新支持 (Delta Update Support)
// ============================================================================

/**
 * 计算两个对象之间的差异（增量更新）
 * @param oldData 旧数据
 * @param newData 新数据
 * @returns 差异数据（只包含变化的字段）
 */
export function computeDelta(oldData: any, newData: any): any {
  if (oldData === newData) return null;
  if (oldData === null || typeof oldData !== 'object') return newData;
  if (newData === null || typeof newData !== 'object') return newData;
  if (Array.isArray(oldData) !== Array.isArray(newData)) return newData;

  // 数组差异：返回完整新数组（简化实现）
  if (Array.isArray(newData)) {
    // 如果数组长度或内容变化，返回新数组
    if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
      return newData;
    }
    return null;
  }

  // 对象差异
  const delta: Record<string, any> = {};
  let hasChanges = false;

  // 检查新增和修改的字段
  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = (oldData as Record<string, any>)[key];

    if (typeof newValue === 'object' && newValue !== null && typeof oldValue === 'object' && oldValue !== null) {
      const subDelta = computeDelta(oldValue, newValue);
      if (subDelta !== null) {
        delta[key] = subDelta;
        hasChanges = true;
      }
    } else if (newValue !== oldValue) {
      delta[key] = newValue;
      hasChanges = true;
    }
  }

  // 检查删除的字段
  for (const key of Object.keys(oldData)) {
    if (!(key in newData)) {
      delta[key] = null; // 标记为删除
      hasChanges = true;
    }
  }

  return hasChanges ? delta : null;
}

/**
 * 应用增量更新
 * @param base 基础数据
 * @param delta 差异数据
 * @returns 更新后的数据
 */
export function applyDelta(base: any, delta: any): any {
  if (delta === null) return base;
  if (base === null || typeof base !== 'object') return delta;
  if (typeof delta !== 'object') return delta;
  if (Array.isArray(delta)) return delta;

  const result = Array.isArray(base) ? [...base] : { ...base };

  for (const [key, value] of Object.entries(delta)) {
    if (value === null) {
      delete (result as Record<string, any>)[key];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as Record<string, any>)[key] = applyDelta((result as Record<string, any>)[key], value);
    } else {
      (result as Record<string, any>)[key] = value;
    }
  }

  return result;
}

// ============================================================================
// 导出映射表供前端使用
// ============================================================================

export const CompressionMaps = {
  FIELD_MAP,
  FIELD_MAP_REVERSE,
  ROLE_MAP,
  ROLE_MAP_REVERSE,
  FACTION_MAP,
  FACTION_MAP_REVERSE,
  PHASE_MAP,
  PHASE_MAP_REVERSE,
  STATUS_MAP,
  STATUS_MAP_REVERSE,
  CONN_MAP,
  CONN_MAP_REVERSE,
  NIGHT_SUB_MAP,
  NIGHT_SUB_MAP_REVERSE,
};
