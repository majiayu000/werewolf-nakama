/**
 * Invite password signal handler tests
 */

import { describe, it, expect } from 'bun:test';
import {
  INVITE_PASSWORD_SIGNAL_TYPE,
  INVITE_SECRET_COLLECTION,
  resolveInvitePassword,
  handleInvitePasswordSignal,
  stripInvitePassword,
  writeInviteSecret,
  readInviteSecret,
  deleteInviteSecret,
} from '../werewolf/invite-password';

function createState(password: string | null, playerIds: string[]) {
  const players = new Map<string, unknown>();
  for (const id of playerIds) {
    players.set(id, {});
  }
  return { password, players };
}

function createMockNk() {
  const store = new Map<string, { permissionRead: number; permissionWrite: number; value: unknown }>();
  const keyOf = (collection: string, key: string, userId: string) =>
    `${collection}:${userId}:${key}`;

  return {
    store,
    nk: {
      storageWrite(writes: Array<{
        collection: string;
        key: string;
        userId: string;
        value: unknown;
        permissionRead?: number;
        permissionWrite?: number;
      }>) {
        for (const write of writes) {
          store.set(keyOf(write.collection, write.key, write.userId), {
            permissionRead: write.permissionRead ?? 1,
            permissionWrite: write.permissionWrite ?? 0,
            value: write.value,
          });
        }
        return [];
      },
      storageRead(reads: Array<{ collection: string; key: string; userId: string }>) {
        return reads.flatMap((read) => {
          const entry = store.get(keyOf(read.collection, read.key, read.userId));
          if (!entry) return [];
          return [{
            collection: read.collection,
            key: read.key,
            userId: read.userId,
            value: entry.value,
            permissionRead: entry.permissionRead,
            permissionWrite: entry.permissionWrite,
            version: '1',
            createTime: 0,
            updateTime: 0,
          }];
        });
      },
      storageDelete(deletes: Array<{ collection: string; key: string; userId: string }>) {
        for (const del of deletes) {
          store.delete(keyOf(del.collection, del.key, del.userId));
        }
      },
    } as unknown as nkruntime.Nakama,
  };
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

describe('invite secret storage', () => {
  it('strips password from invite metadata objects', () => {
    const stripped = stripInvitePassword({
      inviteId: 'inv_1',
      matchId: 'match_1',
      password: 'should-not-leak',
      status: 'pending',
    });
    expect(stripped).toEqual({
      inviteId: 'inv_1',
      matchId: 'match_1',
      status: 'pending',
    });
    expect('password' in stripped).toBe(false);
  });

  it('writes secrets with permissionRead 0 so clients cannot read them', () => {
    const { nk, store } = createMockNk();
    writeInviteSecret(nk, 'inv_abc', 'receiver-1', 'room-secret');

    const entry = store.get(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_abc`);
    expect(entry).toBeDefined();
    expect(entry!.permissionRead).toBe(0);
    expect(entry!.permissionWrite).toBe(0);
    expect(entry!.value).toEqual({ password: 'room-secret' });
  });

  it('skips writing secrets for public rooms', () => {
    const { nk, store } = createMockNk();
    writeInviteSecret(nk, 'inv_public', 'receiver-1', null);
    writeInviteSecret(nk, 'inv_empty', 'receiver-1', undefined);
    writeInviteSecret(nk, 'inv_blank', 'receiver-1', '');
    expect(store.size).toBe(0);
  });

  it('reads and deletes invite secrets', () => {
    const { nk } = createMockNk();
    writeInviteSecret(nk, 'inv_xyz', 'receiver-2', 'join-me');
    expect(readInviteSecret(nk, 'inv_xyz', 'receiver-2')).toBe('join-me');

    deleteInviteSecret(nk, 'inv_xyz', 'receiver-2');
    expect(readInviteSecret(nk, 'inv_xyz', 'receiver-2')).toBeUndefined();
  });
});
