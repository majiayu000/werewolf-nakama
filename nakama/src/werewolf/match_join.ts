/**
 * Match join authorization helpers
 * Pure logic shared by matchJoinAttempt and unit tests.
 */

import { GamePhase, GameState } from './types';

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

type JoinGameState = Pick<
  GameState,
  'phase' | 'players' | 'spectators' | 'password' | 'config'
>;

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
