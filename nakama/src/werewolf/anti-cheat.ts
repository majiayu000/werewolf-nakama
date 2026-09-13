/**
 * Anti-Cheat Module for Werewolf Game
 * Provides rate limiting, action validation, and anomaly detection
 */

import { GamePhase, GameState, Player, PlayerStatus, Role, NightSubPhase, OpCode } from './types';

// ============== Rate Limiting ==============

interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  blockDurationMs: number;  // How long to block after exceeding limit
}

interface PlayerRateLimit {
  requests: number[];        // Timestamps of recent requests
  blockedUntil: number;      // Timestamp when block expires (0 = not blocked)
  totalViolations: number;   // Total number of rate limit violations
}

// Rate limit configurations for different message types
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Chat messages: max 5 per 3 seconds
  chat: {
    maxRequests: 5,
    windowMs: 3000,
    blockDurationMs: 10000,
  },
  // Skill/Vote actions: max 3 per second
  action: {
    maxRequests: 3,
    windowMs: 1000,
    blockDurationMs: 5000,
  },
  // Ready/State changes: max 2 per second
  state: {
    maxRequests: 2,
    windowMs: 1000,
    blockDurationMs: 3000,
  },
  // Generic fallback
  default: {
    maxRequests: 10,
    windowMs: 1000,
    blockDurationMs: 5000,
  },
};

// Player rate limit states (playerId -> category -> state)
const rateLimitStates = new Map<string, Map<string, PlayerRateLimit>>();

/**
 * Get or create rate limit state for a player/category
 */
function getRateLimitState(playerId: string, category: string): PlayerRateLimit {
  let playerLimits = rateLimitStates.get(playerId);
  if (!playerLimits) {
    playerLimits = new Map();
    rateLimitStates.set(playerId, playerLimits);
  }

  let state = playerLimits.get(category);
  if (!state) {
    state = {
      requests: [],
      blockedUntil: 0,
      totalViolations: 0,
    };
    playerLimits.set(category, state);
  }

  return state;
}

/**
 * Check if a request should be rate limited
 * Returns true if request should be blocked
 */
export function checkRateLimit(
  playerId: string,
  category: string,
  logger?: nkruntime.Logger
): { blocked: boolean; reason?: string } {
  const config = RATE_LIMITS[category] || RATE_LIMITS.default;
  const state = getRateLimitState(playerId, category);
  const now = Date.now();

  // Check if currently blocked
  if (state.blockedUntil > now) {
    if (logger) {
      logger.warn(`[AntiCheat] Player ${playerId} is rate limited for ${category} until ${new Date(state.blockedUntil).toISOString()}`);
    }
    return {
      blocked: true,
      reason: `Rate limited. Try again in ${Math.ceil((state.blockedUntil - now) / 1000)} seconds.`,
    };
  }

  // Clean up old requests outside the window
  state.requests = state.requests.filter(ts => ts > now - config.windowMs);

  // Check if exceeded limit
  if (state.requests.length >= config.maxRequests) {
    state.totalViolations++;
    // Progressive blocking: longer blocks for repeat offenders
    const blockMultiplier = Math.min(state.totalViolations, 5);
    state.blockedUntil = now + (config.blockDurationMs * blockMultiplier);

    if (logger) {
      logger.warn(`[AntiCheat] Player ${playerId} exceeded rate limit for ${category}. Violations: ${state.totalViolations}`);
    }

    return {
      blocked: true,
      reason: `Too many requests. Blocked for ${(config.blockDurationMs * blockMultiplier) / 1000} seconds.`,
    };
  }

  // Record this request
  state.requests.push(now);
  return { blocked: false };
}

/**
 * Clear rate limit state for a player (e.g., when they leave)
 */
export function clearRateLimitState(playerId: string): void {
  rateLimitStates.delete(playerId);
}

/**
 * Get rate limit category for an OpCode
 */
