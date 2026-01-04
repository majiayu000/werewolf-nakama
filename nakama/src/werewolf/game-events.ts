/**
 * Werewolf Game Events Logger
 *
 * Specialized logging for game-specific events.
 * Provides structured event records for analytics and debugging.
 */

import { logger, LogCategory, ScopedLogger, createMatchLogger } from './logger';
import { metrics, createMatchMetrics, MatchMetrics } from './metrics';

// Game event types
export enum GameEventType {
  // Match lifecycle
  MATCH_CREATED = 'match_created',
  MATCH_STARTED = 'match_started',
  MATCH_ENDED = 'match_ended',
  MATCH_CANCELLED = 'match_cancelled',

  // Player events
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_RECONNECTED = 'player_reconnected',
  PLAYER_READY = 'player_ready',
  PLAYER_DIED = 'player_died',

  // Phase events
  PHASE_CHANGED = 'phase_changed',
  NIGHT_STARTED = 'night_started',
  DAY_STARTED = 'day_started',
  VOTING_STARTED = 'voting_started',
  VOTING_ENDED = 'voting_ended',

  // Skill events
  SKILL_USED = 'skill_used',
  WOLF_KILL = 'wolf_kill',
  SEER_CHECK = 'seer_check',
  WITCH_SAVE = 'witch_save',
  WITCH_POISON = 'witch_poison',
  GUARD_PROTECT = 'guard_protect',
  HUNTER_SHOOT = 'hunter_shoot',
  ALPHA_WOLF_SHOOT = 'alpha_wolf_shoot',
  CUPID_LINK = 'cupid_link',

  // Vote events
  VOTE_CAST = 'vote_cast',
  VOTE_RESULT = 'vote_result',

  // Sheriff events
  SHERIFF_CAMPAIGN = 'sheriff_campaign',
  SHERIFF_ELECTED = 'sheriff_elected',
  SHERIFF_TRANSFER = 'sheriff_transfer',

  // Special events
  IDIOT_REVEALED = 'idiot_revealed',
  LOVER_DIED = 'lover_died',
  GAME_WIN = 'game_win',

  // Security events
  RATE_LIMITED = 'rate_limited',
  CHEAT_DETECTED = 'cheat_detected',
  INVALID_ACTION = 'invalid_action'
}

// Game event data
export interface GameEventData {
  matchId: string;
  eventType: GameEventType;
  timestamp: string;
  day?: number;
  phase?: string;
  actor?: {
    playerId: string;
    playerName: string;
    role?: string;
    seatNumber?: number;
  };
  target?: {
    playerId: string;
    playerName: string;
    role?: string;
    seatNumber?: number;
  };
  result?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Event buffer for batch processing
class GameEventBuffer {
  private events: GameEventData[] = [];
  private maxSize: number;
  private flushCallback?: (events: GameEventData[]) => void;

  constructor(maxSize: number = 100, flushCallback?: (events: GameEventData[]) => void) {
    this.maxSize = maxSize;
    this.flushCallback = flushCallback;
  }

  add(event: GameEventData): void {
    this.events.push(event);
    if (this.events.length >= this.maxSize) {
      this.flush();
    }
  }

  flush(): GameEventData[] {
    const events = [...this.events];
    this.events = [];

    if (events.length > 0) {
      // Log batch summary
      logger.info(LogCategory.GAME, `Flushing ${events.length} game events`, {
        data: {
          count: events.length,
          types: [...new Set(events.map(e => e.eventType))]
        }
      });

      if (this.flushCallback) {
        this.flushCallback(events);
      }
    }

    return events;
  }

  getSize(): number {
    return this.events.length;
  }
}

// Global event buffer
const eventBuffer = new GameEventBuffer(100);

// Core event logging function
function logGameEvent(event: Omit<GameEventData, 'timestamp'>): void {
  const fullEvent: GameEventData = {
    ...event,
    timestamp: new Date().toISOString()
  };

  // Add to buffer
  eventBuffer.add(fullEvent);

  // Log to console
  logger.info(LogCategory.GAME, `Game event: ${event.eventType}`, {
    matchId: event.matchId,
    data: {
      day: event.day,
      phase: event.phase,
      actor: event.actor?.playerName,
      target: event.target?.playerName,
      ...event.metadata
    }
  });
}

// Match event logger - provides scoped logging for a specific match
export interface GameEventLogger {
  // Match lifecycle
  matchCreated: (config: Record<string, unknown>) => void;
  matchStarted: (playerCount: number, roles: string[]) => void;
  matchEnded: (winner: string, duration: number) => void;
  matchCancelled: (reason: string) => void;

  // Player events
  playerJoined: (playerId: string, playerName: string, seatNumber: number) => void;
  playerLeft: (playerId: string, playerName: string, reason: string) => void;
  playerReconnected: (playerId: string, playerName: string) => void;
  playerReady: (playerId: string, playerName: string) => void;
  playerDied: (
    playerId: string,
    playerName: string,
    role: string,
    cause: string,
    killerId?: string,
    killerName?: string
  ) => void;

