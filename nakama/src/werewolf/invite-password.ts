/**
 * Invite password resolution via matchSignal.
 * Password lives in authoritative GameState and is omitted from public match labels.
 */

export const INVITE_PASSWORD_SIGNAL_TYPE = 'get_invite_password';

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
