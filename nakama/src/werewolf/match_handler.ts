/**
 * Werewolf Match Handler
 * Core game logic for the werewolf/mafia game
 */

import {
  GamePhase,
  GameState,
  GameConfig,
  Player,
  Spectator,
  PlayerStatus,
  ConnectionStatus,
  OpCode,
  Role,
  Faction,
  NightSubPhase,
  NightAction,
  VoteRecord,
  DEFAULT_GAME_CONFIG,
  PRESET_CONFIGS,
  getRoleFaction,
  getFinalGuardActionsByPlayer,
  computePlayerFactionSize,
  isWerewolf,
  PlayerExtendedState,
} from './types';
import { compressMessage, compressPlayerList } from './message-compress';
import {
  checkAction,
  checkRateLimit,
  validateVote,
  validateSkill,
  validateChat,
  sanitizeMessageData,
  registerSession,
  updateSessionActivity,
  cleanupPlayer,
  getSuspicionScore,
} from './anti-cheat';
import { logger as gameLogger, LogCategory, startTimer } from './logger';
import { metrics, MetricNames, createMatchMetrics, MatchMetrics } from './metrics';
import { createGameEventLogger, GameEventLogger, GameEventType } from './game-events';
import {
  ReplayBuffer, ReplayPlayer, ReplayConfig, saveReplay, createReplayBuffer
} from './replay';
import { applyGameResultStats } from './game-result';

// Match-specific loggers and metrics storage
const matchLoggers = new Map<string, GameEventLogger>();
const matchReplayBuffers = new Map<string, ReplayBuffer>();

// Get or create a logger for a match
function getMatchLogger(matchId: string): GameEventLogger {
  let eventLogger = matchLoggers.get(matchId);
  if (!eventLogger) {
    eventLogger = createGameEventLogger(matchId);
    matchLoggers.set(matchId, eventLogger);
  }
  return eventLogger;
}

// Get or create a replay buffer for a match
function getReplayBuffer(matchId: string): ReplayBuffer {
  let buffer = matchReplayBuffers.get(matchId);
  if (!buffer) {
    buffer = createReplayBuffer(matchId);
    matchReplayBuffers.set(matchId, buffer);
  }
  return buffer;
}

// Clean up logger when match ends
function cleanupMatchLogger(matchId: string): void {
  const eventLogger = matchLoggers.get(matchId);
  if (eventLogger) {
    eventLogger.flush();
    matchLoggers.delete(matchId);
  }
}

// Clean up replay buffer when match ends
function cleanupReplayBuffer(matchId: string): void {
  matchReplayBuffers.delete(matchId);
}

// Tick rate: 1 tick per second
const TICK_RATE = 1;

// Match label interface for Nakama
interface MatchLabel {
  phase: GamePhase;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
  roomName: string;
  isPrivate: boolean;  // Whether room requires password
  settings: Partial<GameConfig>;
}

/**
 * Create initial game state
 */
function createInitialState(matchId: string, params: { [key: string]: string }): GameState {
  const config: GameConfig = {
    ...DEFAULT_GAME_CONFIG,
  };

  // Parse custom settings from params
  if (params.minPlayers) config.minPlayers = parseInt(params.minPlayers);
  if (params.maxPlayers) config.maxPlayers = parseInt(params.maxPlayers);
  if (params.discussionTime) config.discussionTime = parseInt(params.discussionTime);
  if (params.votingTime) config.votingTime = parseInt(params.votingTime);
  if (params.nightActionTime) config.nightActionTime = parseInt(params.nightActionTime);
  if (params.lastWordsTime) config.lastWordsTime = parseInt(params.lastWordsTime);
  if (params.allowSheriff) config.allowSheriff = params.allowSheriff === 'true';
  if (params.allowLastWords) config.allowLastWords = params.allowLastWords === 'true';

  // Parse custom role configuration
  if (params.roles) {
    try {
      const rolesArray = JSON.parse(params.roles);
      if (Array.isArray(rolesArray) && rolesArray.length > 0) {
        config.roles = rolesArray as Role[];
      }
    } catch {
      // Keep default roles if parsing fails
    }
  }

  // Parse password (null means public room)
  const password = params.password && params.password.trim().length > 0
    ? params.password.trim()
    : null;

  // Parse room name
  const roomName = params.roomName || `${params.creatorUsername || 'Unknown'}的房间`;

  return {
    matchId,
    phase: GamePhase.WAITING,
    nightSubPhase: null,
    dayNumber: 0,
    players: new Map<string, Player>(),
    spectators: new Map<string, Spectator>(),
    extendedStates: new Map<string, PlayerExtendedState>(),
    config,
    nightActions: [],
    wolfTarget: null,
    wolfVotes: new Map<string, string>(),
    guardTarget: null,
    seerTarget: null,
    witchSaveTarget: null,
    witchPoisonTarget: null,
    // 丘比特/情侣相关
    cupidTarget1: null,
    cupidTarget2: null,
    loversLinked: false,
    loversFaction: false,
    votes: new Map<string, VoteRecord>(),
    speakingOrder: [],
    currentSpeaker: null,
    // 警长系统相关
    sheriffId: null,
    sheriffCampaignCandidates: [],
    sheriffVotes: new Map<string, string>(),
    sheriffElectionDone: false,
    currentCampaignSpeaker: null,
    campaignSpeakingOrder: [],
    sheriffTransferTarget: null,
    // 死亡技能相关
    pendingShooters: [],
    currentShooter: null,
    shooterTarget: null,
    previousPhase: null,
    deathSkillDeaths: [],
    // 遗言相关
    lastWordsSpeaker: null,
    lastWordsMessage: null,
    lastWordsDeathCause: null,
    phaseStartTime: Date.now(),
    phaseEndTime: Date.now() + 300000, // 5 minutes default
    winner: null,
    gameEndReason: null,
    pendingStatsRecord: false,
    // 私密房间相关
    password,
    roomName,
  };
}

/**
 * Get match label for display
 */
function getMatchLabel(state: GameState, hostName: string): string {
  // Count roles for summary
  const roleCount: Record<string, number> = {};
  if (state.config.roles) {
    for (const role of state.config.roles) {
      roleCount[role] = (roleCount[role] || 0) + 1;
    }
  }

  const label: MatchLabel = {
    phase: state.phase,
    playerCount: state.players.size,
    maxPlayers: state.config.maxPlayers,
    hostName,
    roomName: state.roomName,
    isPrivate: state.password !== null,  // Don't expose actual password, just if it's private
    settings: {
      minPlayers: state.config.minPlayers,
      maxPlayers: state.config.maxPlayers,
      roles: state.config.roles,
      discussionTime: state.config.discussionTime,
      votingTime: state.config.votingTime,
      allowSheriff: state.config.allowSheriff,
      allowLastWords: state.config.allowLastWords,
    },
  };
  return JSON.stringify(label);
}

// 是否启用消息压缩（可通过环境变量控制）
const ENABLE_COMPRESSION = true;

/**
 * Broadcast message to all players
 * 使用压缩减少网络传输量
 */
function broadcastMessage(
  dispatcher: nkruntime.MatchDispatcher,
  opCode: OpCode,
  data: any,
  presences?: nkruntime.Presence[],
  sender?: nkruntime.Presence
): void {
  const compressedData = ENABLE_COMPRESSION ? compressMessage(data) : data;
  const payload = JSON.stringify(compressedData);
  dispatcher.broadcastMessage(opCode, payload, presences || null, sender || null, true);
}

/**
 * Send message to specific player
 * 使用压缩减少网络传输量
 */
function sendToPlayer(
  dispatcher: nkruntime.MatchDispatcher,
  opCode: OpCode,
  data: any,
  presence: nkruntime.Presence
): void {
  const compressedData = ENABLE_COMPRESSION ? compressMessage(data) : data;
  const payload = JSON.stringify(compressedData);
  dispatcher.broadcastMessage(opCode, payload, [presence], null, true);
}

/**
 * Send full game state to spectator (includes all roles and hidden info)
 */
function sendSpectatorFullState(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  presence: nkruntime.Presence
): void {
  // Build complete player info with roles visible
  const playersWithRoles = Array.from(state.players.values()).map(p => {
    const extState = state.extendedStates.get(p.oderId);
    return {
      id: p.oderId,
      name: p.displayName,
      seatNumber: p.seatNumber,
      role: p.role, // Spectators can see all roles!
      faction: p.role ? getRoleFaction(p.role) : null,
      status: p.status,
      isReady: p.isReady,
      connection: p.connection,
      votedFor: p.votedFor,
      isLovers: extState?.isLovers || false,
      loverId: extState?.loverId || null,
      idiotRevealed: extState?.idiotRevealed || false,
      witchItems: extState?.witchItems || null,
    };
  });

  // Build spectator list
  const spectatorList = Array.from(state.spectators.values()).map(s => ({
    id: s.oderId,
    name: s.displayName,
    joinedAt: s.joinedAt,
  }));

  // Night actions info (visible to spectators)
  const nightInfo = {
    wolfTarget: state.wolfTarget,
    guardTarget: state.guardTarget,
    seerTarget: state.seerTarget,
    witchSaveTarget: state.witchSaveTarget,
    witchPoisonTarget: state.witchPoisonTarget,
  };

  // Send full state to spectator
  sendToPlayer(dispatcher, OpCode.SPECTATOR_FULL_STATE, {
    isSpectator: true,
    phase: state.phase,
    nightSubPhase: state.nightSubPhase,
    dayNumber: state.dayNumber,
    players: playersWithRoles,
    spectators: spectatorList,
    nightInfo,
    sheriffId: state.sheriffId,
    phaseStartTime: state.phaseStartTime,
    phaseEndTime: state.phaseEndTime,
    currentShooter: state.currentShooter,
    lastWordsSpeaker: state.lastWordsSpeaker,
    votes: Array.from(state.votes.entries()).map(([voterId, vote]) => ({
      voterId,
      targetId: vote.targetId,
    })),
    loversLinked: state.loversLinked,
    loversFaction: state.loversFaction,
  }, presence);
}

/**
 * Get all spectator presences
 */
function getSpectatorPresences(state: GameState): nkruntime.Presence[] {
  return Array.from(state.spectators.values()).map(s => ({
    userId: s.oderId,
    sessionId: '',
    username: s.odername,
    node: '',
  }));
}

/**
 * Send message to all spectators
 */
function broadcastToSpectators(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  opCode: OpCode,
  data: any
): void {
  const spectatorPresences = getSpectatorPresences(state);
  if (spectatorPresences.length > 0) {
    const payload = JSON.stringify(data);
    dispatcher.broadcastMessage(opCode, payload, spectatorPresences, null, true);
  }
}

/**
 * Get alive players
 */
function getAlivePlayers(state: GameState): Player[] {
  return Array.from(state.players.values()).filter(p => p.status === PlayerStatus.ALIVE);
}

/**
 * Get alive werewolves
 */
function getAliveWerewolves(state: GameState): Player[] {
  return getAlivePlayers(state).filter(p => p.role && isWerewolf(p.role));
}

/**
 * Get alive villagers (non-werewolves)
 */
function getAliveVillagers(state: GameState): Player[] {
  return getAlivePlayers(state).filter(p => p.role && !isWerewolf(p.role));
}

/**
 * Check win conditions
 */
