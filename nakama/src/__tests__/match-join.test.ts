/**
 * Match join authorization tests (SEC-03)
 * Private in-progress matches must require password for first-time spectators.
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import {
  createTestGameState,
  createTestPlayer,
  resetPlayerIdCounter,
} from './test-utils';
import {
  evaluateMatchJoinAttempt,
  isPrivateRoomPasswordValid,
  PRIVATE_ROOM_PASSWORD_REJECT,
} from '../werewolf/match_join';
import {
  ConnectionStatus,
  GamePhase,
  Spectator,
} from '../werewolf/types';

function createSpectator(overrides: Partial<Spectator> = {}): Spectator {
  return {
    oderId: overrides.oderId || 'spectator-1',
    odername: overrides.odername || 'spec1',
    displayName: overrides.displayName || 'Spectator 1',
    connection: overrides.connection || ConnectionStatus.CONNECTED,
    joinedAt: overrides.joinedAt || Date.now(),
  };
}

describe('isPrivateRoomPasswordValid', () => {
  test('public rooms always accept', () => {
    expect(isPrivateRoomPasswordValid(null, undefined)).toBe(true);
    expect(isPrivateRoomPasswordValid(null, '')).toBe(true);
  });

  test('private rooms require exact password', () => {
    expect(isPrivateRoomPasswordValid('secret', 'secret')).toBe(true);
    expect(isPrivateRoomPasswordValid('secret', undefined)).toBe(false);
    expect(isPrivateRoomPasswordValid('secret', '')).toBe(false);
    expect(isPrivateRoomPasswordValid('secret', 'wrong')).toBe(false);
  });
});

describe('evaluateMatchJoinAttempt — SEC-03 private mid-game spectator', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('rejects first-time spectator join to private in-progress match without password', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, 'attacker-1', {
      spectator: true,
    });

    expect(result.accept).toBe(false);
    expect(result.rejectMessage).toBe(PRIVATE_ROOM_PASSWORD_REJECT);
  });

  test('rejects first-time spectator join to private in-progress match with wrong password', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const state = createTestGameState({
      phase: GamePhase.DAY_DISCUSSION,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, 'attacker-1', {
      spectator: true,
      password: 'wrong',
    });

    expect(result.accept).toBe(false);
    expect(result.rejectMessage).toBe(PRIVATE_ROOM_PASSWORD_REJECT);
  });

  test('accepts first-time spectator join to private in-progress match with correct password', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, 'viewer-1', {
      spectator: true,
      password: 'room-pass',
    });

    expect(result.accept).toBe(true);
    expect(result.rejectMessage).toBeUndefined();
  });

  test('allows existing spectator reconnect without password', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const spectator = createSpectator({ oderId: 'spec-reconnect' });
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
      spectators: new Map([[spectator.oderId, spectator]]),
    });

    const result = evaluateMatchJoinAttempt(state, spectator.oderId, {
      spectator: true,
    });

    expect(result.accept).toBe(true);
  });

  test('allows existing player reconnect without password', () => {
    const player = createTestPlayer({ oderId: 'player-reconnect' });
    const state = createTestGameState({
      phase: GamePhase.DAY_VOTING,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, player.oderId, {});

    expect(result.accept).toBe(true);
  });

  test('rejects non-spectator join while game in progress', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      password: 'room-pass',
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, 'late-joiner', {
      password: 'room-pass',
    });

    expect(result.accept).toBe(false);
    expect(result.rejectMessage).toBe('Game already in progress');
  });

  test('WAITING private room still requires password for new joins', () => {
    const state = createTestGameState({
      phase: GamePhase.WAITING,
      password: 'lobby-pass',
      players: new Map(),
    });

    expect(
      evaluateMatchJoinAttempt(state, 'user-1', {}).accept
    ).toBe(false);

    expect(
      evaluateMatchJoinAttempt(state, 'user-1', { password: 'lobby-pass' }).accept
    ).toBe(true);
  });

  test('public in-progress match accepts spectator without password', () => {
    const player = createTestPlayer({ oderId: 'host-1' });
    const state = createTestGameState({
      phase: GamePhase.NIGHT,
      password: null,
      players: new Map([[player.oderId, player]]),
    });

    const result = evaluateMatchJoinAttempt(state, 'viewer-1', {
      spectator: true,
    });

    expect(result.accept).toBe(true);
  });
});
