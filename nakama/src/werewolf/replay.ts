/**
 * Werewolf Game Replay System
 *
 * Stores and retrieves complete game replays for later viewing.
 * Uses Nakama storage for persistence.
 */

import { GameEventData, GameEventType } from './game-events';
import { Role, Faction, GamePhase } from './types';

// ============================================================================
// Replay Types
// ============================================================================

/** Player snapshot for replay */
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

/** Game configuration snapshot */
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

/** Replay metadata */
export interface ReplayMeta {
  id: string;
  matchId: string;
  createdAt: string;
  endedAt: string;
  duration: number;  // in seconds
  playerCount: number;
  winner: Faction | 'lovers' | null;
  days: number;
  config: ReplayConfig;
  players: ReplayPlayer[];
}

/** Complete replay data */
export interface GameReplay {
  meta: ReplayMeta;
  events: ReplayEvent[];
}

/** Single replay event (simplified from GameEventData) */
export interface ReplayEvent {
  type: GameEventType;
  timestamp: number;  // relative to game start in ms
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

/** Replay list item (minimal info for listing) */
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

// ============================================================================
// Replay Buffer (for collecting events during game)
// ============================================================================

/** In-memory buffer for collecting replay events during a game */
export class ReplayBuffer {
  private matchId: string;
  private events: ReplayEvent[] = [];
  private startTime: number;
  private players: Map<string, ReplayPlayer> = new Map();
  private config: ReplayConfig | null = null;
  private currentDay: number = 0;
  private currentPhase: string = 'waiting';

  constructor(matchId: string) {
    this.matchId = matchId;
    this.startTime = Date.now();
  }

  /** Set game configuration */
  setConfig(config: ReplayConfig): void {
    this.config = config;
  }

  /** Add or update player info */
  setPlayer(player: ReplayPlayer): void {
    this.players.set(player.id, player);
  }

  /** Update player state */
  updatePlayer(playerId: string, updates: Partial<ReplayPlayer>): void {
    const player = this.players.get(playerId);
    if (player) {
      this.players.set(playerId, { ...player, ...updates });
    }
  }

  /** Set current day/phase for events */
  setPhase(day: number, phase: string): void {
    this.currentDay = day;
    this.currentPhase = phase;
  }

  /** Add a replay event */
  addEvent(event: Omit<ReplayEvent, 'timestamp' | 'day' | 'phase'> & { day?: number; phase?: string }): void {
    this.events.push({
      ...event,
      timestamp: Date.now() - this.startTime,
      day: event.day ?? this.currentDay,
      phase: event.phase ?? this.currentPhase
    });
  }

  /** Convert GameEventData to ReplayEvent and add */
  addFromGameEvent(gameEvent: GameEventData): void {
    const event: ReplayEvent = {
      type: gameEvent.eventType,
      timestamp: Date.now() - this.startTime,
      day: gameEvent.day ?? this.currentDay,
      phase: gameEvent.phase ?? this.currentPhase
    };

    if (gameEvent.actor) {
      event.actor = {
        id: gameEvent.actor.playerId,
        name: gameEvent.actor.playerName,
        seat: gameEvent.actor.seatNumber ?? 0,
        role: gameEvent.actor.role as Role | undefined
      };
    }

    if (gameEvent.target) {
      event.target = {
        id: gameEvent.target.playerId,
        name: gameEvent.target.playerName,
        seat: gameEvent.target.seatNumber ?? 0,
        role: gameEvent.target.role as Role | undefined
      };
    }

    if (gameEvent.metadata || gameEvent.result) {
      event.data = { ...gameEvent.metadata, ...gameEvent.result };
    }

    this.events.push(event);
  }

  /** Build complete replay object */
  build(winner: Faction | 'lovers' | null, endTime?: number): GameReplay {
    const endedAt = endTime ?? Date.now();
    const duration = Math.floor((endedAt - this.startTime) / 1000);

    const meta: ReplayMeta = {
      id: `replay_${this.matchId}_${this.startTime}`,
      matchId: this.matchId,
      createdAt: new Date(this.startTime).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      duration,
      playerCount: this.players.size,
      winner,
      days: this.currentDay,
      config: this.config ?? {
        maxPlayers: this.players.size,
        roles: [],
        discussionTime: 120,
        votingTime: 60,
        nightActionTime: 30,
        allowSheriff: true,
        allowLastWords: true,
        isPrivate: false
      },
      players: Array.from(this.players.values())
    };

    return {
      meta,
      events: this.events
    };
  }

