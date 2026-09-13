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
  password: string | null | undefined
): void {
  if (!password) {
    return;
  }

  nk.storageWrite([{
    collection: INVITE_SECRET_COLLECTION,
    key: inviteId,
    userId: ownerUserId,
    value: { password },
    permissionRead: 0, // Server only — clients cannot read via storage API
    permissionWrite: 0,
  }]);
}

/**
 * Read invite password from server-only storage.
 */
export function readInviteSecret(
  nk: nkruntime.Nakama,
  inviteId: string,
  ownerUserId: string
): string | undefined {
  try {
    const objects = nk.storageRead([{
      collection: INVITE_SECRET_COLLECTION,
      key: inviteId,
      userId: ownerUserId,
    }]);
    if (objects.length > 0 && objects[0].value) {
      const value = objects[0].value as { password?: string };
      return value.password;
    }
  } catch {
    // Missing secret is treated as no password
  }
  return undefined;
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
