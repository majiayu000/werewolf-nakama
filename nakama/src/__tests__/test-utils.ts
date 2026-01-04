/**
 * Test utilities for Werewolf game logic
 * Provides mock implementations of Nakama runtime API and test helpers
 */

import {
  GamePhase,
  GameState,
  GameConfig,
  Player,
  PlayerStatus,
  ConnectionStatus,
  Role,
  Faction,
  NightSubPhase,
  DEFAULT_GAME_CONFIG,
  PlayerExtendedState,
  OpCode,
  VoteRecord,
  getRoleFaction,
  isWerewolf,
} from '../werewolf/types';

// ============================================================================
// Mock Types
// ============================================================================

export interface MockMessage {
  opCode: OpCode;
  data: unknown;
  recipients: string[] | null; // null = broadcast to all
}

export interface MockDispatcher {
  messages: MockMessage[];
  broadcastMessage: (opCode: number, payload: string, presences: any[] | null, sender: any, reliable: boolean) => void;
}

export interface MockLogger {
  logs: { level: string; message: string }[];
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

// ============================================================================
// Mock Implementations
// ============================================================================

export function createMockDispatcher(): MockDispatcher {
  const messages: MockMessage[] = [];

  return {
    messages,
    broadcastMessage: (opCode: number, payload: string, presences: any[] | null, _sender: any, _reliable: boolean) => {
      const data = JSON.parse(payload);
      const recipients = presences ? presences.map(p => p.userId) : null;
      messages.push({ opCode: opCode as OpCode, data, recipients });
    },
  };
}

export function createMockLogger(): MockLogger {
  const logs: { level: string; message: string }[] = [];

  return {
    logs,
    info: (message: string) => logs.push({ level: 'info', message }),
    warn: (message: string) => logs.push({ level: 'warn', message }),
    error: (message: string) => logs.push({ level: 'error', message }),
    debug: (message: string) => logs.push({ level: 'debug', message }),
  };
}

// ============================================================================
// Test State Helpers
// ============================================================================

let playerIdCounter = 0;

export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  playerIdCounter++;
  const id = `player-${playerIdCounter}`;

  return {
    oderId: overrides.oderId || id,
    odername: overrides.odername || `user${playerIdCounter}`,
    displayName: overrides.displayName || `Player ${playerIdCounter}`,
    seatNumber: overrides.seatNumber || playerIdCounter,
    role: overrides.role || null,
    status: overrides.status || PlayerStatus.ALIVE,
    connection: overrides.connection || ConnectionStatus.CONNECTED,
    isReady: overrides.isReady ?? true,
    votedFor: overrides.votedFor || null,
    lastAction: overrides.lastAction || Date.now(),
    isSpectator: overrides.isSpectator || false,
  };
}

export function createTestExtendedState(playerId: string, overrides: Partial<PlayerExtendedState> = {}): PlayerExtendedState {
  return {
    playerId,
    isProtected: overrides.isProtected || false,
    lastProtectedBy: overrides.lastProtectedBy || null,
    idiotRevealed: overrides.idiotRevealed || false,
    isLovers: overrides.isLovers || false,
    loverId: overrides.loverId || null,
    witchItems: overrides.witchItems,
  };
}

