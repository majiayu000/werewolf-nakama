/**
 * Invite password signal handler tests
 */

import { describe, it, expect } from 'bun:test';
import {
  INVITE_PASSWORD_SIGNAL_TYPE,
  INVITE_SECRET_COLLECTION,
  INVITE_SECRET_SWEEP_LEADERBOARD_ID,
  STORAGE_LIST_ALL_OWNERS,
  resolveInvitePassword,
  handleInvitePasswordSignal,
  stripInvitePassword,
  writeInviteSecret,
  readInviteSecret,
  readInviteSecretResult,
  deleteInviteSecret,
  reclaimSecretsForRemovedInvites,
  reclaimExpiredInviteSecrets,
  expireAcceptedInviteRetryIfNeeded,
  sweepExpiredInviteSecretsFromStorage,
  maybeSweepExpiredInviteSecrets,
  migrateLegacyInvitePasswordIfNeeded,
  resetInviteSecretSweepClockForTests,
  startInviteSecretExpiryScheduler,
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
  const storageListCalls: Array<{ userId: string; collection: string }> = [];

  return {
    store,
    storageListCalls,
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
      // Mirror Nakama 3.21.1: userId must be a string; '' lists across owners.
      storageList(userId: string, collection: string, limit?: number, cursor?: string) {
        if (typeof userId !== 'string') {
          throw new Error('storageList userId must be a string; use "" for all users');
        }
        storageListCalls.push({ userId, collection });
        const pageSize = limit ?? 100;
        const all = Array.from(store.values())
          .filter((entry) => entry.collection === collection)
          .filter((entry) => userId === STORAGE_LIST_ALL_OWNERS || entry.userId === userId)
          .sort((a, b) => a.key.localeCompare(b.key));
        const start = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
        const slice = all.slice(start, start + pageSize);
        const next = start + pageSize;
        const objects = slice.map((entry) => ({
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
        return {
          objects,
          cursor: next < all.length ? String(next) : undefined,
        };
      },
      leaderboardCreate() {
        return undefined;
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

  it('rejects accepted retries after expiresAt even when the throttled sweep has not run', () => {
    const { nk, store } = createMockNk();
    const now = 1_700_000_000_000;
    writeInviteSecret(nk, 'inv_accepted', 'receiver-1', 'still-there', now - 1);

    const invite = {
      inviteId: 'inv_accepted',
      receiverId: 'receiver-1',
      status: 'accepted',
      expiresAt: now - 1,
    };

    // Secret remains readable because the collection sweep is throttled / lagging.
    expect(readInviteSecret(nk, 'inv_accepted', 'receiver-1')).toBe('still-there');

    expect(expireAcceptedInviteRetryIfNeeded(nk, invite, now)).toBe(true);
    expect(invite.status).toBe('expired');
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_accepted`)).toBe(false);
    expect(readInviteSecret(nk, 'inv_accepted', 'receiver-1')).toBeUndefined();
  });

  it('allows accepted retries before expiresAt without deleting the credential', () => {
    const { nk, store } = createMockNk();
    const now = 1_700_000_000_000;
    writeInviteSecret(nk, 'inv_live_accept', 'receiver-1', 'join-pass', now + 60_000);

    const invite = {
      inviteId: 'inv_live_accept',
      receiverId: 'receiver-1',
      status: 'accepted',
      expiresAt: now + 60_000,
    };

    expect(expireAcceptedInviteRetryIfNeeded(nk, invite, now)).toBe(false);
    expect(invite.status).toBe('accepted');
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-1:inv_live_accept`)).toBe(true);
    expect(readInviteSecret(nk, 'inv_live_accept', 'receiver-1')).toBe('join-pass');
  });

  it('sweeps expired secrets from storage without requiring invite RPC writes', () => {
    const { nk, store, storageListCalls } = createMockNk();
    const now = Date.now();
    writeInviteSecret(nk, 'inv_stale', 'receiver-9', 'gone', now - 5_000);
    writeInviteSecret(nk, 'inv_fresh', 'receiver-9', 'keep', now + 60_000);

    const reclaimed = sweepExpiredInviteSecretsFromStorage(nk, now);
    expect(reclaimed).toEqual(['inv_stale']);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-9:inv_stale`)).toBe(false);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-9:inv_fresh`)).toBe(true);
    expect(storageListCalls.every((call) => call.userId === STORAGE_LIST_ALL_OWNERS)).toBe(true);
  });

  it('pages through the entire invite-secret collection during expiry sweeps', () => {
    const { nk, store } = createMockNk();
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
      const inviteId = `inv_page_${String(i).padStart(2, '0')}`;
      writeInviteSecret(nk, inviteId, 'receiver-page', `pass-${i}`, now - 1);
    }
    writeInviteSecret(nk, 'inv_page_live', 'receiver-page', 'keep', now + 60_000);

    const reclaimed = sweepExpiredInviteSecretsFromStorage(nk, now, 10);
    expect(reclaimed).toHaveLength(25);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-page:inv_page_live`)).toBe(true);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-page:inv_page_00`)).toBe(false);
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-page:inv_page_24`)).toBe(false);
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

  it('migrates legacy inline passwords into server-only secret storage', () => {
    const { nk, store } = createMockNk();
    const invite = {
      inviteId: 'inv_legacy',
      receiverId: 'receiver-legacy',
      password: 'old-inline-pass',
      expiresAt: Date.now() + 60_000,
    };

    const migrated = migrateLegacyInvitePasswordIfNeeded(
      nk,
      invite,
      { status: 'missing' }
    );

    expect(migrated).toEqual({ status: 'found', password: 'old-inline-pass' });
    expect(invite.requiresPassword).toBe(true);
    expect(invite.password).toBeUndefined();
    expect(store.get(`${INVITE_SECRET_COLLECTION}:receiver-legacy:inv_legacy`)?.value).toEqual({
      password: 'old-inline-pass',
      expiresAt: invite.expiresAt,
    });
  });

  it('does not migrate when a server-only secret already exists', () => {
    const { nk } = createMockNk();
    writeInviteSecret(nk, 'inv_present', 'receiver-1', 'secret-pass', Date.now() + 60_000);
    const invite = {
      inviteId: 'inv_present',
      receiverId: 'receiver-1',
      password: 'stale-inline',
      requiresPassword: true,
    };

    const result = migrateLegacyInvitePasswordIfNeeded(
      nk,
      invite,
      { status: 'found', password: 'secret-pass' }
    );

    expect(result).toEqual({ status: 'found', password: 'secret-pass' });
    expect(invite.password).toBe('stale-inline');
  });

  it('registers a recurring leaderboard-reset scheduler for idle-server expiry', () => {
    const { nk, store } = createMockNk();
    const now = Date.now();
    writeInviteSecret(nk, 'inv_cron', 'receiver-cron', 'stale', now - 1);

    let resetHandler:
      | ((
          ctx: nkruntime.Context,
          logger: nkruntime.Logger,
          nk: nkruntime.Nakama,
          leaderboard: { id?: string },
          reset: number
        ) => void)
      | null = null;

    const logger = {
      info() {},
      warn() {},
      error() {},
      debug() {},
    } as unknown as nkruntime.Logger;

    startInviteSecretExpiryScheduler(nk, logger, {
      registerLeaderboardReset(fn) {
        resetHandler = fn;
      },
    });

    expect(resetHandler).not.toBeNull();
    resetHandler!(
      {} as nkruntime.Context,
      logger,
      nk,
      { id: INVITE_SECRET_SWEEP_LEADERBOARD_ID },
      0
    );
    expect(store.has(`${INVITE_SECRET_COLLECTION}:receiver-cron:inv_cron`)).toBe(false);
  });
});