  /** Get current event count */
  getEventCount(): number {
    return this.events.length;
  }
}

// ============================================================================
// Replay Storage (Nakama Integration)
// ============================================================================

const REPLAY_COLLECTION = 'game_replays';
const REPLAY_LIST_COLLECTION = 'replay_list';
const MAX_REPLAYS_PER_USER = 50;

/** Save a game replay to storage */
export function saveReplay(
  nk: nkruntime.Nakama,
  replay: GameReplay,
  participantIds: string[]
): void {
  const replayId = replay.meta.id;

  // Store the full replay (accessible by all participants)
  const replayWrite: nkruntime.StorageWriteRequest = {
    collection: REPLAY_COLLECTION,
    key: replayId,
    userId: participantIds[0], // Store under first player's account
    value: replay,
    permissionRead: 2, // Public read
    permissionWrite: 0 // No write
  };

  try {
    nk.storageWrite([replayWrite]);
  } catch (error) {
    nk.logger.error(`Failed to save replay ${replayId}: ${error}`);
    return;
  }

  // Add to each participant's replay list
  for (const playerId of participantIds) {
    try {
      addToUserReplayList(nk, playerId, replay);
    } catch (error) {
      nk.logger.warn(`Failed to add replay to user ${playerId}'s list: ${error}`);
    }
  }

  nk.logger.info(`Saved replay ${replayId} for ${participantIds.length} players`);
}

/** Add replay to user's replay list */
function addToUserReplayList(
  nk: nkruntime.Nakama,
  userId: string,
  replay: GameReplay
): void {
  // Find user's role and result
  const userPlayer = replay.meta.players.find(p => p.id === userId);
  const myRole = userPlayer?.role;
  const myFaction = userPlayer?.faction;

  let myResult: 'win' | 'lose' | undefined;
  if (replay.meta.winner && myFaction) {
    if (replay.meta.winner === 'lovers') {
      myResult = userPlayer?.isLover ? 'win' : 'lose';
    } else {
      myResult = replay.meta.winner === myFaction ? 'win' : 'lose';
    }
  }

  const listItem: ReplayListItem = {
    id: replay.meta.id,
    matchId: replay.meta.matchId,
    createdAt: replay.meta.createdAt,
    duration: replay.meta.duration,
    playerCount: replay.meta.playerCount,
    winner: replay.meta.winner,
    days: replay.meta.days,
    myRole,
    myResult
  };

  // Read current list
  let replayList: ReplayListItem[] = [];
  try {
    const objects = nk.storageRead([{
      collection: REPLAY_LIST_COLLECTION,
      key: 'list',
      userId
    }]);
    if (objects.length > 0 && objects[0].value) {
      replayList = (objects[0].value as { replays: ReplayListItem[] }).replays || [];
    }
  } catch {
    // New list
  }

  // Add new replay at the beginning
  replayList.unshift(listItem);

  // Keep only the most recent replays
  if (replayList.length > MAX_REPLAYS_PER_USER) {
    replayList = replayList.slice(0, MAX_REPLAYS_PER_USER);
  }

  // Write updated list
  nk.storageWrite([{
    collection: REPLAY_LIST_COLLECTION,
    key: 'list',
    userId,
    value: { replays: replayList },
    permissionRead: 1, // Owner read
    permissionWrite: 0 // No write (system only)
  }]);
}

/** Get user's replay list */
export function getUserReplays(
  nk: nkruntime.Nakama,
  userId: string,
  limit: number = 20,
  offset: number = 0
): { replays: ReplayListItem[]; total: number } {
  try {
    const objects = nk.storageRead([{
      collection: REPLAY_LIST_COLLECTION,
      key: 'list',
      userId
    }]);

    if (objects.length === 0 || !objects[0].value) {
      return { replays: [], total: 0 };
    }

    const allReplays = (objects[0].value as { replays: ReplayListItem[] }).replays || [];
    const total = allReplays.length;
    const replays = allReplays.slice(offset, offset + limit);

    return { replays, total };
  } catch (error) {
    nk.logger.error(`Failed to get replays for user ${userId}: ${error}`);
    return { replays: [], total: 0 };
  }
}

/** Get a specific replay by ID */
export function getReplay(
  nk: nkruntime.Nakama,
  replayId: string
): GameReplay | null {
  try {
    // Try to find the replay - it could be stored under any participant
    // We'll use a query to find it
    const cursor = nk.storageFetch([{
      collection: REPLAY_COLLECTION,
      key: replayId,
      userId: undefined // Will match any user
    }]);

    // Since we can't query without userId, we need a different approach
    // Let's extract the matchId from replayId and search
    const parts = replayId.split('_');
    if (parts.length < 3) {
      return null;
    }

    // The replayId format is: replay_{matchId}_{timestamp}
    // We need to find who owns this replay

    // For now, we'll try to read it using storage list
    const objects = nk.storageList(undefined, REPLAY_COLLECTION, 100, undefined);

    for (const obj of objects.objects || []) {
      if (obj.key === replayId) {
        return nk.storageRead([{
          collection: REPLAY_COLLECTION,
          key: replayId,
          userId: obj.userId
        }])[0]?.value as GameReplay;
      }
    }

    return null;
  } catch (error) {
    nk.logger.error(`Failed to get replay ${replayId}: ${error}`);
    return null;
  }
}

/** Get replay by ID with known owner */
export function getReplayByOwner(
  nk: nkruntime.Nakama,
  replayId: string,
  ownerId: string
): GameReplay | null {
  try {
    const objects = nk.storageRead([{
      collection: REPLAY_COLLECTION,
      key: replayId,
      userId: ownerId
    }]);

    if (objects.length === 0) {
      return null;
    }

    return objects[0].value as GameReplay;
  } catch (error) {
    nk.logger.error(`Failed to get replay ${replayId}: ${error}`);
    return null;
  }
}

// ============================================================================
// Replay Helpers
// ============================================================================

/** Create a replay buffer for a new game */
export function createReplayBuffer(matchId: string): ReplayBuffer {
  return new ReplayBuffer(matchId);
}

/** Get key events for replay summary */
export function getKeyEvents(replay: GameReplay): ReplayEvent[] {
  const keyEventTypes = new Set([
    GameEventType.MATCH_STARTED,
    GameEventType.PLAYER_DIED,
    GameEventType.PHASE_CHANGED,
    GameEventType.WOLF_KILL,
    GameEventType.VOTE_RESULT,
    GameEventType.SHERIFF_ELECTED,
    GameEventType.IDIOT_REVEALED,
    GameEventType.LOVER_DIED,
    GameEventType.GAME_WIN
  ]);

  return replay.events.filter(e => keyEventTypes.has(e.type));
}

/** Calculate replay statistics */
export function getReplayStats(replay: GameReplay): {
  totalKills: number;
  wolfKills: number;
  witchSaves: number;
  witchPoisons: number;
  hunterShots: number;
  votedOut: number;
  skillsUsed: number;
} {
  let totalKills = 0;
  let wolfKills = 0;
  let witchSaves = 0;
  let witchPoisons = 0;
  let hunterShots = 0;
  let votedOut = 0;
  let skillsUsed = 0;

  for (const event of replay.events) {
    switch (event.type) {
      case GameEventType.PLAYER_DIED:
        totalKills++;
        break;
      case GameEventType.WOLF_KILL:
        wolfKills++;
        skillsUsed++;
        break;
      case GameEventType.WITCH_SAVE:
        witchSaves++;
        skillsUsed++;
        break;
      case GameEventType.WITCH_POISON:
        witchPoisons++;
        skillsUsed++;
        break;
      case GameEventType.HUNTER_SHOOT:
      case GameEventType.ALPHA_WOLF_SHOOT:
        hunterShots++;
        skillsUsed++;
        break;
      case GameEventType.VOTE_RESULT:
        if (event.data?.eliminated) {
          votedOut++;
        }
        break;
      case GameEventType.SEER_CHECK:
      case GameEventType.GUARD_PROTECT:
      case GameEventType.CUPID_LINK:
        skillsUsed++;
        break;
    }
  }

  return {
    totalKills,
    wolfKills,
    witchSaves,
    witchPoisons,
    hunterShots,
    votedOut,
    skillsUsed
  };
}
