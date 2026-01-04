/**
 * Message Decompression Module for Client
 * 前端消息解压模块 - 与后端压缩模块配合使用
 *
 * 注意：前端类型定义可能与后端不完全一致，此模块会进行类型映射
 */

// 注意：虽然此模块处理类型转换，但使用字符串而非枚举
// 以保持与可能不完全一致的前后端类型的兼容性

// ============================================================================
// 字段名映射 (Field Name Mapping)
// ============================================================================

/** 字段名反向映射：短名 -> 长名 */
const FIELD_MAP_REVERSE: Record<string, string> = {
  'i': 'id',
  'n': 'name',
  'u': 'username',
  's': 'seatNumber',
  'r': 'role',
  'f': 'faction',
  't': 'status',
  'c': 'connection',
  'y': 'isReady',
  'v': 'votedFor',
  'sp': 'isSpectator',
  'lv': 'isLover',
  'li': 'loverId',
  'ir': 'idiotRevealed',
  'wi': 'witchItems',
  'la': 'lastAction',
  'p': 'phase',
  'ns': 'nightSubPhase',
  'd': 'dayNumber',
  'ps': 'players',
  'ss': 'spectators',
  'st': 'phaseStartTime',
  'et': 'phaseEndTime',
  'sh': 'sheriffId',
  'cs': 'currentShooter',
  'ls': 'lastWordsSpeaker',
  'll': 'loversLinked',
  'lf': 'loversFaction',
  'vs': 'votes',
  'wt': 'wolfTarget',
  'gt': 'guardTarget',
  'st2': 'seerTarget',
  'ws': 'witchSaveTarget',
  'wp': 'witchPoisonTarget',
  'ni': 'nightInfo',
  'pi': 'playerId',
  'pn': 'playerName',
  'ti': 'targetId',
  'vi': 'voterId',
  'm': 'message',
  'sd': 'sender',
  'ch': 'channel',
  'ts': 'timestamp',
  'cd': 'candidates',
  'ck': 'currentSpeaker',
  'co': 'campaignSpeakingOrder',
  'dc': 'deathCause',
  'ct': 'content',
  'mi': 'matchId',
  'rn': 'roomName',
  'mp': 'maxPlayers',
  'pc': 'playerCount',
  'sc': 'spectatorCount',
  'ip': 'isPrivate',
  'ja': 'joinedAt',
};

// ============================================================================
// 枚举值解压 (Enum Value Decompression)
// 注意：使用字符串值以兼容前后端类型差异
// ============================================================================

/** 数字 -> 角色 (字符串) */
const ROLE_MAP_REVERSE: Record<number, string> = {
  0: 'villager',
  1: 'seer',
  2: 'witch',
  3: 'hunter',
  4: 'guard',
  5: 'idiot',
  6: 'werewolf',
  7: 'alpha_wolf',
  8: 'cupid',
  9: 'thief',  // 前端可能没有此值，保持字符串
};

/** 数字 -> 阵营 (字符串) */
const FACTION_MAP_REVERSE: Record<number, string> = {
  0: 'villager',
  1: 'werewolf',
  2: 'neutral',
  3: 'lovers',
};

/** 数字 -> 游戏阶段 (字符串) */
const PHASE_MAP_REVERSE: Record<number, string> = {
  0: 'waiting',
  1: 'starting',
  2: 'first_night',
  3: 'night',
  4: 'night_result',
  5: 'sheriff_campaign',
  6: 'sheriff_speech',
  7: 'sheriff_voting',
  8: 'sheriff_transfer',
  9: 'day_discussion',
  10: 'day_voting',
  11: 'vote_result',
  12: 'last_words',
  13: 'death_skill',
  14: 'game_over',
};

/** 数字 -> 玩家状态 (字符串) */
const STATUS_MAP_REVERSE: Record<number, string> = {
  0: 'alive',
  1: 'dead_by_wolf',
  2: 'dead_by_vote',
  3: 'dead_by_poison',
  4: 'dead_by_hunter',
  5: 'dead_by_alpha_wolf',
  6: 'dead_by_lover',
};

/** 数字 -> 连接状态 (字符串) */
const CONN_MAP_REVERSE: Record<number, string> = {
  0: 'connected',
  1: 'disconnected',
  2: 'reconnecting',
};

/** 数字 -> 夜晚子阶段 (字符串) */
const NIGHT_SUB_MAP_REVERSE: Record<number, string> = {
  0: 'thief',
  1: 'cupid',
  2: 'werewolf',
  3: 'guard',
  4: 'seer',
  5: 'witch',
  6: 'complete',
};