function checkWinCondition(state: GameState): Faction | null {
  const alivePlayers = getAlivePlayers(state);
  const aliveWolves = getAliveWerewolves(state);
  const aliveVillagers = getAliveVillagers(state);

  // Check lovers win condition first (special case)
  // Lovers win if: both are alive, from different factions, and they are the only survivors
  const loverIds = getLoverIds(state);
  if (loverIds && areLoversFromDifferentFactions(state)) {
    const [lover1Id, lover2Id] = loverIds;
    const lover1 = state.players.get(lover1Id);
    const lover2 = state.players.get(lover2Id);

    // Both lovers must be alive
    if (lover1?.status === PlayerStatus.ALIVE && lover2?.status === PlayerStatus.ALIVE) {
      // Check if only lovers remain alive
      const nonLoverAlive = alivePlayers.filter(p =>
        p.oderId !== lover1Id && p.oderId !== lover2Id
      );

      if (nonLoverAlive.length === 0) {
        return Faction.LOVERS;
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

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Check if both lovers are alive
 */
function areLoversAlive(state: GameState): boolean {
  for (const [playerId, extState] of state.extendedStates) {
    if (extState.isLovers && extState.loverId) {
      const player = state.players.get(playerId);
      const lover = state.players.get(extState.loverId);
      if (player?.status === PlayerStatus.ALIVE && lover?.status === PlayerStatus.ALIVE) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the lover IDs if they exist
 */
function getLoverIds(state: GameState): [string, string] | null {
  for (const [playerId, extState] of state.extendedStates) {
    if (extState.isLovers && extState.loverId) {
      return [playerId, extState.loverId];
    }
  }
  return null;
}

/**
 * Check if lovers are from different factions (can win together)
 */
function areLoversFromDifferentFactions(state: GameState): boolean {
  const loverIds = getLoverIds(state);
  if (!loverIds) return false;

  const [lover1Id, lover2Id] = loverIds;
  const lover1 = state.players.get(lover1Id);
  const lover2 = state.players.get(lover2Id);

  if (!lover1?.role || !lover2?.role) return false;

  const faction1 = getRoleFaction(lover1.role);
  const faction2 = getRoleFaction(lover2.role);

  // Cupid is neutral, consider them as villager faction for this check
  const effectiveFaction1 = faction1 === Faction.NEUTRAL ? Faction.VILLAGER : faction1;
  const effectiveFaction2 = faction2 === Faction.NEUTRAL ? Faction.VILLAGER : faction2;

  return effectiveFaction1 !== effectiveFaction2;
}

/**
 * Process lover death (trigger partner's death)
 * Returns the partner who died from grief, or null if no lover died
 */
function processLoverDeath(
  state: GameState,
  deadPlayerId: string,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): Player | null {
  const deadPlayerExt = state.extendedStates.get(deadPlayerId);

  // Check if dead player is a lover
  if (!deadPlayerExt?.isLovers || !deadPlayerExt.loverId) {
    return null;
  }

  const loverId = deadPlayerExt.loverId;
  const lover = state.players.get(loverId);

  // Check if partner is still alive
  if (!lover || lover.status !== PlayerStatus.ALIVE) {
    return null;
  }

  // Partner dies from grief
  lover.status = PlayerStatus.DEAD_BY_LOVER;
  logger.info(`${lover.displayName} died from grief (lover death)`);

  // Broadcast lover death
  broadcastMessage(dispatcher, OpCode.LOVER_DEATH, {
    deadLoverId: deadPlayerId,
    deadLoverName: state.players.get(deadPlayerId)?.displayName,
    dyingLoverId: loverId,
    dyingLoverName: lover.displayName,
    message: `${lover.displayName} 因情侣殉情而死亡`,
  });

  return lover;
}

/**
 * Check if a player can use death skill (Hunter or Alpha Wolf)
 */
function canUseDeathSkill(player: Player, deathCause: PlayerStatus): boolean {
  // Hunter can always shoot when dying (except when poisoned by witch)
  if (player.role === Role.HUNTER) {
    // Hunter cannot shoot if poisoned (the poison silences them)
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

/**
 * Check for pending death skills and transition to death skill phase if needed
 * Returns true if death skill phase was entered
 */
function checkAndEnterDeathSkillPhase(
  state: GameState,
  deadPlayers: { playerId: string; cause: PlayerStatus }[],
  returnPhase: GamePhase,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): boolean {
  // Find players who can use death skill
  const shooters: string[] = [];

  for (const death of deadPlayers) {
    const player = state.players.get(death.playerId);
    if (player && canUseDeathSkill(player, death.cause)) {
      shooters.push(death.playerId);
      logger.info(`${player.displayName} (${player.role}) can use death skill`);
    }
  }

  if (shooters.length === 0) {
    return false;
  }

  // Enter death skill phase
  state.pendingShooters = shooters;
  state.previousPhase = returnPhase;
  state.deathSkillDeaths = [];

  // Start with first shooter
  startNextShooter(state, dispatcher, logger);

  return true;
}

/**
 * Start the next shooter's turn
 */
function startNextShooter(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.pendingShooters.length === 0) {
    // No more shooters, return to previous phase flow
    finishDeathSkillPhase(state, dispatcher, logger);
    return;
  }

  const shooterId = state.pendingShooters.shift()!;
  state.currentShooter = shooterId;
  state.shooterTarget = null;
  state.phase = GamePhase.DEATH_SKILL;
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 15000; // 15 seconds to choose target

  const shooter = state.players.get(shooterId);

  // Notify all players about death skill phase
  broadcastMessage(dispatcher, OpCode.DEATH_SKILL_PROMPT, {
    shooterId,
    shooterName: shooter?.displayName,
    shooterRole: shooter?.role,
    duration: 15,
  });

  logger.info(`Death skill phase: ${shooter?.displayName} is choosing target`);
}

/**
 * Process shooter's target selection
 */
function processShooterAction(
  state: GameState,
  targetId: string | null,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const shooter = state.players.get(state.currentShooter!);
  if (!shooter) return;

  let killedPlayer: Player | null = null;

  if (targetId) {
    const target = state.players.get(targetId);
    if (target && target.status === PlayerStatus.ALIVE) {
      // Kill the target
      const deathCause = shooter.role === Role.HUNTER
        ? PlayerStatus.DEAD_BY_HUNTER
        : PlayerStatus.DEAD_BY_ALPHA_WOLF;

      target.status = deathCause;
      killedPlayer = target;
      state.deathSkillDeaths.push(targetId);

      logger.info(`${shooter.displayName} shot ${target.displayName}`);

      // Track hunter/alpha-wolf killing a werewolf for achievements
      if (target.role && isWerewolf(target.role)) {
        const shooterExt = state.extendedStates.get(shooter.oderId);
        if (shooterExt) shooterExt.hunterKilledWolf = true;
      }

      // Broadcast the result
      broadcastMessage(dispatcher, OpCode.DEATH_SKILL_RESULT, {
        shooterId: shooter.oderId,
        shooterName: shooter.displayName,
        shooterRole: shooter.role,
        targetId: target.oderId,
        targetName: target.displayName,
        success: true,
      });

      // Check if the killed player also has death skill (chain reaction)
      if (canUseDeathSkill(target, deathCause)) {
        // Add to pending shooters (at the front for immediate action)
        state.pendingShooters.unshift(targetId);
        logger.info(`${target.displayName} can also use death skill (chain)`);
      }

      // Check if the killed player has a lover who must die too
      const dyingLover = processLoverDeath(state, targetId, dispatcher, logger);
      if (dyingLover) {
        state.deathSkillDeaths.push(dyingLover.oderId);
        logger.info(`${dyingLover.displayName} died from grief after lover was shot`);

        // If the dying lover has death skill, they can still use it
        if (canUseDeathSkill(dyingLover, PlayerStatus.DEAD_BY_LOVER)) {
          state.pendingShooters.unshift(dyingLover.oderId);
          logger.info(`${dyingLover.displayName} can use death skill before dying of grief`);
        }
      }
    }
  } else {
    // Shooter chose not to shoot
    logger.info(`${shooter.displayName} chose not to shoot`);

    broadcastMessage(dispatcher, OpCode.DEATH_SKILL_RESULT, {
      shooterId: shooter.oderId,
      shooterName: shooter.displayName,
      shooterRole: shooter.role,
      targetId: null,
      targetName: null,
      success: false,
    });
  }

  // Move to next shooter or finish
  state.currentShooter = null;
  state.shooterTarget = null;
  startNextShooter(state, dispatcher, logger);
}

/**
 * Finish death skill phase and return to normal flow
 */
function finishDeathSkillPhase(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const returnPhase = state.previousPhase;
  const deathSkillDeaths = [...state.deathSkillDeaths]; // Copy before clearing
  state.previousPhase = null;
  state.pendingShooters = [];
  state.currentShooter = null;
  state.deathSkillDeaths = [];

  // Check win condition after death skills
  const winner = checkWinCondition(state);
  if (winner) {
    endGame(state, winner, dispatcher, logger);
    return;
  }

  // Check if sheriff died during death skill phase (need to transfer badge)
  if (state.sheriffId) {
    const sheriff = state.players.get(state.sheriffId);
    if (sheriff && sheriff.status !== PlayerStatus.ALIVE) {
      // Sheriff died, enter transfer phase
      if (checkSheriffTransfer(state, state.sheriffId, returnPhase!, dispatcher, logger)) {
        return;
      }
    }
  }

  // Return to appropriate phase based on where we came from
  if (returnPhase === GamePhase.DAY_DISCUSSION) {
    // After night results -> check for sheriff campaign first (first day)
    if (state.dayNumber === 1 && state.config.allowSheriff && !state.sheriffElectionDone) {
      startSheriffCampaign(state, dispatcher, logger);
      return;
    }
    // Go to day discussion
    transitionToDiscussion(state, dispatcher, logger);
  } else if (returnPhase === GamePhase.NIGHT) {
    // After vote execution -> go to night
    state.phase = GamePhase.NIGHT;
    state.nightSubPhase = NightSubPhase.WEREWOLF;
    state.dayNumber++;
    clearNightState(state);
    state.phaseStartTime = Date.now();
    state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

    broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
      phase: GamePhase.NIGHT,
      subPhase: NightSubPhase.WEREWOLF,
      dayNumber: state.dayNumber,
      duration: state.config.nightActionTime,
    });
  }

  logger.info(`Death skill phase finished, returning to ${state.phase}`);
}

/**
 * Assign roles to players
 */
function assignRoles(state: GameState, logger: nkruntime.Logger): void {
  const playerCount = state.players.size;
  let roles: Role[];

  // Priority: 1. Custom roles from config (if count matches), 2. Preset for player count, 3. Generated
  if (state.config.roles && state.config.roles.length === playerCount) {
    // Use custom roles from room settings
    roles = [...state.config.roles];
    logger.info(`Using custom role configuration: ${roles.join(', ')}`);
  } else if (PRESET_CONFIGS[playerCount]) {
    // Use preset configuration for this player count
    roles = [...PRESET_CONFIGS[playerCount]];
    logger.info(`Using preset role configuration for ${playerCount} players`);
  } else {
    // Generate roles based on player count
    const werewolfCount = Math.floor(playerCount / 3);
    const specialCount = Math.min(4, Math.floor(playerCount / 3));
    const villagerCount = playerCount - werewolfCount - specialCount;

    roles = [];

    // Add werewolves
    for (let i = 0; i < werewolfCount; i++) {
      roles.push(Role.WEREWOLF);
    }

    // Add special roles
    const specialRoles = [Role.SEER, Role.WITCH, Role.GUARD, Role.HUNTER];
    for (let i = 0; i < specialCount && i < specialRoles.length; i++) {
      roles.push(specialRoles[i]);
    }

    // Add villagers
    for (let i = 0; i < villagerCount; i++) {
      roles.push(Role.VILLAGER);
    }

    logger.info(`Generated role configuration for ${playerCount} players`);
  }

  // Shuffle roles
  const shuffledRoles = shuffleArray(roles);

  // Assign to players
  let seatNumber = 1;
  for (const [playerId, player] of state.players) {
    player.role = shuffledRoles[seatNumber - 1];
    player.seatNumber = seatNumber;
    seatNumber++;

    // Initialize extended state
    const extState: PlayerExtendedState = {
      playerId,
      isProtected: false,
      lastProtectedBy: null,
      idiotRevealed: false,
      isLovers: false,
      loverId: null,
      seerCheckedWolves: 0,
      witchSaved: false,
      witchPoisonedWolf: false,
      guardSaves: 0,
      hunterKilledWolf: false,
      wasExposed: false,
      votedOutWolves: 0,
    };

    // Initialize witch items
    if (player.role === Role.WITCH) {
      extState.witchItems = {
        hasAntidote: true,
        hasPoison: true,
      };
    }

    state.extendedStates.set(playerId, extState);

    logger.info(`Assigned role ${player.role} to player ${player.displayName} (seat ${seatNumber - 1})`);
  }
}

/**
 * Werewolf Match Handler - Assigning to global variables for Nakama goja compatibility
 */

// Declare global variables (will be hoisted to global scope by esbuild banner)
declare var matchInit: any;
declare var matchJoinAttempt: any;
declare var matchJoin: any;
declare var matchLeave: any;
declare var matchLoop: any;
declare var matchTerminate: any;
declare var matchSignal: any;

/**
 * Initialize match
 */
matchInit = function matchInit(
  ctx: nkruntime.Context,
  nkLogger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: nkruntime.MatchState; tickRate: number; label: string } {
    const timer = startTimer();
    nkLogger.info('Initializing werewolf match');

    // matchId will be assigned by Nakama after matchInit returns
    const state = createInitialState('', params);
    const label = getMatchLabel(state, params.creatorUsername || 'Unknown');

    // Log match creation with our logger
    gameLogger.info(LogCategory.MATCH, 'Match initialized', {
      data: {
        maxPlayers: state.config.maxPlayers,
        minPlayers: state.config.minPlayers,
        allowSheriff: state.config.allowSheriff,
        isPrivate: state.password !== null,
        roomName: state.roomName,
      },
      duration: timer.stop()
    });

    // Increment metrics
    metrics.incrementCounter(MetricNames.MATCHES_CREATED);
    metrics.incrementGauge(MetricNames.MATCHES_ACTIVE);

  return {
    state: state as nkruntime.MatchState,
    tickRate: TICK_RATE,
    label,
  };
}

/**
 * Validate join attempt
 */
matchJoinAttempt = function matchJoinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } {
    const gameState = state as unknown as GameState;
    const isSpectator = metadata?.spectator === true;

    // Check if game already started
    if (gameState.phase !== GamePhase.WAITING) {
      // Allow reconnection for existing players
      if (gameState.players.has(presence.userId)) {
        logger.info(`Player ${presence.username} reconnecting`);
        return { state, accept: true };
      }

      // Allow reconnection for existing spectators
      if (gameState.spectators.has(presence.userId)) {
        logger.info(`Spectator ${presence.username} reconnecting`);
        return { state, accept: true };
      }

      // Allow spectators to join during game
      if (isSpectator) {
        logger.info(`Accepting ${presence.username} as spectator`);
        return { state, accept: true };
      }

      logger.info(`Rejecting ${presence.username} - game already in progress`);
      return {
        state,
        accept: false,
        rejectMessage: 'Game already in progress',
      };
    }

    // Check password for private rooms
    if (gameState.password !== null) {
      const providedPassword = metadata?.password;
      if (!providedPassword || providedPassword !== gameState.password) {
        logger.info(`Rejecting ${presence.username} - incorrect password`);
        return {
          state,
          accept: false,
          rejectMessage: '密码错误',
        };
      }
      logger.info(`Password verified for ${presence.username}`);
    }

    // Check player limit (spectators don't count)
    if (!isSpectator && gameState.players.size >= gameState.config.maxPlayers) {
      logger.info(`Rejecting ${presence.username} - room full`);
      return {
        state,
        accept: false,
        rejectMessage: 'Room is full',
      };
    }

  logger.info(`Accepting ${presence.username} to join${isSpectator ? ' as spectator' : ''}`);
  return { state, accept: true };
}

/**
 * Handle player join
 */
matchJoin = function matchJoin(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    const gameState = state as unknown as GameState;

    for (const presence of presences) {
      // Register session for anti-cheat tracking
      registerSession(presence.userId);

      // Check if reconnecting spectator
      const existingSpectator = gameState.spectators.get(presence.userId);
      if (existingSpectator) {
        existingSpectator.connection = ConnectionStatus.CONNECTED;
        logger.info(`Spectator ${presence.username} reconnected`);

        // Send full game state to spectator
        sendSpectatorFullState(gameState, dispatcher, presence);
        continue;
      }

      // Check if reconnecting player
      const existingPlayer = gameState.players.get(presence.userId);

      if (existingPlayer) {
        // Reconnection
        existingPlayer.connection = ConnectionStatus.CONNECTED;
        logger.info(`Player ${presence.username} reconnected`);

        // Notify about reconnection
        broadcastMessage(dispatcher, OpCode.PLAYER_RECONNECTED, {
          playerId: presence.userId,
          playerName: presence.username,
        });

        // Send current game state to reconnected player
        sendToPlayer(dispatcher, OpCode.GAME_STATE, {
          phase: gameState.phase,
          dayNumber: gameState.dayNumber,
          players: Array.from(gameState.players.values()).map(p => ({
            id: p.oderId,
            name: p.displayName,
            seatNumber: p.seatNumber,
            status: p.status,
            isReady: p.isReady,
          })),
          phaseEndTime: gameState.phaseEndTime,
        }, presence);

        // Send their role if game has started
        if (existingPlayer.role) {
          sendToPlayer(dispatcher, OpCode.ROLE_ASSIGNED, {
            role: existingPlayer.role,
            faction: existingPlayer.role ? getRoleFaction(existingPlayer.role) : null,
          }, presence);
        }
      } else {
        // Check if this should be a spectator (game already started or joining as spectator)
        // We use metadata from matchJoinAttempt but it's not available here
        // So we check if game is in progress - new joins during game are spectators
        const isSpectatorJoin = gameState.phase !== GamePhase.WAITING;

        if (isSpectatorJoin) {
          // New spectator
          const spectator: Spectator = {
            oderId: presence.userId,
            odername: presence.username,
            displayName: presence.username,
            connection: ConnectionStatus.CONNECTED,
            joinedAt: Date.now(),
          };

          gameState.spectators.set(presence.userId, spectator);
          logger.info(`Spectator ${presence.username} joined (${gameState.spectators.size} spectators)`);

          // Broadcast spectator join to all players and spectators
          broadcastMessage(dispatcher, OpCode.SPECTATOR_JOIN, {
            oderId: presence.userId,
            odername: presence.username,
            displayName: presence.username,
            spectatorCount: gameState.spectators.size,
          });

          // Send full game state to spectator (includes all roles!)
          sendSpectatorFullState(gameState, dispatcher, presence);
        } else {
          // New player
          const isHost = gameState.players.size === 0;
          const player: Player = {
            oderId: presence.userId,
            odername: presence.username,
            displayName: presence.username,
            seatNumber: 0, // Assigned when game starts
            role: null,
            status: PlayerStatus.ALIVE,
            connection: ConnectionStatus.CONNECTED,
            isReady: false,
            votedFor: null,
            lastAction: Date.now(),
            isSpectator: false,
          };

          gameState.players.set(presence.userId, player);
          logger.info(`Player ${presence.username} joined (${gameState.players.size} players)`);

          // Broadcast player list update
          broadcastMessage(dispatcher, OpCode.PLAYER_LIST, {
            players: Array.from(gameState.players.values()).map(p => ({
              id: p.oderId,
              name: p.displayName,
              isReady: p.isReady,
              isHost: p.oderId === Array.from(gameState.players.keys())[0],
            })),
          });
        }
      }
    }

  // Update match label
  const hostPlayer = gameState.players.values().next().value;
  dispatcher.matchLabelUpdate(getMatchLabel(gameState, hostPlayer?.displayName || 'Unknown'));

  return { state };
}

/**
 * Handle player leave
 */
matchLeave = function matchLeave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    const gameState = state as unknown as GameState;

    for (const presence of presences) {
      // Cleanup anti-cheat tracking for leaving players
      cleanupPlayer(presence.userId);

      // Check if this is a spectator leaving
      const spectator = gameState.spectators.get(presence.userId);
      if (spectator) {
        gameState.spectators.delete(presence.userId);
        logger.info(`Spectator ${presence.username} left (${gameState.spectators.size} spectators remaining)`);

        // Notify about spectator leaving
        broadcastMessage(dispatcher, OpCode.SPECTATOR_LEAVE, {
          oderId: presence.userId,
          odername: presence.username,
          spectatorCount: gameState.spectators.size,
        });
        continue;
      }

      const player = gameState.players.get(presence.userId);

      if (player) {
        if (gameState.phase === GamePhase.WAITING) {
          // Remove player if game hasn't started
          gameState.players.delete(presence.userId);
          logger.info(`Player ${presence.username} left before game start`);
        } else {
          // Mark as disconnected during game
          player.connection = ConnectionStatus.DISCONNECTED;
          logger.info(`Player ${presence.username} disconnected during game`);

          // Notify other players
          broadcastMessage(dispatcher, OpCode.PLAYER_DISCONNECTED, {
            playerId: presence.userId,
            playerName: presence.username,
          });
        }
      }
    }

    // End match if no players left
    if (gameState.players.size === 0) {
      logger.info('All players left, terminating match');
      return null;
    }

  // Update match label
  const hostPlayer2 = gameState.players.values().next().value;
  dispatcher.matchLabelUpdate(getMatchLabel(gameState, hostPlayer2?.displayName || 'Unknown'));

  return { state };
}

/**
 * Main game loop
 */
matchLoop = function matchLoop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[]
): { state: nkruntime.MatchState } | null {
    const loopTimer = startTimer();
    const gameState = state as unknown as GameState;

    // Process incoming messages
    for (const message of messages) {
      const msgTimer = startTimer();
      processMessage(gameState, message, dispatcher, logger, nk);
      metrics.observeHistogram(MetricNames.MESSAGE_PROCESSING_DURATION, msgTimer.stop(), {
        op_code: message.opCode.toString()
      });
      metrics.incrementCounter(MetricNames.MESSAGES_RECEIVED, 1, {
        op_code: message.opCode.toString()
      });
    }

    // Check phase timeout
    const now = Date.now();
    if (now >= gameState.phaseEndTime && gameState.phase !== GamePhase.WAITING) {
      transitionPhase(gameState, dispatcher, logger);
    }

    // Flush deferred stats/replay when endGame ran without nk (last-words/death-skill/transfer)
    if (
      gameState.phase === GamePhase.GAME_OVER &&
      gameState.pendingStatsRecord &&
      gameState.winner
    ) {
      finalizeGameEndPersistence(gameState, gameState.winner, nk, logger);
    }

    // Check win condition (skip during death skill phase - will be checked after)
    if (gameState.phase !== GamePhase.WAITING &&
        gameState.phase !== GamePhase.GAME_OVER &&
        gameState.phase !== GamePhase.DEATH_SKILL) {
      const winner = checkWinCondition(gameState);
      if (winner) {
        endGame(gameState, winner, dispatcher, logger, nk);
      }
    }

  // Record loop tick duration
  metrics.observeHistogram(MetricNames.LOOP_TICK_DURATION, loopTimer.stop(), {
    match_id: gameState.matchId
  });

  return { state };
}

/**
 * Handle match termination
 */
matchTerminate = function matchTerminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  graceSeconds: number
): { state: nkruntime.MatchState } | null {
    const gameState = state as unknown as GameState;
    logger.info('Match terminating');

    // Flush deferred stats if game ended without nk on the terminal path
    if (gameState.pendingStatsRecord && gameState.winner) {
      finalizeGameEndPersistence(gameState, gameState.winner, nk, logger);
    }

    // Clean up match logger and decrement active matches gauge
    cleanupMatchLogger(gameState.matchId);
    metrics.decrementGauge(MetricNames.MATCHES_ACTIVE);

  // Log match termination
  gameLogger.info(LogCategory.MATCH, 'Match terminated', {
    matchId: gameState.matchId,
    data: {
      phase: gameState.phase,
      dayNumber: gameState.dayNumber,
      playerCount: gameState.players.size,
      spectatorCount: gameState.spectators.size,
      winner: gameState.winner,
      graceSeconds
    }
  });

  return { state };
}

/**
 * Handle external signals
 */
matchSignal = function matchSignal(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  data: string
): { state: nkruntime.MatchState; data?: string } | null {
  logger.info(`Match signal received: ${data}`);
  return { state, data: 'signal acknowledged' };
}

// Functions are assigned to global scope, no exports needed

/**
 * Process incoming player message
 */
function processMessage(
  state: GameState,
  message: nkruntime.MatchMessage,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama
): void {
  let data: any;
  try {
    const dataStr = nk.binaryToString(message.data);
    data = JSON.parse(dataStr);
  } catch (e) {
    logger.error(`Failed to parse message: ${e}`);
    return;
  }

  // === Anti-Cheat Check ===
  const antiCheatResult = checkAction(message.sender.userId, message.opCode as OpCode, data, logger);
  if (!antiCheatResult.allowed) {
    logger.warn(`[AntiCheat] Blocked action from ${message.sender.userId}: ${antiCheatResult.reason}`);
    // Optionally send error message back to player
    sendToPlayer(dispatcher, OpCode.MATCH_ERROR, {
      error: 'action_blocked',
      message: antiCheatResult.reason,
    }, message.sender);
    return;
  }

  // Update session activity
  updateSessionActivity(message.sender.userId);

  // Check if sender is a spectator
  const spectator = state.spectators.get(message.sender.userId);
  if (spectator) {
    // Spectators can only send spectator chat messages
    if (message.opCode === OpCode.SPECTATOR_CHAT) {
      handleSpectatorChat(state, spectator, data, dispatcher, logger);
    } else {
      logger.warn(`Spectator ${spectator.displayName} tried to send non-chat message: ${message.opCode}`);
    }
    return;
  }

  const player = state.players.get(message.sender.userId);
  if (!player) {
    logger.warn(`Message from unknown player: ${message.sender.userId}`);
    return;
  }

  switch (message.opCode) {
    case OpCode.READY:
      handleReady(state, player, data, dispatcher, logger);
      break;

    case OpCode.VOTE:
      handleVote(state, player, data, dispatcher, logger);
      break;

    case OpCode.USE_SKILL:
      // Handle death skill (shooting) during DEATH_SKILL phase
      if (state.phase === GamePhase.DEATH_SKILL && player.oderId === state.currentShooter) {
        handleDeathSkill(state, player, data, dispatcher, logger);
      } else {
        handleUseSkill(state, player, data, dispatcher, logger);
      }
      break;

    case OpCode.CHAT_MESSAGE:
      handleChat(state, player, data, OpCode.CHAT_MESSAGE, dispatcher, logger);
      break;

    case OpCode.WOLF_CHAT:
      handleChat(state, player, data, OpCode.WOLF_CHAT, dispatcher, logger);
      break;

    case OpCode.DEAD_CHAT:
      handleChat(state, player, data, OpCode.DEAD_CHAT, dispatcher, logger);
      break;

    // 警长系统消息
    case OpCode.SHERIFF_CAMPAIGN_JOIN:
      handleSheriffCampaignJoin(state, player, dispatcher, logger);
      break;

    case OpCode.SHERIFF_CAMPAIGN_QUIT:
      handleSheriffCampaignQuit(state, player, dispatcher, logger);
      break;

    case OpCode.SHERIFF_VOTE:
      handleSheriffVote(state, player, data, dispatcher, logger);
      break;

    case OpCode.SHERIFF_TRANSFER_DONE:
      handleSheriffTransfer(state, player, data, dispatcher, logger);
      break;

    // 遗言系统消息
    case OpCode.LAST_WORDS_SPEAK:
      handleLastWordsSpeak(state, player, data, dispatcher, logger);
      break;

    case OpCode.LAST_WORDS_SKIP:
      handleLastWordsSkip(state, player, dispatcher, logger);
      break;

    default:
      logger.warn(`Unknown opcode: ${message.opCode}`);
  }
}

/**
 * Handle death skill (shooting) during death skill phase
 */
function handleDeathSkill(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.DEATH_SKILL) return;
  if (player.oderId !== state.currentShooter) return;

  const { targetId } = data;

  // Validate target (must be alive player, not self)
  if (targetId && targetId !== player.oderId) {
    const target = state.players.get(targetId);
    if (!target || target.status !== PlayerStatus.ALIVE) {
      logger.warn(`Invalid shooting target: ${targetId}`);
      return;
    }
  }

  // Process the shooting action
  processShooterAction(state, targetId || null, dispatcher, logger);
}

/**
 * Handle player ready status
 */
function handleReady(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.WAITING) return;

  player.isReady = data.ready ?? !player.isReady;
  logger.info(`Player ${player.displayName} ready: ${player.isReady}`);

  // Broadcast ready status
  broadcastMessage(dispatcher, OpCode.PLAYER_READY, {
    playerId: player.oderId,
    isReady: player.isReady,
  });

  // Check if all players are ready
  const allReady = Array.from(state.players.values()).every(p => p.isReady);
  const hasMinPlayers = state.players.size >= state.config.minPlayers;

  if (allReady && hasMinPlayers) {
    startGame(state, dispatcher, logger);
  }
}

