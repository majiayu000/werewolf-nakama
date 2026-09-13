/**
 * Match join authorization helpers
 * Pure logic shared by matchJoinAttempt / matchLeave and unit tests.
 */

import { ConnectionStatus, GamePhase, GameState, Spectator } from './types';

export const PRIVATE_ROOM_PASSWORD_REJECT = '密码错误';

/**
 * Public rooms (password === null) always pass.
 * Private rooms require an exact password string match.
 */
export function isPrivateRoomPasswordValid(
  roomPassword: string | null,
  providedPassword: unknown
): boolean {
  if (roomPassword === null) {
    return true;
  }
  return typeof providedPassword === 'string' && providedPassword === roomPassword;
}

export type JoinAttemptResult = {
  accept: boolean;
  rejectMessage?: string;
};

export type SpectatorLeaveResult =
  | { action: 'removed'; spectatorCount: number }
  | { action: 'disconnected'; spectatorCount: number };

type JoinGameState = Pick<
  GameState,
  'phase' | 'players' | 'spectators' | 'password' | 'config'
>;

type SpectatorLeaveGameState = Pick<GameState, 'phase' | 'spectators'>;

/**
 * Connected spectators only. Disconnected entries stay in the map for
 * password-free reconnect authorization but must not appear in live lists/counts.
 */
export function listActiveSpectators(
  spectators: Map<string, Spectator>
): Spectator[] {
  return Array.from(spectators.values()).filter(
    (s) => s.connection === ConnectionStatus.CONNECTED
  );
}

export function countActiveSpectators(
  spectators: Map<string, Spectator>
): number {
  return listActiveSpectators(spectators).length;
}

/**
 * Decide whether a presence may join a match.
 * Reconnects of existing players/spectators skip password checks.
 * First-time joins (WAITING or mid-game spectator) enforce private-room password.
 */
export function evaluateMatchJoinAttempt(
  gameState: JoinGameState,
  userId: string,
  metadata?: { [key: string]: any } | null
): JoinAttemptResult {
  const isSpectator = metadata?.spectator === true;

  if (gameState.phase !== GamePhase.WAITING) {
    if (gameState.players.has(userId)) {
      return { accept: true };
    }

    // Includes disconnected spectators retained for password-free reconnect.
    if (gameState.spectators.has(userId)) {
      return { accept: true };
    }

    if (isSpectator) {
      if (!isPrivateRoomPasswordValid(gameState.password, metadata?.password)) {
        return {
          accept: false,
          rejectMessage: PRIVATE_ROOM_PASSWORD_REJECT,
        };
      }
      return { accept: true };
    }

    return {
      accept: false,
      rejectMessage: 'Game already in progress',
    };
  }

  if (!isPrivateRoomPasswordValid(gameState.password, metadata?.password)) {
    return {
      accept: false,
      rejectMessage: PRIVATE_ROOM_PASSWORD_REJECT,
    };
  }

  if (!isSpectator && gameState.players.size >= gameState.config.maxPlayers) {
    return {
      accept: false,
      rejectMessage: 'Room is full',
    };
  }

  return { accept: true };
}

/**
 * Apply spectator leave, mirroring player disconnect retention during a match.
 * Removing mid-game would force private-room reconnects through the password gate.
 * spectatorCount is the active (connected) count for client-facing leave events.
 */
export function applySpectatorLeave(
  gameState: SpectatorLeaveGameState,
  userId: string
): SpectatorLeaveResult | null {
  const spectator = gameState.spectators.get(userId);
  if (!spectator) {
    return null;
  }

  if (gameState.phase === GamePhase.WAITING) {
    gameState.spectators.delete(userId);
    return {
      action: 'removed',
      spectatorCount: countActiveSpectators(gameState.spectators),
    };
  }

  spectator.connection = ConnectionStatus.DISCONNECTED;
  return {
    action: 'disconnected',
    spectatorCount: countActiveSpectators(gameState.spectators),
  };
}