  // Phase events
  phaseChanged: (from: string, to: string, day: number) => void;
  nightStarted: (day: number) => void;
  dayStarted: (day: number, deaths: string[]) => void;
  votingStarted: (candidates: string[]) => void;
  votingEnded: (result: { eliminated?: string; tied: boolean; votes: Record<string, number> }) => void;

  // Skill events
  wolfKill: (wolves: string[], target: string, targetRole: string) => void;
  seerCheck: (seer: string, target: string, result: string) => void;
  witchSave: (witch: string, target: string) => void;
  witchPoison: (witch: string, target: string) => void;
  guardProtect: (guard: string, target: string) => void;
  hunterShoot: (hunter: string, target: string) => void;
  alphaWolfShoot: (alphaWolf: string, target: string) => void;
  cupidLink: (cupid: string, lover1: string, lover2: string) => void;

  // Vote events
  voteCast: (voter: string, target: string | null, weight: number) => void;

  // Sheriff events
  sheriffCampaign: (candidates: string[]) => void;
  sheriffElected: (sheriff: string, votes: Record<string, number>) => void;
  sheriffTransfer: (from: string, to: string | null) => void;

  // Special events
  idiotRevealed: (idiot: string) => void;
  loverDied: (lover1: string, lover2: string, cause: string) => void;
  gameWin: (faction: string, survivors: string[]) => void;

  // Security events
  rateLimited: (playerId: string, reason: string) => void;
  cheatDetected: (playerId: string, type: string, details: string) => void;
  invalidAction: (playerId: string, action: string, reason: string) => void;

  // Access underlying logger and metrics
  getLogger: () => ScopedLogger;
  getMetrics: () => MatchMetrics;