/**
 * Handle vote
 */
function handleVote(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.DAY_VOTING) return;
  if (player.status !== PlayerStatus.ALIVE) return;

  // Check if player is revealed idiot (cannot vote after revealing)
  const playerExt = state.extendedStates.get(player.oderId);
  if (player.role === Role.IDIOT && playerExt?.idiotRevealed) {
    logger.info(`Player ${player.displayName} is revealed idiot and cannot vote`);
    return;
  }

  const targetId = data.targetId || null;

  // Validate target
  if (targetId) {
    const target = state.players.get(targetId);
    if (!target || target.status !== PlayerStatus.ALIVE) {
      logger.warn(`Invalid vote target: ${targetId}`);
      return;
    }
  }

  const vote: VoteRecord = {
    voterId: player.oderId,
    targetId,
    timestamp: Date.now(),
  };

  state.votes.set(player.oderId, vote);
  player.votedFor = targetId;

  logger.info(`Player ${player.displayName} voted for ${targetId || 'skip'}`);

  // Broadcast vote (hide actual target for some game modes)
  broadcastMessage(dispatcher, OpCode.VOTE, {
    voterId: player.oderId,
    hasVoted: true,
  });

  // Check if all alive players (who can vote) have voted
  // Revealed idiots cannot vote, so exclude them
  const alivePlayers = getAlivePlayers(state);
  const votingPlayers = alivePlayers.filter(p => {
    if (p.role === Role.IDIOT) {
      const ext = state.extendedStates.get(p.oderId);
      return !ext?.idiotRevealed; // Only include if not revealed
    }
    return true;
  });
  const allVoted = votingPlayers.every(p => state.votes.has(p.oderId));

  if (allVoted) {
    // Process votes immediately
    processVotes(state, dispatcher, logger);
  }
}