export function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    matchId: overrides.matchId || 'test-match-1',
    phase: overrides.phase || GamePhase.NIGHT,
    nightSubPhase: overrides.nightSubPhase || NightSubPhase.WEREWOLF,
    dayNumber: overrides.dayNumber || 1,
    players: overrides.players || new Map<string, Player>(),
    spectators: overrides.spectators || new Map(),
    extendedStates: overrides.extendedStates || new Map<string, PlayerExtendedState>(),
    config: overrides.config || { ...DEFAULT_GAME_CONFIG },
    nightActions: overrides.nightActions || [],
    wolfTarget: overrides.wolfTarget || null,
    wolfVotes: overrides.wolfVotes || new Map<string, string>(),
    guardTarget: overrides.guardTarget || null,
    seerTarget: overrides.seerTarget || null,
    witchSaveTarget: overrides.witchSaveTarget || null,
    witchPoisonTarget: overrides.witchPoisonTarget || null,
    cupidTarget1: overrides.cupidTarget1 || null,
    cupidTarget2: overrides.cupidTarget2 || null,
    loversLinked: overrides.loversLinked || false,
    loversFaction: overrides.loversFaction || false,
    votes: overrides.votes || new Map(),
    speakingOrder: overrides.speakingOrder || [],
    currentSpeaker: overrides.currentSpeaker || null,
    sheriffId: overrides.sheriffId || null,
    sheriffCampaignCandidates: overrides.sheriffCampaignCandidates || [],
    sheriffVotes: overrides.sheriffVotes || new Map(),
    sheriffElectionDone: overrides.sheriffElectionDone || false,
    currentCampaignSpeaker: overrides.currentCampaignSpeaker || null,
    campaignSpeakingOrder: overrides.campaignSpeakingOrder || [],
    sheriffTransferTarget: overrides.sheriffTransferTarget || null,
    pendingShooters: overrides.pendingShooters || [],
    currentShooter: overrides.currentShooter || null,
    shooterTarget: overrides.shooterTarget || null,
    previousPhase: overrides.previousPhase || null,
    deathSkillDeaths: overrides.deathSkillDeaths || [],
    lastWordsSpeaker: overrides.lastWordsSpeaker || null,
    lastWordsMessage: overrides.lastWordsMessage || null,
    lastWordsDeathCause: overrides.lastWordsDeathCause || null,
    phaseStartTime: overrides.phaseStartTime || Date.now(),
    phaseEndTime: overrides.phaseEndTime || Date.now() + 30000,
    winner: overrides.winner || null,
    gameEndReason: overrides.gameEndReason || null,
    password: overrides.password || null,
    roomName: overrides.roomName || 'Test Room',
  };
}

export function resetPlayerIdCounter(): void {
  playerIdCounter = 0;
}

// ============================================================================
// Game Setup Helpers
// ============================================================================

export interface GameSetupOptions {
  playerCount?: number;
  roles?: Role[];
  phase?: GamePhase;
  nightSubPhase?: NightSubPhase | null;
  dayNumber?: number;
}