export function getOpCodeCategory(opCode: OpCode): string {
  switch (opCode) {
    case OpCode.CHAT_MESSAGE:
    case OpCode.WOLF_CHAT:
    case OpCode.DEAD_CHAT:
    case OpCode.SPECTATOR_CHAT:
      return 'chat';

    case OpCode.VOTE:
    case OpCode.USE_SKILL:
    case OpCode.SHERIFF_VOTE:
    case OpCode.SHERIFF_TRANSFER_DONE:
      return 'action';

    case OpCode.READY:
    case OpCode.SHERIFF_CAMPAIGN_JOIN:
    case OpCode.SHERIFF_CAMPAIGN_QUIT:
    case OpCode.LAST_WORDS_SPEAK:
    case OpCode.LAST_WORDS_SKIP:
      return 'state';

    default:
      return 'default';
  }
}

// ============== Action Validation ==============

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate vote action
 */
export function validateVote(
  state: GameState,
  player: Player,
  targetId: string | null
): ValidationResult {
  // Phase check
  if (state.phase !== GamePhase.DAY_VOTING) {
    return { valid: false, reason: 'Voting is only allowed during voting phase' };
  }

  // Status check
  if (player.status !== PlayerStatus.ALIVE) {
    return { valid: false, reason: 'Dead players cannot vote' };
  }

  // Revealed idiot check
  const playerExt = state.extendedStates.get(player.oderId);
  if (player.role === Role.IDIOT && playerExt?.idiotRevealed) {
    return { valid: false, reason: 'Revealed idiots cannot vote' };
  }

  // Target validation
  if (targetId) {
    const target = state.players.get(targetId);
    if (!target) {
      return { valid: false, reason: 'Invalid target: player not found' };
    }
    if (target.status !== PlayerStatus.ALIVE) {
      return { valid: false, reason: 'Cannot vote for dead players' };
    }
  }

  return { valid: true };
}

/**
 * Validate skill usage
 */
export function validateSkill(
  state: GameState,
  player: Player,
  skill: string,
  targetId: string | null
): ValidationResult {
  // Phase check
  if (state.phase !== GamePhase.NIGHT && state.phase !== GamePhase.DEATH_SKILL) {
    return { valid: false, reason: 'Skills can only be used during night or death skill phase' };
  }

  // Status check (death skills are exception)
  if (state.phase !== GamePhase.DEATH_SKILL && player.status !== PlayerStatus.ALIVE) {
    return { valid: false, reason: 'Dead players cannot use skills' };
  }

  // Role check
  if (!player.role) {
    return { valid: false, reason: 'Player has no role assigned' };
  }

  const extState = state.extendedStates.get(player.oderId);

  // Role-specific validations
  switch (player.role) {
    case Role.WEREWOLF:
    case Role.ALPHA_WOLF:
      if (state.nightSubPhase !== NightSubPhase.WEREWOLF) {
        return { valid: false, reason: 'Not werewolf action phase' };
      }
      if (!targetId) {
        return { valid: false, reason: 'Werewolf must select a target' };
      }
      // Cannot target other werewolves
      const wolfTarget = state.players.get(targetId);
      if (wolfTarget && (wolfTarget.role === Role.WEREWOLF || wolfTarget.role === Role.ALPHA_WOLF)) {
        return { valid: false, reason: 'Cannot target fellow werewolves' };
      }
      break;

    case Role.SEER:
      if (state.nightSubPhase !== NightSubPhase.SEER) {
        return { valid: false, reason: 'Not seer action phase' };
      }
      if (!targetId) {
        return { valid: false, reason: 'Seer must select a target to check' };
      }
      // Cannot check self
      if (targetId === player.oderId) {
        return { valid: false, reason: 'Cannot check yourself' };
      }
      // Cannot check dead players (blocks farming correct-wolf progress)
      const seerTarget = state.players.get(targetId);
      if (!seerTarget) {
        return { valid: false, reason: 'Invalid target: player not found' };
      }
      if (seerTarget.status !== PlayerStatus.ALIVE) {
        return { valid: false, reason: 'Cannot check dead players' };
      }
      break;

    case Role.WITCH:
      if (state.nightSubPhase !== NightSubPhase.WITCH) {
        return { valid: false, reason: 'Not witch action phase' };
      }
      if (skill === 'heal') {
        if (!extState?.witchItems?.hasAntidote) {
          return { valid: false, reason: 'No antidote remaining' };
        }
        // Can only heal the wolf target
        if (targetId && targetId !== state.wolfTarget) {
          return { valid: false, reason: 'Can only save the werewolf victim' };
        }
      } else if (skill === 'poison') {
        if (!extState?.witchItems?.hasPoison) {
          return { valid: false, reason: 'No poison remaining' };
        }
        if (!targetId) {
          return { valid: false, reason: 'Must select a poison target' };
        }
        // Cannot poison self
        if (targetId === player.oderId) {
          return { valid: false, reason: 'Cannot poison yourself' };
        }
        // Cannot poison dead players
        const poisonTarget = state.players.get(targetId);
        if (poisonTarget?.status !== PlayerStatus.ALIVE) {
          return { valid: false, reason: 'Cannot poison dead players' };
        }
      }
      break;

    case Role.GUARD:
      if (state.nightSubPhase !== NightSubPhase.GUARD) {
        return { valid: false, reason: 'Not guard action phase' };
      }
      if (!targetId) {
        return { valid: false, reason: 'Guard must select a target to protect' };
      }
      // Cannot protect same person twice
      if (extState && extState.lastProtectedBy === targetId) {
        return { valid: false, reason: 'Cannot protect the same player two nights in a row' };
      }
      break;

    case Role.CUPID:
      if (state.nightSubPhase !== NightSubPhase.CUPID) {
        return { valid: false, reason: 'Not cupid action phase' };
      }
      if (state.dayNumber !== 1) {
        return { valid: false, reason: 'Cupid can only act on the first night' };
      }
      if (state.loversLinked) {
        return { valid: false, reason: 'Lovers already linked' };
      }
      break;

    case Role.HUNTER:
    case Role.ALPHA_WOLF:
      if (state.phase === GamePhase.DEATH_SKILL) {
        // Validate death skill
        if (player.oderId !== state.currentShooter) {
          return { valid: false, reason: 'Not your turn to shoot' };
        }
        // Check if can use death skill (hunter poisoned cannot shoot)
        if (player.role === Role.HUNTER) {
          if (player.status === PlayerStatus.DEAD_BY_POISON) {
            return { valid: false, reason: 'Poisoned hunters cannot shoot' };
          }
        }
      }
      break;
  }

  // Target existence check
  if (targetId) {
    const target = state.players.get(targetId);
    if (!target) {
      return { valid: false, reason: 'Invalid target: player not found' };
    }
  }

  return { valid: true };
}