/**
 * Handle skill usage
 */
function handleUseSkill(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.NIGHT) return;
  if (player.status !== PlayerStatus.ALIVE) return;

  const { skill, targetId } = data;
  const extState = state.extendedStates.get(player.oderId);

  logger.info(`Player ${player.displayName} using skill ${skill} on ${targetId}`);

  const action: NightAction = {
    playerId: player.oderId,
    role: player.role!,
    action: skill,
    targetId,
    timestamp: Date.now(),
  };

  // Validate and process skill based on role
  switch (player.role) {
    case Role.WEREWOLF:
    case Role.ALPHA_WOLF:
      if (state.nightSubPhase === NightSubPhase.WEREWOLF) {
        state.wolfVotes.set(player.oderId, targetId);
        state.nightActions.push(action);

        // Check if all wolves have voted
        const wolves = getAliveWerewolves(state);
        if (wolves.every(w => state.wolfVotes.has(w.oderId))) {
          // Find most voted target
          const voteCount = new Map<string, number>();
          for (const target of state.wolfVotes.values()) {
            voteCount.set(target, (voteCount.get(target) || 0) + 1);
          }
          let maxVotes = 0;
          let selectedTarget = '';
          for (const [target, count] of voteCount) {
            if (count > maxVotes) {
              maxVotes = count;
              selectedTarget = target;
            }
          }
          state.wolfTarget = selectedTarget;
        }
      }
      break;

    case Role.SEER:
      if (state.nightSubPhase === NightSubPhase.SEER && targetId) {
        // One accepted check per seer per night — ignore duplicate USE_SKILL spam
        const alreadyChecked = state.nightActions.some(
          a => a.role === Role.SEER && a.playerId === player.oderId
        );
        if (alreadyChecked) {
          break;
        }

        state.seerTarget = targetId;
        state.nightActions.push(action);

        // Send result to seer
        const target = state.players.get(targetId);
        if (target && target.role) {
          const targetFaction = getRoleFaction(target.role);
          sendToPlayer(dispatcher, OpCode.SKILL_RESULT, {
            skill: 'check',
            success: true,
            result: {
              targetId,
              faction: targetFaction,
            },
          }, { userId: player.oderId, sessionId: '', username: '', node: '' });

          // Track seer correct-wolf checks + wolf exposure for achievements
          if (extState && isWerewolf(target.role)) {
            extState.seerCheckedWolves = (extState.seerCheckedWolves || 0) + 1;
            const targetExt = state.extendedStates.get(targetId);
            if (targetExt) {
              targetExt.wasExposed = true;
            }
          }
        }
      }
      break;

    case Role.WITCH:
      if (state.nightSubPhase === NightSubPhase.WITCH && extState) {
        if (skill === 'heal' && extState.witchItems?.hasAntidote) {
          state.witchSaveTarget = targetId;
          extState.witchItems.hasAntidote = false;
          state.nightActions.push(action);
        } else if (skill === 'poison' && extState.witchItems?.hasPoison && targetId) {
          state.witchPoisonTarget = targetId;
          extState.witchItems.hasPoison = false;
          state.nightActions.push(action);
        }
      }
      break;

    case Role.GUARD:
      if (state.nightSubPhase === NightSubPhase.GUARD && targetId) {
        // Can't protect same person two nights in a row
        if (extState && extState.lastProtectedBy !== targetId) {
          // Clear this guard's previous same-night protection before switching targets
          for (const prev of state.nightActions) {
            if (
              prev.role === Role.GUARD &&
              prev.playerId === player.oderId &&
              prev.targetId &&
              prev.targetId !== targetId
            ) {
              const prevExt = state.extendedStates.get(prev.targetId);
              // Only clear if no other guard's final intent still covers them
              // (final reconciliation happens in processNightResults)
              if (prevExt) prevExt.isProtected = false;
            }
          }

          state.guardTarget = targetId;
          extState.lastProtectedBy = targetId;
          state.nightActions.push(action);

          const targetExt = state.extendedStates.get(targetId);
          if (targetExt) {
            targetExt.isProtected = true;
          }
        }
      }
      break;

    case Role.CUPID:
      // Cupid can only act on first night
      if (state.nightSubPhase === NightSubPhase.CUPID && state.dayNumber === 1) {
        const { targetId1, targetId2 } = data;

        // Need exactly two different targets
        if (!targetId1 || !targetId2 || targetId1 === targetId2) {
          logger.warn('Cupid must select two different players');
          return;
        }

        // Validate both targets are alive
        const target1 = state.players.get(targetId1);
        const target2 = state.players.get(targetId2);
        if (!target1 || !target2 || target1.status !== PlayerStatus.ALIVE || target2.status !== PlayerStatus.ALIVE) {
          logger.warn('Invalid cupid targets');
          return;
        }

        // Link the lovers
        state.cupidTarget1 = targetId1;
        state.cupidTarget2 = targetId2;
        state.loversLinked = true;

        // Update extended states
        const ext1 = state.extendedStates.get(targetId1);
        const ext2 = state.extendedStates.get(targetId2);
        if (ext1 && ext2) {
          ext1.isLovers = true;
          ext1.loverId = targetId2;
          ext2.isLovers = true;
          ext2.loverId = targetId1;
        }

        // Check if lovers are from different factions
        const faction1 = getRoleFaction(target1.role!);
        const faction2 = getRoleFaction(target2.role!);
        const effectiveFaction1 = faction1 === Faction.NEUTRAL ? Faction.VILLAGER : faction1;
        const effectiveFaction2 = faction2 === Faction.NEUTRAL ? Faction.VILLAGER : faction2;
        state.loversFaction = effectiveFaction1 !== effectiveFaction2;

        state.nightActions.push({
          ...action,
          targetId: `${targetId1},${targetId2}`,
        });

        logger.info(`Cupid linked ${target1.displayName} and ${target2.displayName} as lovers (cross-faction: ${state.loversFaction})`);

        // Notify both lovers about each other
        const loverInfo1 = {
          loverId: targetId2,
          loverName: target2.displayName,
          loverSeatNumber: target2.seatNumber,
          loverRole: target2.role,
          crossFaction: state.loversFaction,
        };
        const loverInfo2 = {
          loverId: targetId1,
          loverName: target1.displayName,
          loverSeatNumber: target1.seatNumber,
          loverRole: target1.role,
          crossFaction: state.loversFaction,
        };

        sendToPlayer(dispatcher, OpCode.CUPID_LINK, loverInfo1, { userId: targetId1, sessionId: '', username: '', node: '' });
        sendToPlayer(dispatcher, OpCode.CUPID_LINK, loverInfo2, { userId: targetId2, sessionId: '', username: '', node: '' });
      }
      break;
  }
}