export function setupTestGame(options: GameSetupOptions = {}): {
  state: GameState;
  dispatcher: MockDispatcher;
  logger: MockLogger;
  players: Player[];
} {
  resetPlayerIdCounter();

  const playerCount = options.playerCount || 6;
  const roles = options.roles || [
    Role.WEREWOLF, Role.WEREWOLF,
    Role.SEER,
    Role.HUNTER,
    Role.VILLAGER, Role.VILLAGER,
  ];

  const players: Player[] = [];
  const playersMap = new Map<string, Player>();
  const extendedStates = new Map<string, PlayerExtendedState>();

  for (let i = 0; i < playerCount; i++) {
    const player = createTestPlayer({
      role: roles[i] || Role.VILLAGER,
      seatNumber: i + 1,
    });
    players.push(player);
    playersMap.set(player.oderId, player);

    // Create extended state
    const extState = createTestExtendedState(player.oderId);
    // Add witch items if role is witch
    if (roles[i] === Role.WITCH) {
      extState.witchItems = { hasAntidote: true, hasPoison: true };
    }
    extendedStates.set(player.oderId, extState);
  }

  const state = createTestGameState({
    players: playersMap,
    extendedStates,
    phase: options.phase ?? GamePhase.NIGHT,
    nightSubPhase: options.nightSubPhase ?? NightSubPhase.WEREWOLF,
    dayNumber: options.dayNumber ?? 1,
  });

  const dispatcher = createMockDispatcher();
  const logger = createMockLogger();

  return { state, dispatcher, logger, players };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export function findMessageByOpCode(dispatcher: MockDispatcher, opCode: OpCode): MockMessage | undefined {
  return dispatcher.messages.find(m => m.opCode === opCode);
}

export function findAllMessagesByOpCode(dispatcher: MockDispatcher, opCode: OpCode): MockMessage[] {
  return dispatcher.messages.filter(m => m.opCode === opCode);
}

export function getPlayerByRole(players: Player[], role: Role): Player | undefined {
  return players.find(p => p.role === role);
}

export function getPlayersByRole(players: Player[], role: Role): Player[] {
  return players.filter(p => p.role === role);
}

export function getAlivePlayers(state: GameState): Player[] {
  return Array.from(state.players.values()).filter(p => p.status === PlayerStatus.ALIVE);
}

export function getAliveWerewolves(state: GameState): Player[] {
  return getAlivePlayers(state).filter(p => p.role && isWerewolf(p.role));
}

export function getAliveVillagers(state: GameState): Player[] {
  return getAlivePlayers(state).filter(p => p.role && !isWerewolf(p.role));
}

// ============================================================================
// Game Logic Helpers (Reimplemented for Testing)
// These mirror the match_handler.ts logic for isolated testing
// ============================================================================

export function checkWinCondition(state: GameState): Faction | null {
  const alivePlayers = getAlivePlayers(state);
  const aliveWolves = getAliveWerewolves(state);
  const aliveVillagers = getAliveVillagers(state);

  // Check lovers win condition first
  if (state.loversLinked && state.loversFaction) {
    const lover1Id = state.cupidTarget1;
    const lover2Id = state.cupidTarget2;
    if (lover1Id && lover2Id) {
      const lover1 = state.players.get(lover1Id);
      const lover2 = state.players.get(lover2Id);

      if (lover1?.status === PlayerStatus.ALIVE && lover2?.status === PlayerStatus.ALIVE) {
        const nonLoverAlive = alivePlayers.filter(p =>
          p.oderId !== lover1Id && p.oderId !== lover2Id
        );
        if (nonLoverAlive.length === 0) {
          return Faction.LOVERS;
        }
      }
    }
  }

  // Werewolves win if they equal or outnumber villagers
  if (aliveWolves.length >= aliveVillagers.length) {
    return Faction.WEREWOLF;
  }

  // Villagers win if all werewolves are dead
  if (aliveWolves.length === 0) {
    return Faction.VILLAGER;
  }

  return null;
}

export function canUseDeathSkill(player: Player, deathCause: PlayerStatus): boolean {
  // Hunter can shoot when dying (except when poisoned)
  if (player.role === Role.HUNTER) {
    if (deathCause === PlayerStatus.DEAD_BY_POISON) {
      return false;
    }
    return true;
  }

  // Alpha Wolf can shoot when dying
  if (player.role === Role.ALPHA_WOLF) {
    return true;
  }

  return false;
}

export function processWolfKill(
  state: GameState,
  targetId: string
): { killed: Player | null; savedByGuard: boolean } {
  const target = state.players.get(targetId);
  if (!target || target.status !== PlayerStatus.ALIVE) {
    return { killed: null, savedByGuard: false };
  }

  // Check if target is protected by guard
  const targetExt = state.extendedStates.get(targetId);
  if (targetExt?.isProtected) {
    return { killed: null, savedByGuard: true };
  }

  // Kill the target
  target.status = PlayerStatus.DEAD_BY_WOLF;
  return { killed: target, savedByGuard: false };
}

export function processWitchHeal(
  state: GameState,
  targetId: string
): boolean {
  const target = state.players.get(targetId);
  if (!target) return false;

  // Can only heal someone who was killed by wolves
  if (target.status !== PlayerStatus.DEAD_BY_WOLF) {
    return false;
  }

  // Revive the target
  target.status = PlayerStatus.ALIVE;
  return true;
}

export function processWitchPoison(
  state: GameState,
  targetId: string
): Player | null {
  const target = state.players.get(targetId);
  if (!target || target.status !== PlayerStatus.ALIVE) {
    return null;
  }

  target.status = PlayerStatus.DEAD_BY_POISON;
  return target;
}

export function processSeerCheck(
  state: GameState,
  targetId: string
): Faction | null {
  const target = state.players.get(targetId);
  if (!target || !target.role) return null;

  return getRoleFaction(target.role);
}

// ============================================================================
// Game Flow Helpers (For Integration Testing)
// ============================================================================

/**
 * Simulate the night phase completion
 */
export function simulateNightPhase(
  state: GameState,
  actions: {
    wolfTarget?: string;
    guardTarget?: string;
    seerTarget?: string;
    witchSave?: boolean;
    witchPoisonTarget?: string;
  }
): {
  deaths: string[];
  savedByGuard: boolean;
  savedByWitch: boolean;
  poisonedPlayer: string | null;
} {
  const result = {
    deaths: [] as string[],
    savedByGuard: false,
    savedByWitch: false,
    poisonedPlayer: null as string | null,
  };

  // 1. Apply guard protection
  if (actions.guardTarget) {
    const guardExt = state.extendedStates.get(actions.guardTarget);
    if (guardExt) {
      guardExt.isProtected = true;
    }
    state.guardTarget = actions.guardTarget;
  }

  // 2. Process wolf kill
  if (actions.wolfTarget) {
    state.wolfTarget = actions.wolfTarget;
    const target = state.players.get(actions.wolfTarget);
    const targetExt = state.extendedStates.get(actions.wolfTarget);

    if (target && target.status === PlayerStatus.ALIVE) {
      if (targetExt?.isProtected) {
        result.savedByGuard = true;
      } else {
        // Mark as killed by wolf (can still be saved by witch)
        target.status = PlayerStatus.DEAD_BY_WOLF;
        result.deaths.push(actions.wolfTarget);
      }
    }
  }

  // 3. Process witch actions
  if (actions.witchSave && state.wolfTarget) {
    const target = state.players.get(state.wolfTarget);
    if (target && target.status === PlayerStatus.DEAD_BY_WOLF) {
      target.status = PlayerStatus.ALIVE;
      result.savedByWitch = true;
      result.deaths = result.deaths.filter(id => id !== state.wolfTarget);
      state.witchSaveTarget = state.wolfTarget;

      // Mark witch as used antidote
      const witch = Array.from(state.players.values()).find(p => p.role === Role.WITCH);
      if (witch) {
        const witchExt = state.extendedStates.get(witch.oderId);
        if (witchExt?.witchItems) {
          witchExt.witchItems.hasAntidote = false;
        }
      }
    }
  }

  if (actions.witchPoisonTarget) {
    const target = state.players.get(actions.witchPoisonTarget);
    if (target && target.status === PlayerStatus.ALIVE) {
      target.status = PlayerStatus.DEAD_BY_POISON;
      result.deaths.push(actions.witchPoisonTarget);
      result.poisonedPlayer = actions.witchPoisonTarget;
      state.witchPoisonTarget = actions.witchPoisonTarget;

      // Mark witch as used poison
      const witch = Array.from(state.players.values()).find(p => p.role === Role.WITCH);
      if (witch) {
        const witchExt = state.extendedStates.get(witch.oderId);
        if (witchExt?.witchItems) {
          witchExt.witchItems.hasPoison = false;
        }
      }
    }
  }

  // 4. Clear guard protection for next night
  for (const [, ext] of state.extendedStates) {
    ext.isProtected = false;
  }

  return result;
}

/**
 * Count votes and determine elimination result
 */
export function countVotes(
  state: GameState
): {
  voteCount: Map<string, number>;
  eliminated: string | null;
  isTie: boolean;
} {
  const voteCount = new Map<string, number>();

  for (const [voterId, record] of state.votes) {
    if (record.targetId) {
      const voter = state.players.get(voterId);
      const voterExt = state.extendedStates.get(voterId);

      // Skip revealed idiots
      if (voterExt?.idiotRevealed) continue;
      if (!voter || voter.status !== PlayerStatus.ALIVE) continue;

      // Sheriff has 1.5 votes
      const voteWeight = state.sheriffId === voterId ? 1.5 : 1;
      const current = voteCount.get(record.targetId) || 0;
      voteCount.set(record.targetId, current + voteWeight);
    }
  }

  // Find max votes
  let maxVotes = 0;
  let maxVotedPlayers: string[] = [];

  for (const [playerId, count] of voteCount) {
    if (count > maxVotes) {
      maxVotes = count;
      maxVotedPlayers = [playerId];
    } else if (count === maxVotes) {
      maxVotedPlayers.push(playerId);
    }
  }

  // Determine result
  if (maxVotedPlayers.length === 0 || maxVotes === 0) {
    return { voteCount, eliminated: null, isTie: true };
  }

  if (maxVotedPlayers.length === 1) {
    return { voteCount, eliminated: maxVotedPlayers[0], isTie: false };
  }

  // Tie - no elimination
  return { voteCount, eliminated: null, isTie: true };
}

/**
 * Simulate voting phase
 */
export function simulateVoting(
  state: GameState,
  votes: Map<string, string | null>
): { eliminated: string | null; isTie: boolean } {
  // Record votes
  for (const [voterId, targetId] of votes) {
    state.votes.set(voterId, {
      voterId,
      targetId,
      timestamp: Date.now(),
    });
  }

  const result = countVotes(state);

  // Apply elimination
  if (result.eliminated) {
    const target = state.players.get(result.eliminated);
    const targetExt = state.extendedStates.get(result.eliminated);

    if (target) {
      // Check if idiot
      if (target.role === Role.IDIOT && targetExt && !targetExt.idiotRevealed) {
        targetExt.idiotRevealed = true;
        // Idiot survives but loses voting rights
        return { eliminated: null, isTie: false };
      }

      target.status = PlayerStatus.DEAD_BY_VOTE;
    }
  }

  return { eliminated: result.eliminated, isTie: result.isTie };
}

/**
 * Process lover death (one lover dies, the other follows)
 */
export function processLoverDeath(
  state: GameState,
  deadPlayerId: string
): string | null {
  if (!state.loversLinked) return null;

  const deadPlayer = state.players.get(deadPlayerId);
  if (!deadPlayer || deadPlayer.status === PlayerStatus.ALIVE) return null;

  const deadExt = state.extendedStates.get(deadPlayerId);
  if (!deadExt?.isLovers || !deadExt.loverId) return null;

  const lover = state.players.get(deadExt.loverId);
  if (lover && lover.status === PlayerStatus.ALIVE) {
    lover.status = PlayerStatus.DEAD_BY_LOVER;
    return deadExt.loverId;
  }

  return null;
}

/**
 * Transition game phase
 */
export function transitionPhase(
  state: GameState,
  newPhase: GamePhase,
  options: {
    nightSubPhase?: NightSubPhase;
    incrementDay?: boolean;
  } = {}
): void {
  state.phase = newPhase;

  if (options.nightSubPhase !== undefined) {
    state.nightSubPhase = options.nightSubPhase;
  } else if (newPhase === GamePhase.NIGHT) {
    state.nightSubPhase = NightSubPhase.WEREWOLF;
  } else {
    state.nightSubPhase = null;
  }

  if (options.incrementDay) {
    state.dayNumber++;
  }

  // Reset phase-specific state
  if (newPhase === GamePhase.NIGHT) {
    state.wolfTarget = null;
    state.wolfVotes.clear();
    state.guardTarget = null;
    state.seerTarget = null;
    state.witchSaveTarget = null;
    state.witchPoisonTarget = null;
  } else if (newPhase === GamePhase.DAY_VOTING) {
    state.votes.clear();
  }

  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 30000;
}

/**
 * Get all players who can use death skills
 */
export function getPendingShooters(
  state: GameState,
  recentDeaths: string[]
): string[] {
  const shooters: string[] = [];

  for (const playerId of recentDeaths) {
    const player = state.players.get(playerId);
    if (!player || !player.role) continue;

    if (canUseDeathSkill(player, player.status)) {
      shooters.push(playerId);
    }
  }

  return shooters;
}

/**
 * Simulate a complete game turn (night + day)
 */
export function simulateGameTurn(
  state: GameState,
  nightActions: {
    wolfTarget?: string;
    guardTarget?: string;
    seerTarget?: string;
    witchSave?: boolean;
    witchPoisonTarget?: string;
  },
  dayVotes: Map<string, string | null>
): {
  nightDeaths: string[];
  dayEliminated: string | null;
  gameWinner: Faction | null;
} {
  // Night phase
  transitionPhase(state, GamePhase.NIGHT);
  const nightResult = simulateNightPhase(state, nightActions);

  // Check for lover deaths
  for (const deadId of [...nightResult.deaths]) {
    const loverDeath = processLoverDeath(state, deadId);
    if (loverDeath) {
      nightResult.deaths.push(loverDeath);
    }
  }

  // Check win condition after night
  let winner = checkWinCondition(state);
  if (winner) {
    return {
      nightDeaths: nightResult.deaths,
      dayEliminated: null,
      gameWinner: winner,
    };
  }

  // Day phase
  transitionPhase(state, GamePhase.DAY_VOTING);
  const dayResult = simulateVoting(state, dayVotes);

  // Check for lover death
  if (dayResult.eliminated) {
    const loverDeath = processLoverDeath(state, dayResult.eliminated);
    if (loverDeath) {
      // Lover also dies
    }
  }

  // Check win condition after day
  winner = checkWinCondition(state);

  return {
    nightDeaths: nightResult.deaths,
    dayEliminated: dayResult.eliminated,
    gameWinner: winner,
  };
}
