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
  readInviteSecretResult,
  deleteInviteSecret,
  reclaimSecretsForRemovedInvites,
  reclaimExpiredInviteSecrets,
  sweepExpiredInviteSecretsFromStorage,
  maybeSweepExpiredInviteSecrets,
  resetInviteSecretSweepClockForTests,
} from '../werewolf/invite-password';

function createState(password: string | null, playerIds: string[]) {
  const players = new Map<string, unknown>();
  for (const id of playerIds) {
    players.set(id, {});
  }
  return { password, players };
}

function createMockNk() {
  const store = new Map<string, {
    collection: string;
    key: string;
    userId: string;
    permissionRead: number;
    permissionWrite: number;
    value: unknown;
  }>();
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
            collection: write.collection,
            key: write.key,
            userId: write.userId,
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
      storageList(userId: string | undefined, collection: string, limit?: number) {
        const objects = Array.from(store.values())
          .filter((entry) => entry.collection === collection)
          .filter((entry) => !userId || entry.userId === userId)
          .slice(0, limit ?? 100)
          .map((entry) => ({
            collection: entry.collection,
            key: entry.key,
            userId: entry.userId,
            value: entry.value,
            permissionRead: entry.permissionRead,
            permissionWrite: entry.permissionWrite,
            version: '1',
            createTime: 0,
            updateTime: 0,
          }));
        return { objects };
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
    writeInviteSecret(nk, 'inv_abc', 'receiver-1', 'room-secret', 1_700_000_000_000);

    const entry = store.get(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_abc`);
    expect(entry).toBeDefined();
    expect(entry!.permissionRead).toBe(0);
    expect(entry!.permissionWrite).toBe(0);
    expect(entry!.value).toEqual({ password: 'room-secret', expiresAt: 1_700_000_000_000 });
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
    expect(readInviteSecretResult(nk, 'inv_xyz', 'receiver-2')).toEqual({
      status: 'found',
      password: 'join-me',
    });

    deleteInviteSecret(nk, 'inv_xyz', 'receiver-2');
    expect(readInviteSecret(nk, 'inv_xyz', 'receiver-2')).toBeUndefined();
    expect(readInviteSecretResult(nk, 'inv_xyz', 'receiver-2')).toEqual({ status: 'missing' });
  });

  it('reports storage read failures distinctly from missing secrets', () => {
    const nk = {
      storageRead() {
        throw new Error('storage unavailable');
      },
    } as unknown as nkruntime.Nakama;

    const result = readInviteSecretResult(nk, 'inv_err', 'receiver-1');
    expect(result.status).toBe('error');
  });

  it('reclaims secrets when receiver invite metadata is evicted past the retention window', () => {
    const { nk, store } = createMockNk();
    const previous = Array.from({ length: 51 }, (_, i) => {
      const inviteId = `inv_${i}`;
      writeInviteSecret(nk, inviteId, 'receiver-1', `pass-${i}`, Date.now() + 60_000);
      return {
        inviteId,
        receiverId: 'receiver-1',
        status: 'pending',
        expiresAt: Date.now() + 60_000,
      };
    });
    const retained = previous.slice(-50);

    const reclaimed = reclaimSecretsForRemovedInvites(nk, previous, retained);
    expect(reclaimed).toEqual(['inv_0']);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_0`)).toBe(false);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_1`)).toBe(true);
  });

  it('reclaims secrets for pending invites that expired without a later RPC', () => {
    const { nk, store } = createMockNk();
    const now = Date.now();
    writeInviteSecret(nk, 'inv_old', 'receiver-1', 'stale-pass', now - 1);
    writeInviteSecret(nk, 'inv_live', 'receiver-1', 'live-pass', now + 60_000);

    const invites = [
      {
        inviteId: 'inv_old',
        receiverId: 'receiver-1',
        status: 'pending',
        expiresAt: now - 1,
      },
      {
        inviteId: 'inv_live',
        receiverId: 'receiver-1',
        status: 'pending',
        expiresAt: now + 60_000,
      },
    ];

    const reclaimed = reclaimExpiredInviteSecrets(nk, invites, now);
    expect(reclaimed).toEqual(['inv_old']);
    expect(invites[0].status).toBe('expired');
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_old`)).toBe(false);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_live`)).toBe(true);
  });

  it('sweeps expired secrets from storage without requiring invite RPC writes', () => {
    const { nk, store } = createMockNk();
    const now = Date.now();
    writeInviteSecret(nk, 'inv_stale', 'receiver-9', 'gone', now - 5_000);
    writeInviteSecret(nk, 'inv_fresh', 'receiver-9', 'keep', now + 60_000);

    const reclaimed = sweepExpiredInviteSecretsFromStorage(nk, now);
    expect(reclaimed).toEqual(['inv_stale']);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-9:inv_stale`)).toBe(false);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-9:inv_fresh`)).toBe(true);
  });

  it('throttles collection-wide secret sweeps across callers', () => {
    resetInviteSecretSweepClockForTests();
    const { nk, store } = createMockNk();
    const now = 1_700_000_000_000;
    writeInviteSecret(nk, 'inv_a', 'receiver-1', 'a', now - 1);

    expect(maybeSweepExpiredInviteSecrets(nk, now, 60_000)).toEqual(['inv_a']);
    writeInviteSecret(nk, 'inv_b', 'receiver-1', 'b', now - 1);
    expect(maybeSweepExpiredInviteSecrets(nk, now + 1_000, 60_000)).toBeNull();
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_b`)).toBe(true);
    expect(maybeSweepExpiredInviteSecrets(nk, now + 60_000, 60_000)).toEqual(['inv_b']);
  });
});