/**
 * Handle chat message
 */
function handleChat(
  state: GameState,
  player: Player,
  data: any,
  channel: OpCode,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const { content } = data;
  if (!content || content.trim().length === 0) return;

  // Validate channel access
  if (channel === OpCode.WOLF_CHAT) {
    // Only werewolves can use wolf chat
    if (!player.role || !isWerewolf(player.role)) return;
  } else if (channel === OpCode.DEAD_CHAT) {
    // Only dead players can use dead chat
    if (player.status === PlayerStatus.ALIVE) return;
  }

  // Create chat message
  const chatMessage = {
    senderId: player.oderId,
    senderName: player.displayName,
    content: content.slice(0, 500), // Limit message length
    timestamp: Date.now(),
    seatNumber: player.seatNumber,
    role: player.role, // Include role for dead chat (all dead players can see roles)
  };

  // Determine recipients
  if (channel === OpCode.WOLF_CHAT) {
    // Send only to werewolves (alive or dead) and spectators
    const wolves = Array.from(state.players.values())
      .filter(p => p.role && isWerewolf(p.role))
      .map(p => ({ userId: p.oderId, sessionId: '', username: '', node: '' }));

    for (const wolf of wolves) {
      sendToPlayer(dispatcher, OpCode.WOLF_CHAT, chatMessage, wolf);
    }

    // Also send to spectators (they can see everything)
    broadcastToSpectators(state, dispatcher, OpCode.WOLF_CHAT, chatMessage);
  } else if (channel === OpCode.DEAD_CHAT) {
    // Send only to dead players and spectators (they can see all roles and chat together)
    const deadPlayers = Array.from(state.players.values())
      .filter(p => p.status !== PlayerStatus.ALIVE)
      .map(p => ({ userId: p.oderId, sessionId: '', username: '', node: '' }));

    for (const deadPlayer of deadPlayers) {
      sendToPlayer(dispatcher, OpCode.DEAD_CHAT, chatMessage, deadPlayer);
    }

    // Also send to spectators
    broadcastToSpectators(state, dispatcher, OpCode.DEAD_CHAT, chatMessage);
  } else {
    // Public chat - broadcast to all players and spectators
    broadcastMessage(dispatcher, OpCode.CHAT_MESSAGE, chatMessage);
    broadcastToSpectators(state, dispatcher, OpCode.CHAT_MESSAGE, chatMessage);
  }
}

/**
 * Handle spectator chat message
 */
function handleSpectatorChat(
  state: GameState,
  spectator: Spectator,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const { content } = data;
  if (!content || content.trim().length === 0) return;

  // Create chat message
  const chatMessage = {
    senderId: spectator.oderId,
    senderName: spectator.displayName,
    content: content.slice(0, 500), // Limit message length
    timestamp: Date.now(),
    isSpectator: true,
  };

  logger.info(`Spectator ${spectator.displayName} chat: ${content.slice(0, 50)}...`);

  // Send to all spectators only (spectators chat among themselves)
  broadcastToSpectators(state, dispatcher, OpCode.SPECTATOR_CHAT, chatMessage);
}

/**
 * Start the game
 */
function startGame(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  logger.info('Starting game');

  // Assign roles
  assignRoles(state, logger);

  // Initialize replay buffer
  const replayBuffer = getReplayBuffer(state.matchId);
  replayBuffer.setConfig({
    maxPlayers: state.config.maxPlayers,
    roles: Array.from(state.players.values()).map(p => p.role!).filter(Boolean),
    discussionTime: state.config.discussionTime,
    votingTime: state.config.votingTime,
    nightActionTime: state.config.nightActionTime,
    allowSheriff: state.config.allowSheriff,
    allowLastWords: state.config.allowLastWords,
    roomName: state.roomName,
    isPrivate: !!state.password
  });

  // Add players to replay
  for (const [playerId, player] of state.players) {
    const extState = state.extendedStates.get(playerId);
    replayBuffer.setPlayer({
      id: playerId,
      name: player.displayName,
      seatNumber: player.seatNumber,
      role: player.role!,
      faction: player.role ? getRoleFaction(player.role) : Faction.VILLAGER,
      isAlive: true,
      isSheriff: false,
      isLover: extState?.isLovers || false,
      loverId: extState?.loverId
    });
  }

  // Record game start event
  replayBuffer.addEvent({
    type: GameEventType.MATCH_STARTED,
    data: {
      playerCount: state.players.size,
      roles: Array.from(state.players.values()).map(p => p.role)
    }
  });

  // Change phase to starting
  state.phase = GamePhase.STARTING;
  broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
    phase: GamePhase.STARTING,
    duration: 5,
  });

  // Send role assignments to each player
  for (const [playerId, player] of state.players) {
    const presence = { userId: playerId, sessionId: '', username: '', node: '' };
    sendToPlayer(dispatcher, OpCode.ROLE_ASSIGNED, {
      role: player.role,
      faction: player.role ? getRoleFaction(player.role) : null,
      teammates: player.role && isWerewolf(player.role)
        ? getAliveWerewolves(state).map(w => ({ id: w.oderId, name: w.displayName }))
        : undefined,
    }, presence);
  }

  // Set phase end time for starting phase (5 seconds)
  // The phase transition will happen in matchLoop when time expires
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 5000; // 5 seconds delay before first night
}

/**
 * Transition to next phase
 */
function transitionPhase(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  logger.info(`Transitioning from phase ${state.phase}`);

  switch (state.phase) {
    case GamePhase.STARTING:
      // Transition from starting to first night
      state.phase = GamePhase.NIGHT;
      state.dayNumber = 1;
      state.phaseStartTime = Date.now();
      state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

      // Check if there's a cupid - if so, start with cupid phase
      const hasCupid = Array.from(state.players.values()).some(p => p.role === Role.CUPID);
      if (hasCupid) {
        state.nightSubPhase = NightSubPhase.CUPID;
        broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
          phase: GamePhase.NIGHT,
          subPhase: NightSubPhase.CUPID,
          dayNumber: state.dayNumber,
          duration: state.config.nightActionTime,
          isFirstNight: true,
        });
        logger.info('First night: Cupid phase started');
      } else {
        state.nightSubPhase = NightSubPhase.WEREWOLF;
        broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
          phase: GamePhase.NIGHT,
          subPhase: NightSubPhase.WEREWOLF,
          dayNumber: state.dayNumber,
          duration: state.config.nightActionTime,
        });
      }
      break;

    case GamePhase.NIGHT:
      // Handle night sub-phase transitions
      if (state.nightSubPhase === NightSubPhase.CUPID) {
        // Cupid phase done (timeout or action complete), move to werewolf
        state.nightSubPhase = NightSubPhase.WEREWOLF;
        state.phaseStartTime = Date.now();
        state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

        broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
          phase: GamePhase.NIGHT,
          subPhase: NightSubPhase.WEREWOLF,
          dayNumber: state.dayNumber,
          duration: state.config.nightActionTime,
        });
        logger.info('Night sub-phase: Cupid -> Werewolf');
        break;
      }

      // Process night results (may enter death skill phase)
      const enteredDeathSkillFromNight = processNightResults(state, dispatcher, logger);

      // If death skill phase was entered, don't transition to day yet
      if (enteredDeathSkillFromNight) {
        break;
      }

      // Check if sheriff campaign should happen (first day, enabled, not done)
      if (state.dayNumber === 1 && state.config.allowSheriff && !state.sheriffElectionDone) {
        startSheriffCampaign(state, dispatcher, logger);
        break;
      }

      // Move to day discussion
      transitionToDiscussion(state, dispatcher, logger);
      break;

    case GamePhase.SHERIFF_CAMPAIGN:
      // Campaign timeout, move to speech phase
      startSheriffSpeech(state, dispatcher, logger);
      break;

    case GamePhase.SHERIFF_SPEECH:
      // Speech timeout, move to next speaker or voting
      nextSheriffSpeech(state, dispatcher, logger);
      break;

    case GamePhase.SHERIFF_VOTING:
      // Voting timeout, process votes
      processSheriffVotes(state, dispatcher, logger);
      break;

    case GamePhase.SHERIFF_TRANSFER:
      // Transfer timeout, sheriff didn't choose, badge is destroyed
      {
        const sheriff = state.players.get(state.sheriffId!);
        logger.info(`Sheriff transfer timeout: ${sheriff?.displayName} didn't transfer, badge destroyed`);
        state.sheriffId = null;

        broadcastMessage(dispatcher, OpCode.SHERIFF_EXPLODE, {
          sheriffId: state.sheriffId,
          sheriffName: sheriff?.displayName,
          reason: 'timeout',
        });

        finishSheriffTransfer(state, dispatcher, logger);
      }
      break;

    case GamePhase.DAY_DISCUSSION:
      // Move to voting
      state.phase = GamePhase.DAY_VOTING;
      state.votes.clear();
      state.phaseStartTime = Date.now();
      state.phaseEndTime = Date.now() + state.config.votingTime * 1000;

      broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
        phase: GamePhase.DAY_VOTING,
        duration: state.config.votingTime,
      });
      break;

    case GamePhase.DAY_VOTING:
      // Process votes
      processVotes(state, dispatcher, logger);
      break;

    case GamePhase.LAST_WORDS:
      // Last words timeout - player didn't speak or skipped
      {
        const speaker = state.lastWordsSpeaker;
        const speakerPlayer = speaker ? state.players.get(speaker) : null;
        logger.info(`Last words timeout: ${speakerPlayer?.displayName || 'unknown'} didn't finish speaking`);

        // Finish the last words phase (handles death skill, sheriff transfer, etc.)
        finishLastWordsPhase(state, dispatcher, logger);
      }
      break;

    case GamePhase.DEATH_SKILL:
      // Timeout during death skill - shooter didn't choose, auto-skip
      if (state.currentShooter) {
        const shooter = state.players.get(state.currentShooter);
        logger.info(`Death skill timeout: ${shooter?.displayName} didn't shoot`);

        // Process as if they chose not to shoot
        processShooterAction(state, null, dispatcher, logger);
      }
      break;
  }
}

/**
 * Process night results
 * Returns true if death skill phase was entered (and we should not transition to day yet)
 */