/**
 * Validate chat message
 */
export function validateChat(
  state: GameState,
  player: Player,
  channel: OpCode,
  message: string
): ValidationResult {
  // Message length check
  if (!message || message.trim().length === 0) {
    return { valid: false, reason: 'Message cannot be empty' };
  }

  if (message.length > 500) {
    return { valid: false, reason: 'Message too long (max 500 characters)' };
  }

  // Channel validation
  switch (channel) {
    case OpCode.CHAT_MESSAGE:
      // Public chat: alive players during day, or during discussion
      if (player.status !== PlayerStatus.ALIVE) {
        return { valid: false, reason: 'Dead players cannot use public chat' };
      }
      if (state.phase === GamePhase.NIGHT) {
        return { valid: false, reason: 'Cannot use public chat during night' };
      }
      break;

    case OpCode.WOLF_CHAT:
      // Wolf chat: only werewolves
      if (player.role !== Role.WEREWOLF && player.role !== Role.ALPHA_WOLF) {
        return { valid: false, reason: 'Only werewolves can use wolf chat' };
      }
      // Dead wolves cannot use wolf chat
      if (player.status !== PlayerStatus.ALIVE) {
        return { valid: false, reason: 'Dead werewolves cannot use wolf chat' };
      }
      break;

    case OpCode.DEAD_CHAT:
      // Dead chat: only dead players
      if (player.status === PlayerStatus.ALIVE) {
        return { valid: false, reason: 'Only dead players can use dead chat' };
      }
      break;
  }

  return { valid: true };
}

// ============== Anomaly Detection ==============

interface PlayerBehavior {
  lastActionTime: number;
  actionCount: number;
  suspicionScore: number;
  recentActions: { type: string; time: number }[];
}

const playerBehaviors = new Map<string, PlayerBehavior>();