  // Flush events
  flush: () => GameEventData[];
}

export function createGameEventLogger(matchId: string): GameEventLogger {
  const matchLogger = createMatchLogger(matchId, LogCategory.GAME);
  const matchMetrics = createMatchMetrics(matchId);

  let currentDay = 0;
  let currentPhase = 'waiting';

  const createPlayerInfo = (playerId: string, playerName: string, role?: string, seatNumber?: number) => ({
    playerId,
    playerName,
    role,
    seatNumber
  });

  return {
    // Match lifecycle
    matchCreated: (config: Record<string, unknown>) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.MATCH_CREATED,
        metadata: { config }
      });
      matchMetrics.matchCreated();
    },

    matchStarted: (playerCount: number, roles: string[]) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.MATCH_STARTED,
        metadata: { playerCount, roles }
      });
    },

    matchEnded: (winner: string, duration: number) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.MATCH_ENDED,
        day: currentDay,
        metadata: { winner, duration }
      });
      matchMetrics.matchCompleted(winner, duration);
    },

    matchCancelled: (reason: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.MATCH_CANCELLED,
        metadata: { reason }
      });
      metrics.decrementGauge('werewolf_matches_active');
    },

    // Player events
    playerJoined: (playerId: string, playerName: string, seatNumber: number) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.PLAYER_JOINED,
        actor: createPlayerInfo(playerId, playerName, undefined, seatNumber)
      });
      matchMetrics.playerJoined();
    },

    playerLeft: (playerId: string, playerName: string, reason: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.PLAYER_LEFT,
        actor: createPlayerInfo(playerId, playerName),
        metadata: { reason }
      });
      matchMetrics.playerLeft();
    },

    playerReconnected: (playerId: string, playerName: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.PLAYER_RECONNECTED,
        actor: createPlayerInfo(playerId, playerName)
      });
      matchMetrics.playerReconnected();
    },

    playerReady: (playerId: string, playerName: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.PLAYER_READY,
        actor: createPlayerInfo(playerId, playerName)
      });
    },

    playerDied: (
      playerId: string,
      playerName: string,
      role: string,
      cause: string,
      killerId?: string,
      killerName?: string
    ) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.PLAYER_DIED,
        day: currentDay,
        phase: currentPhase,
        actor: killerId && killerName ? createPlayerInfo(killerId, killerName) : undefined,
        target: createPlayerInfo(playerId, playerName, role),
        metadata: { cause }
      });
    },

    // Phase events
    phaseChanged: (from: string, to: string, day: number) => {
      currentPhase = to;
      currentDay = day;
      logGameEvent({
        matchId,
        eventType: GameEventType.PHASE_CHANGED,
        day,
        phase: to,
        metadata: { from, to }
      });
    },

    nightStarted: (day: number) => {
      currentDay = day;
      currentPhase = 'night';
      logGameEvent({
        matchId,
        eventType: GameEventType.NIGHT_STARTED,
        day,
        phase: 'night'
      });
    },

    dayStarted: (day: number, deaths: string[]) => {
      currentDay = day;
      currentPhase = 'day';
      logGameEvent({
        matchId,
        eventType: GameEventType.DAY_STARTED,
        day,
        phase: 'day',
        metadata: { deaths, deathCount: deaths.length }
      });
    },

    votingStarted: (candidates: string[]) => {
      currentPhase = 'voting';
      logGameEvent({
        matchId,
        eventType: GameEventType.VOTING_STARTED,
        day: currentDay,
        phase: 'voting',
        metadata: { candidates, candidateCount: candidates.length }
      });
    },

    votingEnded: (result: { eliminated?: string; tied: boolean; votes: Record<string, number> }) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.VOTING_ENDED,
        day: currentDay,
        result
      });
    },

    // Skill events
    wolfKill: (wolves: string[], target: string, targetRole: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.WOLF_KILL,
        day: currentDay,
        phase: 'night',
        metadata: { wolves, target, targetRole }
      });
      matchMetrics.skillUsed('werewolf');
    },

    seerCheck: (seer: string, target: string, result: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.SEER_CHECK,
        day: currentDay,
        phase: 'night',
        metadata: { seer, target, result }
      });
      matchMetrics.skillUsed('seer');
    },

    witchSave: (witch: string, target: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.WITCH_SAVE,
        day: currentDay,
        phase: 'night',
        metadata: { witch, target }
      });
      matchMetrics.skillUsed('witch_save');
    },

    witchPoison: (witch: string, target: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.WITCH_POISON,
        day: currentDay,
        phase: 'night',
        metadata: { witch, target }
      });
      matchMetrics.skillUsed('witch_poison');
    },

    guardProtect: (guard: string, target: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.GUARD_PROTECT,
        day: currentDay,
        phase: 'night',
        metadata: { guard, target }
      });
      matchMetrics.skillUsed('guard');
    },

    hunterShoot: (hunter: string, target: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.HUNTER_SHOOT,
        day: currentDay,
        metadata: { hunter, target }
      });
      matchMetrics.skillUsed('hunter');
    },

    alphaWolfShoot: (alphaWolf: string, target: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.ALPHA_WOLF_SHOOT,
        day: currentDay,
        metadata: { alphaWolf, target }
      });
      matchMetrics.skillUsed('alpha_wolf');
    },

    cupidLink: (cupid: string, lover1: string, lover2: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.CUPID_LINK,
        day: 1,
        phase: 'night',
        metadata: { cupid, lover1, lover2 }
      });
      matchMetrics.skillUsed('cupid');
    },

    // Vote events
    voteCast: (voter: string, target: string | null, weight: number) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.VOTE_CAST,
        day: currentDay,
        phase: 'voting',
        metadata: { voter, target, weight, abstained: target === null }
      });
      matchMetrics.voteCast(target === null);
    },

    // Sheriff events
    sheriffCampaign: (candidates: string[]) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.SHERIFF_CAMPAIGN,
        day: currentDay,
        metadata: { candidates, count: candidates.length }
      });
    },

    sheriffElected: (sheriff: string, votes: Record<string, number>) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.SHERIFF_ELECTED,
        day: currentDay,
        metadata: { sheriff, votes }
      });
    },

    sheriffTransfer: (from: string, to: string | null) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.SHERIFF_TRANSFER,
        day: currentDay,
        metadata: { from, to, destroyed: to === null }
      });
    },

    // Special events
    idiotRevealed: (idiot: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.IDIOT_REVEALED,
        day: currentDay,
        metadata: { idiot }
      });
    },

    loverDied: (lover1: string, lover2: string, cause: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.LOVER_DIED,
        day: currentDay,
        metadata: { lover1, lover2, cause }
      });
    },

    gameWin: (faction: string, survivors: string[]) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.GAME_WIN,
        day: currentDay,
        result: { faction, survivors, survivorCount: survivors.length }
      });
    },

    // Security events
    rateLimited: (playerId: string, reason: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.RATE_LIMITED,
        actor: createPlayerInfo(playerId, 'unknown'),
        metadata: { reason }
      });
      matchMetrics.antiCheatViolation('rate_limit');
    },

    cheatDetected: (playerId: string, type: string, details: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.CHEAT_DETECTED,
        actor: createPlayerInfo(playerId, 'unknown'),
        metadata: { type, details }
      });
      matchMetrics.antiCheatViolation(type);
      logger.warn(LogCategory.SECURITY, `Cheat detected: ${type}`, {
        matchId,
        playerId,
        data: { details }
      });
    },

    invalidAction: (playerId: string, action: string, reason: string) => {
      logGameEvent({
        matchId,
        eventType: GameEventType.INVALID_ACTION,
        actor: createPlayerInfo(playerId, 'unknown'),
        metadata: { action, reason }
      });
      matchMetrics.error('invalid_action');
    },

    // Access underlying logger and metrics
    getLogger: () => matchLogger,
    getMetrics: () => matchMetrics,

    // Flush events
    flush: () => eventBuffer.flush()
  };
}

// Export event buffer for external access
export function flushGameEvents(): GameEventData[] {
  return eventBuffer.flush();
}

export function getGameEventBufferSize(): number {
  return eventBuffer.getSize();
}