function processNightResults(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): boolean {
  const deaths: { playerId: string; playerName: string; cause: PlayerStatus }[] = [];
  let savedByWitch = false;

  // Check wolf kill
  if (state.wolfTarget) {
    const target = state.players.get(state.wolfTarget);

    if (target && target.status === PlayerStatus.ALIVE) {
      // Final accepted guard action per guard — ignore earlier alternating targets
      const finalGuardActions = getFinalGuardActionsByPlayer(state.nightActions);
      const protectingGuards = Array.from(finalGuardActions.values()).filter(
        a => a.targetId === state.wolfTarget
      );

      // Check if protected by guard (final action only; stale isProtected is ignored)
      if (protectingGuards.length > 0) {
        logger.info(`${target.displayName} was protected by guard`);
        for (const nightAction of protectingGuards) {
          const guardExt = state.extendedStates.get(nightAction.playerId);
          if (guardExt) {
            guardExt.guardSaves = (guardExt.guardSaves || 0) + 1;
          }
        }
      }
      // Check if saved by witch
      else if (state.witchSaveTarget === state.wolfTarget) {
        savedByWitch = true;
        logger.info(`${target.displayName} was saved by witch`);
        // Credit only the witch who used the antidote
        const saveAction = state.nightActions.find(
          a => a.role === Role.WITCH && a.action === 'heal'
        );
        if (saveAction) {
          const witchExt = state.extendedStates.get(saveAction.playerId);
          if (witchExt) witchExt.witchSaved = true;
        }
      }
      // Kill the target
      else {
        target.status = PlayerStatus.DEAD_BY_WOLF;
        deaths.push({
          playerId: target.oderId,
          playerName: target.displayName,
          cause: PlayerStatus.DEAD_BY_WOLF,
        });
        logger.info(`${target.displayName} was killed by werewolves`);
      }
    }
  }

  // Check witch poison
  if (state.witchPoisonTarget) {
    const target = state.players.get(state.witchPoisonTarget);
    if (target && target.status === PlayerStatus.ALIVE) {
      target.status = PlayerStatus.DEAD_BY_POISON;
      deaths.push({
        playerId: target.oderId,
        playerName: target.displayName,
        cause: PlayerStatus.DEAD_BY_POISON,
      });
      logger.info(`${target.displayName} was poisoned by witch`);

      if (target.role && isWerewolf(target.role)) {
        // Credit only the witch who used the poison
        const poisonAction = state.nightActions.find(
          a => a.role === Role.WITCH && a.action === 'poison'
        );
        if (poisonAction) {
          const witchExt = state.extendedStates.get(poisonAction.playerId);
          if (witchExt) witchExt.witchPoisonedWolf = true;
        }
      }
    }
  }

  // Process lover deaths (one dies, the other follows)
  const loverDeaths: { playerId: string; playerName: string; cause: PlayerStatus }[] = [];
  for (const death of deaths) {
    const dyingLover = processLoverDeath(state, death.playerId, dispatcher, logger);
    if (dyingLover) {
      loverDeaths.push({
        playerId: dyingLover.oderId,
        playerName: dyingLover.displayName,
        cause: PlayerStatus.DEAD_BY_LOVER,
      });
    }
  }
  // Add lover deaths to the deaths array
  deaths.push(...loverDeaths);

  // Clear protection status
  for (const [, extState] of state.extendedStates) {
    extState.isProtected = false;
  }

  // Broadcast night results
  broadcastMessage(dispatcher, OpCode.NIGHT_RESULT, {
    deaths,
    savedByWitch,
  });

  // Check for death skills (Hunter killed at night can shoot)
  if (deaths.length > 0) {
    const deadPlayersForSkill = deaths.map(d => ({
      playerId: d.playerId,
      cause: d.cause,
    }));

    // Return to DAY_DISCUSSION after death skill phase
    if (checkAndEnterDeathSkillPhase(state, deadPlayersForSkill, GamePhase.DAY_DISCUSSION, dispatcher, logger)) {
      return true; // Death skill phase entered
    }

    // Check if sheriff died at night (need to transfer badge)
    for (const death of deaths) {
      if (death.playerId === state.sheriffId) {
        if (checkSheriffTransfer(state, death.playerId, GamePhase.DAY_DISCUSSION, dispatcher, logger)) {
          return true; // Sheriff transfer phase entered
        }
        break;
      }
    }
  }

  return false; // No death skill, continue normal flow
}

/**
 * Process votes
 */
function processVotes(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  // Count votes (sheriff has 1.5 vote weight)
  const voteCount = new Map<string, number>();
  const voteList: { voterId: string; targetId: string | null; weight: number }[] = [];

  for (const [voterId, vote] of state.votes) {
    // Sheriff's vote counts as 1.5
    const weight = (state.sheriffId === voterId) ? 1.5 : 1;
    voteList.push({ voterId, targetId: vote.targetId, weight });
    if (vote.targetId) {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + weight);
    }
  }

  // Find highest voted
  let maxVotes = 0;
  let eliminated: string | null = null;
  let isTie = false;

  for (const [targetId, count] of voteCount) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  // If tie, no one is eliminated
  if (isTie) {
    eliminated = null;
    logger.info('Vote ended in tie, no elimination');
  }

  // Process elimination
  let idiotRevealed: { playerId: string; playerName: string } | null = null;

  if (eliminated) {
    const target = state.players.get(eliminated);
    const targetExt = state.extendedStates.get(eliminated);

    if (target) {
      // Check for idiot
      if (target.role === Role.IDIOT && !targetExt?.idiotRevealed) {
        if (targetExt) targetExt.idiotRevealed = true;
        logger.info(`${target.displayName} revealed as idiot, survives vote`);

        // Record idiot reveal for broadcast
        idiotRevealed = {
          playerId: target.oderId,
          playerName: target.displayName,
        };

        eliminated = null;
      } else {
        target.status = PlayerStatus.DEAD_BY_VOTE;
        logger.info(`${target.displayName} was voted out`);

        // Count wolf eliminations toward voters' WOLF_EXTERMINATOR progress
        if (target.role && isWerewolf(target.role)) {
          for (const [voterId, vote] of state.votes) {
            if (vote.targetId === eliminated) {
              const voterExt = state.extendedStates.get(voterId);
              if (voterExt) voterExt.votedOutWolves = (voterExt.votedOutWolves || 0) + 1;
            }
          }
        }

        // Check if voted player has a lover who must die too
        const dyingLover = processLoverDeath(state, eliminated!, dispatcher, logger);
        if (dyingLover) {
          logger.info(`${dyingLover.displayName} died from grief after lover was voted out`);
        }
      }
    }
  }

  // Broadcast idiot revealed if applicable
  if (idiotRevealed) {
    broadcastMessage(dispatcher, OpCode.IDIOT_REVEALED, {
      playerId: idiotRevealed.playerId,
      playerName: idiotRevealed.playerName,
      message: `${idiotRevealed.playerName} 翻牌亮出白痴身份，免于被处决！但今后无法参与投票。`,
    });
  }

  // Broadcast vote results with vote weights
  broadcastMessage(dispatcher, OpCode.VOTE_RESULT, {
    votes: voteList,
    eliminated,
    isTie,
    sheriffId: state.sheriffId,
    voteCount: Array.from(voteCount.entries()).map(([id, count]) => ({
      targetId: id,
      targetName: state.players.get(id)?.displayName,
      count,
    })),
  });

  // Move to last words or next phase
  if (eliminated) {
    const eliminatedPlayer = state.players.get(eliminated);

    // Check if eliminated player is the sheriff (need to transfer badge)
    if (eliminatedPlayer && state.sheriffId === eliminated) {
      // Sheriff was voted out, they need to transfer badge before death skill/last words
      // We'll handle the transfer after death skill if applicable
      logger.info(`Sheriff ${eliminatedPlayer.displayName} was voted out`);
    }

    // Check for death skill (Hunter/Alpha Wolf voted out)
    if (eliminatedPlayer) {
      const deadPlayersForSkill = [{
        playerId: eliminated,
        cause: PlayerStatus.DEAD_BY_VOTE,
      }];

      // Return to NIGHT after death skill phase (after last words would be night)
      if (checkAndEnterDeathSkillPhase(state, deadPlayersForSkill, GamePhase.NIGHT, dispatcher, logger)) {
        // Death skill phase entered, skip last words and normal flow
        // Note: Sheriff transfer will happen after death skill phase if sheriff was eliminated
        return;
      }
    }

    // Check for sheriff transfer (if sheriff was voted out and no death skill)
    if (eliminatedPlayer && checkSheriffTransfer(state, eliminated, GamePhase.NIGHT, dispatcher, logger)) {
      // Sheriff transfer phase entered
      return;
    }

    // No death skill and no sheriff transfer, go to last words
    startLastWordsPhase(state, eliminated, PlayerStatus.DEAD_BY_VOTE, dispatcher, logger);
  } else {
    // No elimination, go to night
    state.phase = GamePhase.NIGHT;
    state.nightSubPhase = NightSubPhase.WEREWOLF;
    state.dayNumber++;
    clearNightState(state);
    state.phaseStartTime = Date.now();
    state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

    broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
      phase: GamePhase.NIGHT,
      subPhase: NightSubPhase.WEREWOLF,
      dayNumber: state.dayNumber,
      duration: state.config.nightActionTime,
    });
  }
}

/**
 * Clear night state for new night
 */
function clearNightState(state: GameState): void {
  state.nightActions = [];
  state.wolfTarget = null;
  state.wolfVotes.clear();
  state.guardTarget = null;
  state.seerTarget = null;
  state.witchSaveTarget = null;
  state.witchPoisonTarget = null;
}

/**
 * End the game
 */
function endGame(
  state: GameState,
  winner: Faction,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
  nk?: nkruntime.Nakama
): void {
  state.phase = GamePhase.GAME_OVER;
  state.winner = winner;

  // Calculate game duration
  const gameDuration = Date.now() - (state.phaseStartTime - state.config.nightActionTime * 1000);

  // Set game end reason based on winner
  if (winner === Faction.LOVERS) {
    const loverIds = getLoverIds(state);
    if (loverIds) {
      const lover1 = state.players.get(loverIds[0]);
      const lover2 = state.players.get(loverIds[1]);
      state.gameEndReason = `情侣 ${lover1?.displayName} 和 ${lover2?.displayName} 战胜了一切，爱情获胜！`;
    } else {
      state.gameEndReason = '情侣战胜了一切，爱情获胜！';
    }
  } else if (winner === Faction.WEREWOLF) {
    state.gameEndReason = '狼人占领了村庄！';
  } else {
    state.gameEndReason = '所有狼人已被消灭！村民获胜！';
  }

  logger.info(`Game over! Winner: ${winner}`);

  // Log game end with metrics
  const alivePlayers = getAlivePlayers(state);
  gameLogger.info(LogCategory.GAME, 'Game ended', {
    matchId: state.matchId,
    data: {
      winner,
      reason: state.gameEndReason,
      dayNumber: state.dayNumber,
      duration: gameDuration,
      totalPlayers: state.players.size,
      survivors: alivePlayers.length,
      survivorNames: alivePlayers.map(p => p.displayName)
    }
  });

  // Record metrics
  metrics.incrementCounter(MetricNames.MATCHES_COMPLETED);
  metrics.incrementCounter(MetricNames.GAMES_WON_BY_FACTION, 1, { faction: winner });
  metrics.observeHistogram(MetricNames.MATCHES_DURATION, gameDuration / 1000);
  metrics.incrementCounter(MetricNames.GAME_ROUNDS, state.dayNumber);

  // Broadcast game results
  const loverIds = getLoverIds(state);
  broadcastMessage(dispatcher, OpCode.GAME_OVER, {
    winner,
    reason: state.gameEndReason,
    players: Array.from(state.players.values()).map(p => {
      const extState = state.extendedStates.get(p.oderId);
      return {
        playerId: p.oderId,
        playerName: p.displayName,
        role: p.role,
        status: p.status,
        isLover: extState?.isLovers || false,
        loverId: extState?.loverId || null,
        isSheriff: p.oderId === state.sheriffId,
      };
    }),
    lovers: loverIds ? {
      player1Id: loverIds[0],
      player2Id: loverIds[1],
      crossFaction: state.loversFaction,
    } : null,
    sheriffId: state.sheriffId,
  });

  // Record game results to user statistics and save replay
  if (nk) {
    finalizeGameEndPersistence(state, winner, nk, logger);
  } else {
    // Terminal paths (last words / death skill / sheriff transfer) call endGame
    // without nk; matchLoop will flush on the next tick with nk available.
    state.pendingStatsRecord = true;
  }
}