/**
 * Get or create behavior tracking for a player
 */
function getPlayerBehavior(playerId: string): PlayerBehavior {
  let behavior = playerBehaviors.get(playerId);
  if (!behavior) {
    behavior = {
      lastActionTime: 0,
      actionCount: 0,
      suspicionScore: 0,
      recentActions: [],
    };
    playerBehaviors.set(playerId, behavior);
  }
  return behavior;
}

/**
 * Record an action and check for anomalies
 * Returns suspicion score (0-100, higher = more suspicious)
 */
export function recordAction(
  playerId: string,
  actionType: string,
  logger?: nkruntime.Logger
): number {
  const behavior = getPlayerBehavior(playerId);
  const now = Date.now();

  // Calculate time since last action
  const timeSinceLastAction = now - behavior.lastActionTime;

  // Update behavior
  behavior.lastActionTime = now;
  behavior.actionCount++;

  // Keep only last 20 actions
  behavior.recentActions.push({ type: actionType, time: now });
  if (behavior.recentActions.length > 20) {
    behavior.recentActions.shift();
  }

  // Anomaly checks
  let suspicionIncrease = 0;

  // 1. Extremely fast actions (less than 100ms between actions)
  if (timeSinceLastAction > 0 && timeSinceLastAction < 100) {
    suspicionIncrease += 20;
    if (logger) {
      logger.warn(`[AntiCheat] Player ${playerId} made action in ${timeSinceLastAction}ms - possible automation`);
    }
  }

  // 2. Very fast actions (less than 300ms)
  else if (timeSinceLastAction > 0 && timeSinceLastAction < 300) {
    suspicionIncrease += 5;
  }

  // 3. Repetitive actions (same action type repeatedly)
  const recentSameType = behavior.recentActions.filter(a => a.type === actionType);
  if (recentSameType.length >= 5) {
    const last5 = recentSameType.slice(-5);
    const avgInterval = (last5[4].time - last5[0].time) / 4;
    // Very consistent intervals suggest automation
    if (avgInterval > 0 && avgInterval < 1000) {
      suspicionIncrease += 10;
    }
  }

  // 4. Unusual action patterns
  // Check for instant votes (voting immediately when phase changes)
  if (actionType === 'vote' && timeSinceLastAction < 500) {
    suspicionIncrease += 5;
  }

  // Update suspicion score (decay over time)
  const decayAmount = Math.floor((now - behavior.lastActionTime) / 60000); // Decay 1 point per minute
  behavior.suspicionScore = Math.max(0, behavior.suspicionScore - decayAmount + suspicionIncrease);

  // Cap at 100
  behavior.suspicionScore = Math.min(100, behavior.suspicionScore);

  if (behavior.suspicionScore >= 50 && logger) {
    logger.warn(`[AntiCheat] Player ${playerId} has high suspicion score: ${behavior.suspicionScore}`);
  }

  return behavior.suspicionScore;
}

/**
 * Get player's current suspicion score
 */
export function getSuspicionScore(playerId: string): number {
  const behavior = playerBehaviors.get(playerId);
  return behavior?.suspicionScore || 0;
}

/**
 * Clear behavior tracking for a player
 */
export function clearBehaviorTracking(playerId: string): void {
  playerBehaviors.delete(playerId);
}

// ============== Data Validation ==============

/**
 * Validate and sanitize incoming message data
 */
export function sanitizeMessageData(
  data: any,
  expectedFields: string[]
): { valid: boolean; sanitized: any; reason?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, sanitized: null, reason: 'Invalid message format' };
  }

  const sanitized: any = {};

  for (const field of expectedFields) {
    if (field in data) {
      const value = data[field];

      // Type-specific validation
      if (typeof value === 'string') {
        // Limit string length
        sanitized[field] = value.substring(0, 1000);
      } else if (typeof value === 'number') {
        // Check for valid number
        if (!isFinite(value)) {
          return { valid: false, sanitized: null, reason: `Invalid number for field ${field}` };
        }
        sanitized[field] = value;
      } else if (typeof value === 'boolean') {
        sanitized[field] = value;
      } else if (value === null) {
        sanitized[field] = null;
      } else {
        // For complex types, perform basic validation
        sanitized[field] = value;
      }
    }
  }

  return { valid: true, sanitized };
}

