/**
 * Anti-Cheat Module Tests
 * Tests for rate limiting, action validation, and anomaly detection
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  checkRateLimit,
  clearRateLimitState,
  validateVote,
  validateSkill,
  validateChat,
  recordAction,
  getSuspicionScore,
  clearBehaviorTracking,
  registerSession,
  updateSessionActivity,
  checkSessionAnomalies,
  clearSessionInfo,
  sanitizeMessageData,
  validateTimestamp,
  checkAction,
  cleanupPlayer,
  getOpCodeCategory,
} from '../werewolf/anti-cheat';
import {
  GamePhase,
  GameState,
  Player,
  PlayerStatus,
  Role,
  NightSubPhase,
  OpCode,
  Faction,
  ConnectionStatus,
} from '../werewolf/types';

// Helper to create a minimal logger mock
const createMockLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});

// Helper to create a test player
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    oderId: 'player1',
    displayName: 'TestPlayer',
    seatNumber: 1,
    role: Role.VILLAGER,
    status: PlayerStatus.ALIVE,
    connection: ConnectionStatus.CONNECTED,
    isReady: true,
    votedFor: null,
    ...overrides,
  };
}

// Helper to create a minimal game state
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    matchId: 'test-match',
    phase: GamePhase.WAITING,
    nightSubPhase: null,
    dayNumber: 0,
    players: new Map(),
    spectators: new Map(),
    extendedStates: new Map(),
    config: {
      minPlayers: 6,
      maxPlayers: 12,
      roles: [],
      discussionTime: 120,
      votingTime: 60,
      nightActionTime: 30,
      lastWordsTime: 30,
      allowSheriff: true,
      allowLastWords: true,
    },
    nightActions: [],
    wolfTarget: null,
    wolfVotes: new Map(),
    guardTarget: null,
    seerTarget: null,
    witchSaveTarget: null,
    witchPoisonTarget: null,
    cupidTarget1: null,
    cupidTarget2: null,
    loversLinked: false,
    loversFaction: false,
    votes: new Map(),
    speakingOrder: [],
    currentSpeaker: null,
    sheriffId: null,
    sheriffCampaignCandidates: [],
    sheriffVotes: new Map(),
    sheriffElectionDone: false,
    currentCampaignSpeaker: null,
    campaignSpeakingOrder: [],
    sheriffTransferTarget: null,
    pendingShooters: [],
    currentShooter: null,
    shooterTarget: null,
    previousPhase: null,
    deathSkillDeaths: [],
    lastWordsSpeaker: null,
    lastWordsMessage: null,
    lastWordsDeathCause: null,
    phaseStartTime: Date.now(),
    phaseEndTime: Date.now() + 60000,
    winner: null,
    gameEndReason: null,
    password: null,
    roomName: 'Test Room',
    ...overrides,
  };
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clean up before each test
    clearRateLimitState('player1');
  });

  it('should allow requests within rate limit', () => {
    const result = checkRateLimit('player1', 'chat');
    expect(result.blocked).toBe(false);
  });

  it('should block after exceeding rate limit', () => {
    // Send 5 requests (chat limit is 5 per 3 seconds)
    for (let i = 0; i < 5; i++) {
      checkRateLimit('player1', 'chat');
    }

    // 6th request should be blocked
    const result = checkRateLimit('player1', 'chat');
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Too many requests');
  });

  it('should track different categories separately', () => {
    // Fill up chat limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit('player1', 'chat');
    }

    // Chat should be blocked
    expect(checkRateLimit('player1', 'chat').blocked).toBe(true);

    // But action should still be allowed
    expect(checkRateLimit('player1', 'action').blocked).toBe(false);
  });

  it('should track different players separately', () => {
    // Fill up player1's chat limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit('player1', 'chat');
    }

    // Player1 should be blocked
    expect(checkRateLimit('player1', 'chat').blocked).toBe(true);

    // But player2 should be fine
    clearRateLimitState('player2');
    expect(checkRateLimit('player2', 'chat').blocked).toBe(false);
  });

  it('should clear rate limit state properly', () => {
    // Fill up limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit('player1', 'chat');
    }
    expect(checkRateLimit('player1', 'chat').blocked).toBe(true);

    // Clear and check again
    clearRateLimitState('player1');
    expect(checkRateLimit('player1', 'chat').blocked).toBe(false);
  });
});

describe('OpCode Category Mapping', () => {
  it('should categorize chat messages correctly', () => {
    expect(getOpCodeCategory(OpCode.CHAT_MESSAGE)).toBe('chat');
    expect(getOpCodeCategory(OpCode.WOLF_CHAT)).toBe('chat');
    expect(getOpCodeCategory(OpCode.DEAD_CHAT)).toBe('chat');
  });

  it('should categorize action messages correctly', () => {
    expect(getOpCodeCategory(OpCode.VOTE)).toBe('action');
    expect(getOpCodeCategory(OpCode.USE_SKILL)).toBe('action');
    expect(getOpCodeCategory(OpCode.SHERIFF_VOTE)).toBe('action');
  });

  it('should categorize state messages correctly', () => {
    expect(getOpCodeCategory(OpCode.READY)).toBe('state');
    expect(getOpCodeCategory(OpCode.SHERIFF_CAMPAIGN_JOIN)).toBe('state');
  });
});

describe('Vote Validation', () => {
  it('should allow valid vote during voting phase', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_VOTING });
    const player = createTestPlayer();
    const target = createTestPlayer({ oderId: 'target1' });

    state.players.set(player.oderId, player);
    state.players.set(target.oderId, target);

    const result = validateVote(state, player, 'target1');
    expect(result.valid).toBe(true);
  });

  it('should reject vote outside voting phase', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer();

    const result = validateVote(state, player, 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('voting phase');
  });

  it('should reject vote from dead player', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_VOTING });
    const player = createTestPlayer({ status: PlayerStatus.DEAD });

    const result = validateVote(state, player, 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Dead players');
  });

  it('should reject vote from revealed idiot', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_VOTING });
    const player = createTestPlayer({ role: Role.IDIOT });

    state.extendedStates.set(player.oderId, { idiotRevealed: true });

    const result = validateVote(state, player, 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Revealed idiots');
  });

  it('should reject vote for non-existent target', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_VOTING });
    const player = createTestPlayer();
    state.players.set(player.oderId, player);

    const result = validateVote(state, player, 'nonexistent');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('player not found');
  });

  it('should allow skip vote (null target)', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_VOTING });
    const player = createTestPlayer();
    state.players.set(player.oderId, player);

    const result = validateVote(state, player, null);
    expect(result.valid).toBe(true);
  });
});

describe('Skill Validation', () => {
  it('should allow werewolf skill during werewolf phase', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.WEREWOLF,
    });
    const player = createTestPlayer({ role: Role.WEREWOLF });
    const target = createTestPlayer({ oderId: 'villager1', role: Role.VILLAGER });

    state.players.set(player.oderId, player);
    state.players.set(target.oderId, target);

    const result = validateSkill(state, player, 'kill', 'villager1');
    expect(result.valid).toBe(true);
  });

  it('should reject werewolf targeting another werewolf', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.WEREWOLF,
    });
    const wolf1 = createTestPlayer({ role: Role.WEREWOLF });
    const wolf2 = createTestPlayer({ oderId: 'wolf2', role: Role.WEREWOLF });

    state.players.set(wolf1.oderId, wolf1);
    state.players.set(wolf2.oderId, wolf2);

    const result = validateSkill(state, wolf1, 'kill', 'wolf2');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('fellow werewolves');
  });

  it('should reject seer checking self', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.SEER,
    });
    const seer = createTestPlayer({ role: Role.SEER });
    state.players.set(seer.oderId, seer);

    const result = validateSkill(state, seer, 'check', 'player1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('yourself');
  });

  it('should reject seer checking a dead player', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.SEER,
    });
    const seer = createTestPlayer({ role: Role.SEER });
    const deadWolf = createTestPlayer({
      oderId: 'dead-wolf',
      role: Role.WEREWOLF,
      status: PlayerStatus.DEAD_BY_VOTE,
    });

    state.players.set(seer.oderId, seer);
    state.players.set(deadWolf.oderId, deadWolf);

    const result = validateSkill(state, seer, 'check', 'dead-wolf');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('dead');
  });

  it('should reject witch heal without antidote', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.WITCH,
    });
    const witch = createTestPlayer({ role: Role.WITCH });

    state.players.set(witch.oderId, witch);
    state.extendedStates.set(witch.oderId, {
      witchItems: { hasAntidote: false, hasPoison: true },
    });

    const result = validateSkill(state, witch, 'heal', 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('No antidote');
  });

  it('should reject guard protecting same person twice', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.GUARD,
    });
    const guard = createTestPlayer({ role: Role.GUARD });
    const target = createTestPlayer({ oderId: 'target1' });

    state.players.set(guard.oderId, guard);
    state.players.set(target.oderId, target);
    state.extendedStates.set(guard.oderId, { lastProtectedBy: 'target1' });

    const result = validateSkill(state, guard, 'protect', 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('same player two nights');
  });

  it('should reject skill usage outside night phase', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer({ role: Role.SEER });

    const result = validateSkill(state, player, 'check', 'target1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('night or death skill phase');
  });

  it('should reject cupid on non-first night', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.CUPID,
      dayNumber: 2,
    });
    const cupid = createTestPlayer({ role: Role.CUPID });

    const result = validateSkill(state, cupid, 'link', null);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('first night');
  });
});

describe('Chat Validation', () => {
  it('should allow public chat from alive player during day', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer();

    const result = validateChat(state, player, OpCode.CHAT_MESSAGE, 'Hello!');
    expect(result.valid).toBe(true);
  });

  it('should reject empty messages', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer();

    const result = validateChat(state, player, OpCode.CHAT_MESSAGE, '');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('empty');
  });

  it('should reject too long messages', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer();

    const longMessage = 'a'.repeat(501);
    const result = validateChat(state, player, OpCode.CHAT_MESSAGE, longMessage);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too long');
  });

  it('should reject public chat from dead player', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer({ status: PlayerStatus.DEAD });

    const result = validateChat(state, player, OpCode.CHAT_MESSAGE, 'Hello!');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Dead players');
  });

  it('should allow wolf chat only from werewolves', () => {
    const state = createTestGameState({ phase: GamePhase.NIGHT });
    const wolf = createTestPlayer({ role: Role.WEREWOLF });
    const villager = createTestPlayer({ oderId: 'villager1', role: Role.VILLAGER });

    expect(validateChat(state, wolf, OpCode.WOLF_CHAT, 'Target him!').valid).toBe(true);
    expect(validateChat(state, villager, OpCode.WOLF_CHAT, 'Hello?').valid).toBe(false);
  });

  it('should allow dead chat only from dead players', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const deadPlayer = createTestPlayer({ status: PlayerStatus.DEAD });
    const alivePlayer = createTestPlayer({ oderId: 'alive1' });

    expect(validateChat(state, deadPlayer, OpCode.DEAD_CHAT, 'RIP me').valid).toBe(true);
    expect(validateChat(state, alivePlayer, OpCode.DEAD_CHAT, 'Hello?').valid).toBe(false);
  });
});

describe('Anomaly Detection', () => {
  beforeEach(() => {
    clearBehaviorTracking('player1');
  });

  it('should start with zero suspicion score', () => {
    expect(getSuspicionScore('player1')).toBe(0);
  });

  it('should increase suspicion for very fast actions', () => {
    // Record actions in rapid succession
    recordAction('player1', 'vote');
    // Simulate near-instant action (< 100ms)
    const score = recordAction('player1', 'vote');
    expect(score).toBeGreaterThan(0);
  });

  it('should track different players separately', () => {
    clearBehaviorTracking('player2');

    recordAction('player1', 'vote');
    recordAction('player1', 'vote');

    expect(getSuspicionScore('player2')).toBe(0);
  });

  it('should clear behavior tracking properly', () => {
    recordAction('player1', 'vote');
    recordAction('player1', 'vote');

    expect(getSuspicionScore('player1')).toBeGreaterThan(0);

    clearBehaviorTracking('player1');
    expect(getSuspicionScore('player1')).toBe(0);
  });
});

describe('Session Tracking', () => {
  beforeEach(() => {
    clearSessionInfo('player1');
  });

  it('should register new sessions', () => {
    registerSession('player1', '192.168.1.1');
    updateSessionActivity('player1');

    const anomalies = checkSessionAnomalies('player1');
    expect(anomalies.suspicious).toBe(false);
  });

  it('should track reconnections', () => {
    registerSession('player1');
    registerSession('player1'); // Reconnect
    registerSession('player1'); // Reconnect again

    const anomalies = checkSessionAnomalies('player1');
    // Should not be suspicious with just a few reconnects
    expect(anomalies.suspicious).toBe(false);
  });

  it('should clear session info properly', () => {
    registerSession('player1');
    clearSessionInfo('player1');

    // After clearing, should not detect anomalies
    const anomalies = checkSessionAnomalies('player1');
    expect(anomalies.suspicious).toBe(false);
  });
});

describe('Data Sanitization', () => {
  it('should validate basic message structure', () => {
    const data = { targetId: 'player1', skill: 'check' };
    const result = sanitizeMessageData(data, ['targetId', 'skill']);

    expect(result.valid).toBe(true);
    expect(result.sanitized.targetId).toBe('player1');
    expect(result.sanitized.skill).toBe('check');
  });

  it('should reject non-object data', () => {
    const result = sanitizeMessageData('invalid', ['field']);
    expect(result.valid).toBe(false);
  });

  it('should reject null data', () => {
    const result = sanitizeMessageData(null, ['field']);
    expect(result.valid).toBe(false);
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(2000);
    const result = sanitizeMessageData({ field: longString }, ['field']);

    expect(result.valid).toBe(true);
    expect(result.sanitized.field.length).toBe(1000);
  });

  it('should reject invalid numbers', () => {
    const result = sanitizeMessageData({ count: Infinity }, ['count']);
    expect(result.valid).toBe(false);
  });

  it('should handle null values', () => {
    const result = sanitizeMessageData({ optional: null }, ['optional']);
    expect(result.valid).toBe(true);
    expect(result.sanitized.optional).toBe(null);
  });
});

describe('Timestamp Validation', () => {
  it('should accept recent timestamps', () => {
    const recentTimestamp = Date.now() - 5000; // 5 seconds ago
    expect(validateTimestamp(recentTimestamp)).toBe(true);
  });

  it('should reject old timestamps', () => {
    const oldTimestamp = Date.now() - 60000; // 1 minute ago
    expect(validateTimestamp(oldTimestamp)).toBe(false);
  });

  it('should reject future timestamps', () => {
    const futureTimestamp = Date.now() + 10000; // 10 seconds in future
    expect(validateTimestamp(futureTimestamp)).toBe(false);
  });

  it('should respect custom max age', () => {
    const timestamp = Date.now() - 50000; // 50 seconds ago

    // Should fail with default 30s window
    expect(validateTimestamp(timestamp)).toBe(false);

    // Should pass with 60s window
    expect(validateTimestamp(timestamp, 60000)).toBe(true);
  });
});

describe('Combined Anti-Cheat Check', () => {
  beforeEach(() => {
    cleanupPlayer('player1');
  });

  it('should allow normal actions', () => {
    const result = checkAction('player1', OpCode.READY, {});
    expect(result.allowed).toBe(true);
    expect(result.suspicionScore).toBe(0);
  });

  it('should block after rate limit exceeded', () => {
    // Exceed rate limit
    for (let i = 0; i < 3; i++) {
      checkAction('player1', OpCode.VOTE, {});
    }

    const result = checkAction('player1', OpCode.VOTE, {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Too many requests');
  });

  it('should cleanup player data properly', () => {
    // Generate some state
    checkAction('player1', OpCode.VOTE, {});
    registerSession('player1');
    recordAction('player1', 'test');

    // Cleanup
    cleanupPlayer('player1');

    // Should be clean now
    const result = checkAction('player1', OpCode.VOTE, {});
    expect(result.allowed).toBe(true);
    expect(result.suspicionScore).toBe(0);
  });
});

describe('Edge Cases', () => {
  it('should handle unknown OpCodes gracefully', () => {
    const category = getOpCodeCategory(9999 as OpCode);
    expect(category).toBe('default');
  });

  it('should handle empty player IDs', () => {
    clearRateLimitState('');
    const result = checkRateLimit('', 'chat');
    expect(result.blocked).toBe(false);
  });

  it('should handle whitespace-only messages', () => {
    const state = createTestGameState({ phase: GamePhase.DAY_DISCUSSION });
    const player = createTestPlayer();

    const result = validateChat(state, player, OpCode.CHAT_MESSAGE, '   ');
    expect(result.valid).toBe(false);
  });

  it('should handle missing extended state', () => {
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      nightSubPhase: NightSubPhase.WITCH,
    });
    const witch = createTestPlayer({ role: Role.WITCH });
    state.players.set(witch.oderId, witch);
    // No extended state set

    const result = validateSkill(state, witch, 'heal', 'target1');
    expect(result.valid).toBe(false);
  });
});