/**
 * Persist stats/achievements and replay after game end (requires nk).
 */
function finalizeGameEndPersistence(
  state: GameState,
  winner: Faction,
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger
): void {
  state.pendingStatsRecord = false;
  recordGameStats(state, winner, nk, logger);

  // Save game replay
  try {
    const replayBuffer = matchReplayBuffers.get(state.matchId);
    if (replayBuffer) {
      // Update player states before building replay
      for (const [playerId, player] of state.players) {
        if (player.isSpectator) continue;
        const extState = state.extendedStates.get(playerId);
        replayBuffer.updatePlayer(playerId, {
          isAlive: player.status === PlayerStatus.ALIVE,
          isSheriff: playerId === state.sheriffId,
          isLover: extState?.isLovers || false,
          loverId: extState?.loverId
        });
      }

      // Record game end event
      const alivePlayers = getAlivePlayers(state);
      replayBuffer.addEvent({
        type: GameEventType.GAME_WIN,
        day: state.dayNumber,
        phase: state.phase,
        data: {
          winner,
          reason: state.gameEndReason,
          survivors: alivePlayers.map(p => ({ id: p.oderId, name: p.displayName, role: p.role }))
        }
      });

      // Build and save replay
      const winnerFaction = winner === Faction.LOVERS ? 'lovers' : winner;
      const replay = replayBuffer.build(winnerFaction as Faction | 'lovers');
      const participantIds = Array.from(state.players.values())
        .filter(p => !p.isSpectator)
        .map(p => p.oderId);

      saveReplay(nk, replay, participantIds);
      logger.info(`Saved replay for match ${state.matchId} with ${replayBuffer.getEventCount()} events`);
    }
  } catch (e) {
    logger.error(`Failed to save replay: ${e}`);
  }

  // Clean up replay buffer
  cleanupReplayBuffer(state.matchId);
}

/**
 * Record game statistics for all players via the shared game-result writer
 * (XP, level, streak, and achievements — no RPC round-trip).
 */
function recordGameStats(
  state: GameState,
  winner: Faction,
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger
): void {
  try {
    const nonSpectators = Array.from(state.players.values()).filter(p => !p.isSpectator);

    const playerData = nonSpectators.map(p => {
        const extState = state.extendedStates.get(p.oderId);
        const faction = p.role ? getRoleFaction(p.role) : Faction.VILLAGER;
        const isLover = extState?.isLovers || false;

        let isWinner = false;
        if (winner === Faction.LOVERS) {
          isWinner = isLover;
        } else if (winner === Faction.WEREWOLF) {
          isWinner = faction === Faction.WEREWOLF;
        } else if (winner === Faction.VILLAGER) {
          isWinner = faction !== Faction.WEREWOLF;
        }

        // Alive same-faction size (for LAST_STAND / COMEBACK_KING).
        // Neutrals share the villager win bucket; lovers wins size the lovers pair.
        const aliveForSize = nonSpectators
          .filter(other => other.status === PlayerStatus.ALIVE)
          .map(other => ({
            role: other.role,
            isLover: !!state.extendedStates.get(other.oderId)?.isLovers,
          }));
        const playerFactionSize = computePlayerFactionSize({
          winner,
          playerRole: p.role,
          playerIsLover: isLover,
          alivePlayers: aliveForSize,
        });

        return {
          // Shared writer accepts userId; match players use oderId as Nakama user id
          userId: p.oderId,
          oderId: p.oderId,
          role: p.role,
          faction,
          isWinner,
          isAlive: p.status === PlayerStatus.ALIVE,
          isLover,
          seerCheckedWolves: extState?.seerCheckedWolves || 0,
          witchSaved: !!extState?.witchSaved,
          witchPoisonedWolf: !!extState?.witchPoisonedWolf,
          guardSaves: extState?.guardSaves || 0,
          hunterKilledWolf: !!extState?.hunterKilledWolf,
          idiotRevealed: !!extState?.idiotRevealed,
          // Explicit boolean — unknown/omitted must not award SILENT_KILLER
          wasExposed: !!extState?.wasExposed,
          votedOutWolves: extState?.votedOutWolves || 0,
          playerFactionSize,
        };
      });

    applyGameResultStats(nk, logger, {
      players: playerData,
      winner,
      sheriffId: state.sheriffId,
    });
  } catch (e) {
    logger.error(`Failed to record game stats: ${e}`);
  }
}

// ============================================================================
// 警长系统 (Sheriff System)
// ============================================================================

/**
 * Start sheriff campaign phase (first day only)
 */
function startSheriffCampaign(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  // Only run sheriff campaign if enabled and not done yet
  if (!state.config.allowSheriff || state.sheriffElectionDone) {
    return;
  }

  state.phase = GamePhase.SHERIFF_CAMPAIGN;
  state.sheriffCampaignCandidates = [];
  state.sheriffVotes.clear();
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 20000; // 20 seconds to join campaign

  logger.info('Sheriff campaign started');

  // Broadcast campaign start
  broadcastMessage(dispatcher, OpCode.SHERIFF_CAMPAIGN_START, {
    duration: 20,
    alivePlayers: getAlivePlayers(state).map(p => ({
      id: p.oderId,
      name: p.displayName,
      seatNumber: p.seatNumber,
    })),
  });
}

/**
 * Handle player joining sheriff campaign
 */
function handleSheriffCampaignJoin(
  state: GameState,
  player: Player,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.SHERIFF_CAMPAIGN) return;
  if (player.status !== PlayerStatus.ALIVE) return;

  // Check if already a candidate
  if (state.sheriffCampaignCandidates.includes(player.oderId)) {
    return;
  }

  state.sheriffCampaignCandidates.push(player.oderId);
  logger.info(`${player.displayName} joined sheriff campaign`);

  // Broadcast join
  broadcastMessage(dispatcher, OpCode.SHERIFF_CAMPAIGN_JOIN, {
    playerId: player.oderId,
    playerName: player.displayName,
    seatNumber: player.seatNumber,
    totalCandidates: state.sheriffCampaignCandidates.length,
  });
}

/**
 * Handle player quitting sheriff campaign
 */
function handleSheriffCampaignQuit(
  state: GameState,
  player: Player,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.SHERIFF_CAMPAIGN) return;

  const index = state.sheriffCampaignCandidates.indexOf(player.oderId);
  if (index === -1) return;

  state.sheriffCampaignCandidates.splice(index, 1);
  logger.info(`${player.displayName} quit sheriff campaign`);

  // Broadcast quit
  broadcastMessage(dispatcher, OpCode.SHERIFF_CAMPAIGN_QUIT, {
    playerId: player.oderId,
    playerName: player.displayName,
    totalCandidates: state.sheriffCampaignCandidates.length,
  });
}

/**
 * Start sheriff speech phase
 */
function startSheriffSpeech(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  // If no candidates or only one, skip speech phase
  if (state.sheriffCampaignCandidates.length === 0) {
    logger.info('No sheriff candidates, skipping election');
    state.sheriffElectionDone = true;
    transitionToDiscussion(state, dispatcher, logger);
    return;
  }

  if (state.sheriffCampaignCandidates.length === 1) {
    // Only one candidate, auto-elect
    const winnerId = state.sheriffCampaignCandidates[0];
    const winner = state.players.get(winnerId);
    state.sheriffId = winnerId;
    state.sheriffElectionDone = true;

    logger.info(`${winner?.displayName} auto-elected as sheriff (only candidate)`);

    broadcastMessage(dispatcher, OpCode.SHERIFF_ELECTED, {
      sheriffId: winnerId,
      sheriffName: winner?.displayName,
      seatNumber: winner?.seatNumber,
      isAutoElected: true,
    });

    transitionToDiscussion(state, dispatcher, logger);
    return;
  }

  // Multiple candidates, start speech phase
  state.phase = GamePhase.SHERIFF_SPEECH;
  state.campaignSpeakingOrder = [...state.sheriffCampaignCandidates];
  state.currentCampaignSpeaker = state.campaignSpeakingOrder[0];
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 30000; // 30 seconds per speaker

  const speaker = state.players.get(state.currentCampaignSpeaker);
  logger.info(`Sheriff speech started, first speaker: ${speaker?.displayName}`);

  // Broadcast speech start
  broadcastMessage(dispatcher, OpCode.SHERIFF_SPEECH_START, {
    speakerId: state.currentCampaignSpeaker,
    speakerName: speaker?.displayName,
    seatNumber: speaker?.seatNumber,
    speakerIndex: 0,
    totalSpeakers: state.campaignSpeakingOrder.length,
    duration: 30,
  });
}

/**
 * Move to next sheriff speech or voting
 */
function nextSheriffSpeech(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const currentIndex = state.campaignSpeakingOrder.indexOf(state.currentCampaignSpeaker!);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= state.campaignSpeakingOrder.length) {
    // All speeches done, move to voting
    startSheriffVoting(state, dispatcher, logger);
    return;
  }

  // Next speaker
  state.currentCampaignSpeaker = state.campaignSpeakingOrder[nextIndex];
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 30000;

  const speaker = state.players.get(state.currentCampaignSpeaker);
  logger.info(`Next sheriff speaker: ${speaker?.displayName}`);

  broadcastMessage(dispatcher, OpCode.SHERIFF_SPEECH_START, {
    speakerId: state.currentCampaignSpeaker,
    speakerName: speaker?.displayName,
    seatNumber: speaker?.seatNumber,
    speakerIndex: nextIndex,
    totalSpeakers: state.campaignSpeakingOrder.length,
    duration: 30,
  });
}

/**
 * Start sheriff voting phase
 */
function startSheriffVoting(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  state.phase = GamePhase.SHERIFF_VOTING;
  state.sheriffVotes.clear();
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 30000; // 30 seconds to vote

  logger.info('Sheriff voting started');

  // Broadcast voting start
  broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
    phase: GamePhase.SHERIFF_VOTING,
    duration: 30,
    candidates: state.sheriffCampaignCandidates.map(id => {
      const p = state.players.get(id);
      return {
        id,
        name: p?.displayName,
        seatNumber: p?.seatNumber,
      };
    }),
  });
}

/**
 * Handle sheriff vote
 */
function handleSheriffVote(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.SHERIFF_VOTING) return;
  if (player.status !== PlayerStatus.ALIVE) return;

  // Cannot vote for self in sheriff election
  const candidateId = data.candidateId;
  if (!candidateId || !state.sheriffCampaignCandidates.includes(candidateId)) {
    logger.warn(`Invalid sheriff vote target: ${candidateId}`);
    return;
  }

  state.sheriffVotes.set(player.oderId, candidateId);
  logger.info(`${player.displayName} voted for ${candidateId} as sheriff`);

  // Broadcast vote (hide actual target)
  broadcastMessage(dispatcher, OpCode.SHERIFF_VOTE, {
    voterId: player.oderId,
    hasVoted: true,
  });

  // Check if all alive players have voted
  const alivePlayers = getAlivePlayers(state);
  const allVoted = alivePlayers.every(p => state.sheriffVotes.has(p.oderId));

  if (allVoted) {
    processSheriffVotes(state, dispatcher, logger);
  }
}

