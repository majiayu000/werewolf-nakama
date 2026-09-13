/**
 * Invite password resolution via matchSignal.
 * Password lives in authoritative GameState and is omitted from public match labels.
 *
 * Invite credentials are also persisted in server-only storage (permissionRead: 0)
 * so clients cannot recover them via the Nakama storage API.
 */

export const INVITE_PASSWORD_SIGNAL_TYPE = 'get_invite_password';

/** Server-only collection for invite join credentials (not client-readable). */
export const INVITE_SECRET_COLLECTION = 'werewolf_invite_secrets';

export interface InvitePasswordSignalRequest {
  type: typeof INVITE_PASSWORD_SIGNAL_TYPE;
  userId: string;
}

export interface InvitePasswordSignalResponse {
  ok: boolean;
  password?: string | null;
  error?: string;
}

/** Minimal state shape needed to authorize invite password access. */
export interface InvitePasswordState {
  password: string | null;
  players: Map<string, unknown>;
}

export interface InviteWithOptionalPassword {
  password?: string;
  [key: string]: unknown;
}

/** Invite metadata fields needed to reclaim orphaned secrets. */
export interface InviteSecretReclaimTarget {
  inviteId: string;
  receiverId: string;
  status?: string;
  expiresAt?: number;
}

export type InviteSecretReadResult =
  | { status: 'found'; password: string }
  | { status: 'missing' }
  | { status: 'error'; error: unknown };

interface InviteSecretValue {
  password?: string;
  expiresAt?: number;
}

/**
 * Strip password from an invite object before writing client-readable storage.
 */
export function stripInvitePassword<T extends InviteWithOptionalPassword>(
  invite: T
): Omit<T, 'password'> {
  const { password: _password, ...rest } = invite;
  return rest;
}

/**
 * Persist invite password in server-only storage (permissionRead/Write: 0).
 * No-op when password is null/undefined/empty (public rooms).
 */
export function writeInviteSecret(
  nk: nkruntime.Nakama,
  inviteId: string,
  ownerUserId: string,
  password: string | null | undefined,
  expiresAt?: number
): void {
  if (!password) {
    return;
  }

  const value: InviteSecretValue = { password };
  if (typeof expiresAt === 'number') {
    value.expiresAt = expiresAt;
  }

  nk.storageWrite([{
    collection: INVITE_SECRET_COLLECTION,
    key: inviteId,
    userId: ownerUserId,
    value,
    permissionRead: 0, // Server only — clients cannot read via storage API
    permissionWrite: 0,
  }]);
}

/**
 * Read invite password from server-only storage with explicit missing/error status.
 */
export function readInviteSecretResult(
  nk: nkruntime.Nakama,
  inviteId: string,
  ownerUserId: string
): InviteSecretReadResult {
  try {
    const objects = nk.storageRead([{
      collection: INVITE_SECRET_COLLECTION,
      key: inviteId,
      userId: ownerUserId,
    }]);
    if (objects.length > 0 && objects[0].value) {
      const value = objects[0].value as InviteSecretValue;
      if (typeof value.password === 'string' && value.password.length > 0) {
        return { status: 'found', password: value.password };
      }
    }
    return { status: 'missing' };
  } catch (error) {
    return { status: 'error', error };
  }
}

/**
 * Read invite password from server-only storage.
 * Prefer readInviteSecretResult when missing secrets must not be treated as public rooms.
 */
export function readInviteSecret(
  nk: nkruntime.Nakama,
  inviteId: string,
  ownerUserId: string
): string | undefined {
  const result = readInviteSecretResult(nk, inviteId, ownerUserId);
  return result.status === 'found' ? result.password : undefined;
}

/**
 * Delete invite password from server-only storage (cancel / decline / expire / accept).
 */
export function deleteInviteSecret(
  nk: nkruntime.Nakama,
  inviteId: string,
  ownerUserId: string
): void {
  try {
    nk.storageDelete([{
      collection: INVITE_SECRET_COLLECTION,
      key: inviteId,
      userId: ownerUserId,
    }]);
  } catch {
    // Ignore delete failures for missing keys
  }
}

/**
 * Delete secrets for invites removed from the receiver's metadata list
 * (e.g. last-50 eviction of received invites).
 *
 * Do NOT call this for the sender's sent-invite list: sender-list eviction
 * must not delete receiver-owned secrets while the receiver copy is still pending.
 */
export function reclaimSecretsForRemovedInvites(
  nk: nkruntime.Nakama,
  previousInvites: InviteSecretReclaimTarget[],
  retainedInvites: InviteSecretReclaimTarget[]
): string[] {
  const retainedIds = new Set(retainedInvites.map((invite) => invite.inviteId));
  const reclaimed: string[] = [];

  for (const invite of previousInvites) {
    if (retainedIds.has(invite.inviteId)) {
      continue;
    }
    deleteInviteSecret(nk, invite.inviteId, invite.receiverId);
    reclaimed.push(invite.inviteId);
  }

  return reclaimed;
}