// ============================================================================
// 解压函数 (Decompression Functions)
// ============================================================================

/**
 * 解压单个值（数字转枚举字符串）
 */
function decompressValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const originalKey = FIELD_MAP_REVERSE[key] || key;

  // 枚举值解压
  if ((originalKey === 'role' || key === 'r') && typeof value === 'number') {
    return ROLE_MAP_REVERSE[value] ?? value;
  }
  if ((originalKey === 'faction' || key === 'f') && typeof value === 'number') {
    return FACTION_MAP_REVERSE[value] ?? value;
  }
  if ((originalKey === 'phase' || key === 'p') && typeof value === 'number') {
    return PHASE_MAP_REVERSE[value] ?? value;
  }
  if ((originalKey === 'status' || key === 't') && typeof value === 'number') {
    return STATUS_MAP_REVERSE[value] ?? value;
  }
  if ((originalKey === 'connection' || key === 'c') && typeof value === 'number') {
    return CONN_MAP_REVERSE[value] ?? value;
  }
  if ((originalKey === 'nightSubPhase' || key === 'ns') && typeof value === 'number') {
    return NIGHT_SUB_MAP_REVERSE[value] ?? value;
  }

  return value;
}

/**
 * 检测消息是否被压缩
 * 压缩消息的特征：使用短字段名（1-2个字符）
 */
function isCompressedMessage(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const keys = Object.keys(data);
  // 如果有 50% 以上的键都是1-2个字符，认为是压缩消息
  const shortKeyCount = keys.filter(k => k.length <= 2).length;
  return keys.length > 0 && shortKeyCount / keys.length > 0.5;
}

/**
 * 解压消息对象
 * @param data 压缩后的消息对象
 * @returns 原始消息对象
 */
export function decompressMessage<T = unknown>(data: unknown): T {
  if (data === null || data === undefined) return data as T;
  if (typeof data !== 'object') return data as T;
  if (Array.isArray(data)) {
    return data.map(item => decompressMessage(item)) as T;
  }

  // 检测是否是压缩消息
  if (!isCompressedMessage(data)) {
    // 如果不是压缩消息，仍然递归处理子对象（可能有嵌套的压缩数据）
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = decompressMessage(value);
      } else {
        result[key] = decompressValue(key, value);
      }
    }
    return result as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const longKey = FIELD_MAP_REVERSE[key] || key;

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      result[longKey] = decompressMessage(value);
    } else {
      result[longKey] = decompressValue(key, value);
    }
  }

  // 恢复被省略的默认值
  if (!('isReady' in result)) result.isReady = false;
  if (!('isSpectator' in result)) result.isSpectator = false;
  if (!('idiotRevealed' in result)) result.idiotRevealed = false;
  if (!('isLover' in result)) result.isLover = false;

  return result as T;
}

/**
 * 解压玩家列表（数组格式）
 * 格式: [id, name, seatNumber, role, status, isReady, connection, votedFor]
 */
export function decompressPlayerList(players: unknown[]): unknown[] {
  return players.map(p => {
    if (Array.isArray(p) && p.length >= 7) {
      return {
        id: p[0],
        name: p[1],
        seatNumber: p[2],
        role: p[3] !== null ? ROLE_MAP_REVERSE[p[3] as number] : null,
        status: STATUS_MAP_REVERSE[p[4] as number] ?? 'alive',
        isReady: p[5] === 1,
        connection: CONN_MAP_REVERSE[p[6] as number] ?? 'connected',
        votedFor: p[7] ?? null,
      };
    }
    return decompressMessage(p);
  });
}

/**
 * 安全解压 - 处理可能的异常
 */
export function safeDecompress<T = unknown>(data: unknown): T {
  try {
    return decompressMessage<T>(data);
  } catch (e) {
    console.warn('Failed to decompress message:', e);
    return data as T;
  }
}

// ============================================================================
// 增量更新支持 (Delta Update Support)
// ============================================================================

/**
 * 应用增量更新
 * @param base 基础数据
 * @param delta 差异数据
 * @returns 更新后的数据
 */
export function applyDelta<T>(base: T, delta: Partial<T> | null): T {
  if (delta === null || delta === undefined) return base;
  if (base === null || typeof base !== 'object') return delta as T;
  if (typeof delta !== 'object') return delta as T;
  if (Array.isArray(delta)) return delta as T;

  const result = Array.isArray(base) ? [...base] : { ...base };

  for (const [key, value] of Object.entries(delta)) {
    if (value === null) {
      delete (result as Record<string, unknown>)[key];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = applyDelta(
        (result as Record<string, unknown>)[key],
        value
      );
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result as T;
}