/**
 * Process sheriff election votes
 */
function processSheriffVotes(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  // Count votes
  const voteCount = new Map<string, number>();
  const voteList: { voterId: string; candidateId: string }[] = [];

  for (const [voterId, candidateId] of state.sheriffVotes) {
    voteList.push({ voterId, candidateId });
    voteCount.set(candidateId, (voteCount.get(candidateId) || 0) + 1);
  }

  // Find winner (highest votes)
  let maxVotes = 0;
  let winnerId: string | null = null;
  let isTie = false;

  for (const [candidateId, count] of voteCount) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = candidateId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  // If tie, no sheriff is elected
  if (isTie) {
    winnerId = null;
    logger.info('Sheriff election ended in tie, no sheriff elected');
  } else if (winnerId) {
    state.sheriffId = winnerId;
    const winner = state.players.get(winnerId);
    logger.info(`${winner?.displayName} elected as sheriff with ${maxVotes} votes`);
  }

  state.sheriffElectionDone = true;

  // Broadcast election result
  const winner = winnerId ? state.players.get(winnerId) : null;
  broadcastMessage(dispatcher, OpCode.SHERIFF_ELECTED, {
    sheriffId: winnerId,
    sheriffName: winner?.displayName,
    seatNumber: winner?.seatNumber,
    votes: voteList,
    voteCount: Array.from(voteCount.entries()).map(([id, count]) => ({
      candidateId: id,
      candidateName: state.players.get(id)?.displayName,
      count,
    })),
    isTie,
  });

  // Continue to day discussion
  transitionToDiscussion(state, dispatcher, logger);
}

/**
 * Transition to day discussion phase
 */
function transitionToDiscussion(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  state.phase = GamePhase.DAY_DISCUSSION;
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + state.config.discussionTime * 1000;

  broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
    phase: GamePhase.DAY_DISCUSSION,
    dayNumber: state.dayNumber,
    duration: state.config.discussionTime,
    sheriffId: state.sheriffId,
  });
}

/**
 * Start sheriff transfer phase (when sheriff dies)
 */
function startSheriffTransfer(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const sheriff = state.players.get(state.sheriffId!);
  if (!sheriff) return;

  state.phase = GamePhase.SHERIFF_TRANSFER;
  state.sheriffTransferTarget = null;
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + 15000; // 15 seconds to transfer

  logger.info(`Sheriff ${sheriff.displayName} died, starting badge transfer`);

  // Broadcast transfer start
  const alivePlayers = getAlivePlayers(state).filter(p => p.oderId !== state.sheriffId);
  broadcastMessage(dispatcher, OpCode.SHERIFF_TRANSFER_START, {
    sheriffId: state.sheriffId,
    sheriffName: sheriff.displayName,
    duration: 15,
    eligiblePlayers: alivePlayers.map(p => ({
      id: p.oderId,
      name: p.displayName,
      seatNumber: p.seatNumber,
    })),
  });
}

/**
 * Handle sheriff badge transfer
 */
function handleSheriffTransfer(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.SHERIFF_TRANSFER) return;
  if (player.oderId !== state.sheriffId) return;

  const targetId = data.targetId;
  const explode = data.explode || false; // Sheriff can choose to destroy the badge

  if (explode) {
    // Sheriff chose to destroy the badge
    state.sheriffId = null;
    logger.info(`Sheriff ${player.displayName} destroyed the badge`);

    broadcastMessage(dispatcher, OpCode.SHERIFF_EXPLODE, {
      sheriffId: player.oderId,
      sheriffName: player.displayName,
    });
  } else if (targetId) {
    const target = state.players.get(targetId);
    if (!target || target.status !== PlayerStatus.ALIVE || targetId === player.oderId) {
      logger.warn(`Invalid sheriff transfer target: ${targetId}`);
      return;
    }

    // Transfer the badge
    state.sheriffId = targetId;
    logger.info(`Sheriff badge transferred from ${player.displayName} to ${target.displayName}`);

    broadcastMessage(dispatcher, OpCode.SHERIFF_TRANSFER_DONE, {
      fromSheriffId: player.oderId,
      fromSheriffName: player.displayName,
      toSheriffId: targetId,
      toSheriffName: target.displayName,
      seatNumber: target.seatNumber,
    });
  }

  // Continue to the appropriate next phase
  finishSheriffTransfer(state, dispatcher, logger);
}

/**
 * Finish sheriff transfer and continue game flow
 */
function finishSheriffTransfer(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const returnPhase = state.previousPhase;
  state.previousPhase = null;
  state.sheriffTransferTarget = null;

  // Check win condition
  const winner = checkWinCondition(state);
  if (winner) {
    endGame(state, winner, dispatcher, logger);
    return;
  }

  // Return to appropriate phase based on where we came from
  if (returnPhase === GamePhase.DAY_DISCUSSION) {
    transitionToDiscussion(state, dispatcher, logger);
  } else if (returnPhase === GamePhase.NIGHT) {
    state.phase = GamePhase.NIGHT;
    state.nightSubPhase = NightSubPhase.WEREWOLF;
    state.dayNumber++;
    clearNightState(state);
    state.phaseStartTime = Date.now();
    state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

    broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
      phase: GamePhase.NIGHT,
      subPhase: NightSubPhase.WEREWOLF,
      dayNumber: state.dayNumber,
      duration: state.config.nightActionTime,
    });
  }
}

/**
 * Check if sheriff needs to transfer badge (called when sheriff dies)
 * Returns true if transfer phase was entered
 */
function checkSheriffTransfer(
  state: GameState,
  deadPlayerId: string,
  returnPhase: GamePhase,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): boolean {
  // Check if dead player is the sheriff
  if (state.sheriffId !== deadPlayerId) {
    return false;
  }

  // Check if there are other alive players to transfer to
  const alivePlayers = getAlivePlayers(state).filter(p => p.oderId !== deadPlayerId);
  if (alivePlayers.length === 0) {
    state.sheriffId = null;
    return false;
  }

  // Enter sheriff transfer phase
  state.previousPhase = returnPhase;
  startSheriffTransfer(state, dispatcher, logger);
  return true;
}

// ============================================================================
// 遗言系统 (Last Words System)
// ============================================================================

/**
 * Start last words phase for a player who was eliminated
 */
function startLastWordsPhase(
  state: GameState,
  eliminatedPlayerId: string,
  deathCause: PlayerStatus,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const eliminatedPlayer = state.players.get(eliminatedPlayerId);
  if (!eliminatedPlayer) return;

  // Check if last words are allowed
  if (!state.config.allowLastWords) {
    logger.info(`Last words disabled, skipping for ${eliminatedPlayer.displayName}`);
    finishLastWordsPhase(state, dispatcher, logger);
    return;
  }

  state.phase = GamePhase.LAST_WORDS;
  state.lastWordsSpeaker = eliminatedPlayerId;
  state.lastWordsMessage = null;
  state.lastWordsDeathCause = deathCause;
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + state.config.lastWordsTime * 1000;

  logger.info(`Last words phase started for ${eliminatedPlayer.displayName}`);

  // Broadcast last words start
  broadcastMessage(dispatcher, OpCode.LAST_WORDS_START, {
    speakerId: eliminatedPlayerId,
    speakerName: eliminatedPlayer.displayName,
    seatNumber: eliminatedPlayer.seatNumber,
    role: eliminatedPlayer.role, // Reveal role when eliminated
    deathCause: getDeathCauseString(deathCause),
    duration: state.config.lastWordsTime,
  });
}

/**
 * Get human-readable death cause string
 */
function getDeathCauseString(cause: PlayerStatus): string {
  switch (cause) {
    case PlayerStatus.DEAD_BY_VOTE:
      return 'vote';
    case PlayerStatus.DEAD_BY_WOLF:
      return 'wolf';
    case PlayerStatus.DEAD_BY_POISON:
      return 'poison';
    case PlayerStatus.DEAD_BY_HUNTER:
      return 'hunter';
    case PlayerStatus.DEAD_BY_ALPHA_WOLF:
      return 'alpha_wolf';
    case PlayerStatus.DEAD_BY_LOVER:
      return 'lover';
    default:
      return 'unknown';
  }
}

/**
 * Handle last words speak message from eliminated player
 */
function handleLastWordsSpeak(
  state: GameState,
  player: Player,
  data: any,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.LAST_WORDS) return;
  if (player.oderId !== state.lastWordsSpeaker) return;

  const { content } = data;
  if (!content || content.trim().length === 0) return;

  // Store the last words message (limit to 500 chars)
  state.lastWordsMessage = content.slice(0, 500);

  logger.info(`${player.displayName} spoke their last words: ${state.lastWordsMessage?.slice(0, 50) || ''}...`);

  // Broadcast the last words to all players
  broadcastMessage(dispatcher, OpCode.LAST_WORDS_SPEAK, {
    speakerId: player.oderId,
    speakerName: player.displayName,
    content: state.lastWordsMessage,
    timestamp: Date.now(),
  });

  // End the last words phase after speaking
  finishLastWordsPhase(state, dispatcher, logger);
}

/**
 * Handle last words skip (player chooses not to speak)
 */
function handleLastWordsSkip(
  state: GameState,
  player: Player,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  if (state.phase !== GamePhase.LAST_WORDS) return;
  if (player.oderId !== state.lastWordsSpeaker) return;

  logger.info(`${player.displayName} skipped their last words`);

  // Broadcast that player skipped
  broadcastMessage(dispatcher, OpCode.LAST_WORDS_END, {
    speakerId: player.oderId,
    speakerName: player.displayName,
    skipped: true,
  });

  // End the last words phase
  finishLastWordsPhase(state, dispatcher, logger);
}

/**
 * Finish last words phase and continue game flow
 */
function finishLastWordsPhase(
  state: GameState,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger
): void {
  const speaker = state.lastWordsSpeaker;
  const speakerPlayer = speaker ? state.players.get(speaker) : null;
  const deathCause = state.lastWordsDeathCause || PlayerStatus.DEAD_BY_VOTE;

  // Clear last words state
  state.lastWordsSpeaker = null;
  state.lastWordsMessage = null;
  state.lastWordsDeathCause = null;

  // Broadcast phase end
  broadcastMessage(dispatcher, OpCode.LAST_WORDS_END, {
    speakerId: speaker,
    speakerName: speakerPlayer?.displayName,
    skipped: false,
  });

  // Check if the eliminated player has death skill (Hunter/Alpha Wolf)
  if (speaker && speakerPlayer) {
    const deadPlayersForSkill = [{
      playerId: speaker,
      cause: deathCause,
    }];

    // Return to NIGHT after death skill phase
    if (checkAndEnterDeathSkillPhase(state, deadPlayersForSkill, GamePhase.NIGHT, dispatcher, logger)) {
      logger.info(`Death skill phase entered after last words`);
      return;
    }
  }

  // Check for sheriff transfer if the eliminated player was sheriff
  if (speaker && checkSheriffTransfer(state, speaker, GamePhase.NIGHT, dispatcher, logger)) {
    logger.info(`Sheriff transfer phase entered after last words`);
    return;
  }

  // Check win condition
  const winner = checkWinCondition(state);
  if (winner) {
    endGame(state, winner, dispatcher, logger);
    return;
  }

  // Move to next night
  state.phase = GamePhase.NIGHT;
  state.nightSubPhase = NightSubPhase.WEREWOLF;
  state.dayNumber++;
  clearNightState(state);
  state.phaseStartTime = Date.now();
  state.phaseEndTime = Date.now() + state.config.nightActionTime * 1000;

  broadcastMessage(dispatcher, OpCode.PHASE_CHANGE, {
    phase: GamePhase.NIGHT,
    subPhase: NightSubPhase.WEREWOLF,
    dayNumber: state.dayNumber,
    duration: state.config.nightActionTime,
  });

  logger.info(`Last words phase finished, transitioning to night ${state.dayNumber}`);
}
