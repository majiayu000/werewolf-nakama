/**
 * Invite password signal handler tests
 */

import { describe, it, expect } from 'bun:test';
import {
  INVITE_PASSWORD_SIGNAL_TYPE,
  resolveInvitePassword,
  handleInvitePasswordSignal,
} from '../werewolf/invite-password';

function createState(password: string | null, playerIds: string[]) {
  const players = new Map<string, unknown>();
  for (const id of playerIds) {
    players.set(id, {});
  }
  return { password, players };
}

describe('resolveInvitePassword', () => {
  it('returns password for a current match member', () => {
    const state = createState('secret123', ['host-1', 'player-2']);
    expect(resolveInvitePassword(state, 'host-1')).toEqual({
      ok: true,
      password: 'secret123',
    });
  });

  it('returns null password for public rooms when member invites', () => {
    const state = createState(null, ['host-1']);
    expect(resolveInvitePassword(state, 'host-1')).toEqual({
      ok: true,
      password: null,
    });
  });

  it('rejects non-members', () => {
    const state = createState('secret123', ['host-1']);
    expect(resolveInvitePassword(state, 'outsider')).toEqual({
      ok: false,
      error: 'not_a_member',
    });
  });

  it('rejects empty userId', () => {
    const state = createState('secret123', ['host-1']);
    expect(resolveInvitePassword(state, '')).toEqual({
      ok: false,
      error: 'not_a_member',
    });
  });
});

describe('handleInvitePasswordSignal', () => {
  it('handles get_invite_password signal for members', () => {
    const state = createState('room-pass', ['member-1']);
    const response = handleInvitePasswordSignal(
      state,
      JSON.stringify({ type: INVITE_PASSWORD_SIGNAL_TYPE, userId: 'member-1' })
    );
    expect(response).toBe(JSON.stringify({ ok: true, password: 'room-pass' }));
  });

  it('returns not_a_member for outsiders', () => {
    const state = createState('room-pass', ['member-1']);
    const response = handleInvitePasswordSignal(
      state,
      JSON.stringify({ type: INVITE_PASSWORD_SIGNAL_TYPE, userId: 'stranger' })
    );
    expect(response).toBe(JSON.stringify({ ok: false, error: 'not_a_member' }));
  });

  it('returns null for unrelated signals', () => {
    const state = createState('room-pass', ['member-1']);
    expect(handleInvitePasswordSignal(state, JSON.stringify({ type: 'other' }))).toBeNull();
    expect(handleInvitePasswordSignal(state, 'not-json')).toBeNull();
  });
});