/**
 * Validate timestamp is recent (within acceptable window)
 */
export function validateTimestamp(
  timestamp: number,
  maxAgeMs: number = 30000  // 30 seconds default
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAgeMs;
}

// ============== Session Validation ==============

interface SessionInfo {
  userId: string;
  loginTime: number;
  lastActivityTime: number;
  ipAddress?: string;
  reconnectCount: number;
}

const sessionInfos = new Map<string, SessionInfo>();

/**
 * Register a new session
 */
export function registerSession(
  userId: string,
  ipAddress?: string
): void {
  const existing = sessionInfos.get(userId);
  const now = Date.now();

  if (existing) {
    // Track reconnections
    existing.reconnectCount++;
    existing.lastActivityTime = now;
    if (ipAddress) {
      // Check for IP change (potential account sharing)
      if (existing.ipAddress && existing.ipAddress !== ipAddress) {
        // Log but don't block (could be legitimate VPN use)
      }
      existing.ipAddress = ipAddress;
    }
  } else {
    sessionInfos.set(userId, {
      userId,
      loginTime: now,
      lastActivityTime: now,
      ipAddress,
      reconnectCount: 0,
    });
  }
}

/**
 * Update session activity
 */
export function updateSessionActivity(userId: string): void {
  const session = sessionInfos.get(userId);
  if (session) {
    session.lastActivityTime = Date.now();
  }
}

/**
 * Check for suspicious session behavior
 */
export function checkSessionAnomalies(
  userId: string,
  logger?: nkruntime.Logger
): { suspicious: boolean; reason?: string } {
  const session = sessionInfos.get(userId);
  if (!session) {
    return { suspicious: false };
  }

  // Too many reconnections in short time (potential exploit attempt)
  if (session.reconnectCount >= 10) {
    const sessionDuration = Date.now() - session.loginTime;
    const reconnectsPerMinute = (session.reconnectCount / sessionDuration) * 60000;
    if (reconnectsPerMinute > 5) {
      if (logger) {
        logger.warn(`[AntiCheat] Player ${userId} has ${reconnectsPerMinute.toFixed(1)} reconnects/minute`);
      }
      return {
        suspicious: true,
        reason: 'Excessive reconnection attempts',
      };
    }
  }

  return { suspicious: false };
}

/**
 * Clear session info for a player
 */
export function clearSessionInfo(userId: string): void {
  sessionInfos.delete(userId);
}

// ============== Combined Anti-Cheat Check ==============

export interface AntiCheatResult {
  allowed: boolean;
  reason?: string;
  suspicionScore: number;
}

/**
 * Perform comprehensive anti-cheat check for an action
 */
export function checkAction(
  playerId: string,
  opCode: OpCode,
  data: any,
  logger?: nkruntime.Logger
): AntiCheatResult {
  // 1. Rate limit check
  const category = getOpCodeCategory(opCode);
  const rateLimit = checkRateLimit(playerId, category, logger);
  if (rateLimit.blocked) {
    return {
      allowed: false,
      reason: rateLimit.reason,
      suspicionScore: getSuspicionScore(playerId),
    };
  }

  // 2. Record action and check for anomalies
  const actionType = OpCode[opCode] || 'unknown';
  const suspicionScore = recordAction(playerId, actionType, logger);

  // 3. Block if suspicion score is extremely high
  if (suspicionScore >= 80) {
    return {
      allowed: false,
      reason: 'Suspicious activity detected',
      suspicionScore,
    };
  }

  // 4. Session anomaly check
  const sessionCheck = checkSessionAnomalies(playerId, logger);
  if (sessionCheck.suspicious) {
    return {
      allowed: false,
      reason: sessionCheck.reason,
      suspicionScore,
    };
  }

  return {
    allowed: true,
    suspicionScore,
  };
}

/**
 * Clean up all tracking data for a player (call when they leave)
 */
export function cleanupPlayer(playerId: string): void {
  clearRateLimitState(playerId);
  clearBehaviorTracking(playerId);
  clearSessionInfo(playerId);
}