/**
 * Delete secrets for pending invites whose expiresAt has passed.
 * Mutates invite.status to 'expired' when a terminal reclaim occurs.
 */
export function reclaimExpiredInviteSecrets(
  nk: nkruntime.Nakama,
  invites: InviteSecretReclaimTarget[],
  now: number = Date.now()
): string[] {
  const reclaimed: string[] = [];

  for (const invite of invites) {
    if (invite.status !== 'pending') {
      continue;
    }
    if (typeof invite.expiresAt !== 'number' || invite.expiresAt >= now) {
      continue;
    }
    invite.status = 'expired';
    deleteInviteSecret(nk, invite.inviteId, invite.receiverId);
    reclaimed.push(invite.inviteId);
  }

  return reclaimed;
}

/** Minimum interval between collection-wide invite-secret expiry sweeps. */
export const INVITE_SECRET_SWEEP_INTERVAL_MS = 60_000;

let lastInviteSecretSweepAt = 0;

/**
 * Normalize nk.storageList return shapes used across this codebase
 * (array vs { objects, cursor }).
 */
function listStoragePage(
  listed: nkruntime.StorageObjectList | nkruntime.StorageObject[] | null | undefined
): { objects: nkruntime.StorageObject[]; cursor?: string } {
  if (!listed) {
    return { objects: [] };
  }
  if (Array.isArray(listed)) {
    return { objects: listed };
  }
  return {
    objects: listed.objects || [],
    cursor: listed.cursor || undefined,
  };
}

/**
 * Background sweep: delete expired invite secrets directly from server-only
 * storage, independent of later invite RPC writes.
 *
 * Pages through the full collection via StorageObjectList.cursor so expiry
 * cleanup is not limited to the first page (default 100). Collect keys first,
 * then delete, so mid-sweep deletes cannot skip later pages.
 */
export function sweepExpiredInviteSecretsFromStorage(
  nk: nkruntime.Nakama,
  now: number = Date.now(),
  limit: number = 100
): string[] {
  const reclaimed: string[] = [];
  const toDelete: Array<{ key: string; userId: string }> = [];

  try {
    let cursor: string | undefined;
    do {
      // undefined userId lists the collection across owners (server runtime).
      const listed = nk.storageList(
        undefined as unknown as string,
        INVITE_SECRET_COLLECTION,
        limit,
        cursor
      );
      const page = listStoragePage(
        listed as nkruntime.StorageObjectList | nkruntime.StorageObject[]
      );

      for (const obj of page.objects) {
        const value = (obj.value || {}) as InviteSecretValue;
        if (typeof value.expiresAt !== 'number' || value.expiresAt >= now) {
          continue;
        }
        toDelete.push({ key: obj.key, userId: obj.userId });
      }

      cursor = page.cursor;
      // Stop when the page is empty or Nakama returns no further cursor.
      if (!cursor || page.objects.length === 0) {
        break;
      }
    } while (true);

    for (const item of toDelete) {
      deleteInviteSecret(nk, item.key, item.userId);
      reclaimed.push(item.key);
    }
  } catch {
    // Sweep is best-effort; invite RPCs still reclaim opportunistically.
  }

  return reclaimed;
}

/**
 * Throttled collection sweep suitable for match-independent RPC callers
 * and opportunistic matchLoop ticks.
 * Returns reclaimed invite IDs, or null when the interval has not elapsed.
 */
export function maybeSweepExpiredInviteSecrets(
  nk: nkruntime.Nakama,
  now: number = Date.now(),
  intervalMs: number = INVITE_SECRET_SWEEP_INTERVAL_MS
): string[] | null {
  if (now - lastInviteSecretSweepAt < intervalMs) {
    return null;
  }
  lastInviteSecretSweepAt = now;
  return sweepExpiredInviteSecretsFromStorage(nk, now);
}

/** Test helper: reset sweep throttle state. */
export function resetInviteSecretSweepClockForTests(): void {
  lastInviteSecretSweepAt = 0;
}

/**
 * Resolve room password for invite creation after verifying the requester
 * is a current match player (not a spectator).
 */
export function resolveInvitePassword(
  state: InvitePasswordState,
  userId: string
): InvitePasswordSignalResponse {
  if (!userId || !state.players.has(userId)) {
    return { ok: false, error: 'not_a_member' };
  }

  return { ok: true, password: state.password };
}

/**
 * Handle matchSignal payload for invite-password requests.
 * Returns a JSON response string, or null if the signal is not for this handler.
 */
export function handleInvitePasswordSignal(
  state: InvitePasswordState,
  data: string
): string | null {
  let parsed: Partial<InvitePasswordSignalRequest>;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  if (parsed.type !== INVITE_PASSWORD_SIGNAL_TYPE) {
    return null;
  }

  return JSON.stringify(resolveInvitePassword(state, parsed.userId || ''));
}
