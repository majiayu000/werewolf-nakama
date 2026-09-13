/**
 * Client-callable RPC allowlist (SEC-02).
 * Stats/achievement writers live in werewolf/game-result.ts and are
 * invoked only from the match handler — never registered here.
 */

export const CLIENT_RPC_IDS = [
  'create_match',
  'find_match',
  'list_matches',
  'get_user_stats',
  'send_invite',
  'get_invites',
  'respond_invite',
  'cancel_invite',
  'search_users',
  'get_achievements',
  'get_leaderboard',
  'get_replays',
  'get_replay',
] as const;

/** Must never appear in CLIENT_RPC_IDS / InitModule.registerRpc. */
export const FORBIDDEN_CLIENT_WRITE_RPC_IDS = [
  'record_game_result',
  'update_achievements',
] as const;
