/**
 * Werewolf Game Server - Main Entry Point
 * Nakama Runtime TypeScript Module
 */

// Import side-effects from match_handler to define global functions
import './werewolf/match_handler';

// Declare global match handler functions (defined in match_handler.ts via esbuild banner)
declare var matchInit: nkruntime.MatchHandler['matchInit'];
declare var matchJoinAttempt: nkruntime.MatchHandler['matchJoinAttempt'];
declare var matchJoin: nkruntime.MatchHandler['matchJoin'];
declare var matchLeave: nkruntime.MatchHandler['matchLeave'];
declare var matchLoop: nkruntime.MatchHandler['matchLoop'];
declare var matchTerminate: nkruntime.MatchHandler['matchTerminate'];
declare var matchSignal: nkruntime.MatchHandler['matchSignal'];
import {
  UserStats, createInitialUserStats, calculateLevelInfo, calculateGameXP,
  GameInvite, InviteStatus, INVITE_CONFIG, LevelInfo,
  // Achievement types
  AchievementId, AchievementCategory, AchievementRarity,
  AchievementDefinition, AchievementProgress, UserAchievements, AchievementUnlock,
  ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CONFIG, createInitialUserAchievements,
  checkAchievementUnlock, Role, Faction, isWerewolf
} from './werewolf/types';
import {
  getUserReplays, getReplay, getReplayByOwner, getReplayStats, getKeyEvents,
  GameReplay, ReplayListItem
} from './werewolf/replay';
import {
  INVITE_PASSWORD_SIGNAL_TYPE,
  InvitePasswordSignalResponse,
  stripInvitePassword,
  writeInviteSecret,
  readInviteSecretResult,
  deleteInviteSecret,
  reclaimSecretsForRemovedInvites,
  reclaimExpiredInviteSecrets,
  expireAcceptedInviteRetryIfNeeded,
  isInviteDiscoverableForClient,
  maybeSweepExpiredInviteSecrets,
  migrateLegacyInvitePasswordIfNeeded,
  migrateLegacyPasswordsBeforeInviteWrite,
  startInviteSecretExpiryScheduler,
} from './werewolf/invite-password';

// Storage collection for user stats
const STATS_COLLECTION = 'werewolf_stats';
const STATS_KEY = 'user_stats';

/**
 * Initialize the Nakama module
 * This function is called once when the server starts
 */
function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: {
    registerRpc: (id: string, fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) => string | void) => void;
    registerMatch: (name: string, handlers: nkruntime.MatchHandler) => void;
    registerBeforeRt: (id: string, fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, envelope: any) => any) => void;
    registerAfterRt: (id: string, fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, output: any, input: any) => void) => void;
    registerMatchmakerMatched: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: any[]) => string | void) => void;
    registerLeaderboardReset: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, leaderboard: any, reset: number) => void) => void;
  }
): void {
  logger.info('Werewolf Game Server initializing...');

  // Register the werewolf match handler
  initializer.registerMatch('werewolf', {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });
  logger.info('Registered match handler: werewolf');

  // Register RPC endpoints
  initializer.registerRpc('create_match', rpcCreateMatch);
  initializer.registerRpc('find_match', rpcFindMatch);
  initializer.registerRpc('list_matches', rpcListMatches);
  initializer.registerRpc('get_user_stats', rpcGetUserStats);
  initializer.registerRpc('record_game_result', rpcRecordGameResult);
  // Friend invite system
  initializer.registerRpc('send_invite', rpcSendInvite);
  initializer.registerRpc('get_invites', rpcGetInvites);
  initializer.registerRpc('respond_invite', rpcRespondInvite);
  initializer.registerRpc('cancel_invite', rpcCancelInvite);
  initializer.registerRpc('search_users', rpcSearchUsers);
  // Achievement system
  initializer.registerRpc('get_achievements', rpcGetAchievements);
  initializer.registerRpc('update_achievements', rpcUpdateAchievements);
  // Leaderboard system
  initializer.registerRpc('get_leaderboard', rpcGetLeaderboard);
  // Replay system
  initializer.registerRpc('get_replays', rpcGetReplays);
  initializer.registerRpc('get_replay', rpcGetReplayById);
  logger.info('Registered RPC endpoints: create_match, find_match, list_matches, get_user_stats, record_game_result, send_invite, get_invites, respond_invite, cancel_invite, search_users, get_achievements, update_achievements, get_leaderboard, get_replays, get_replay');

  // Register matchmaker callback
  initializer.registerMatchmakerMatched(onMatchmakerMatched);
  logger.info('Registered matchmaker callback');

  // Match-independent recurring invite-secret expiry sweep via leaderboard cron.
  // Also run once at module load; invite RPCs and live match loops still call the
  // throttled sweeper opportunistically.
  startInviteSecretExpiryScheduler(nk, logger, initializer);
  maybeSweepExpiredInviteSecrets(nk);

  logger.info('Werewolf Game Server initialized successfully!');
}

/**
 * RPC: Create a new werewolf match
 */
function rpcCreateMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  logger.info(`User ${ctx.userId} creating new match`);

  let params: { [key: string]: string } = {};

  if (payload) {
    try {
      params = JSON.parse(payload);
    } catch (e) {
      logger.error(`Failed to parse create_match payload: ${e}`);
    }
  }

  // Add creator info to params
  params.creatorId = ctx.userId;
  params.creatorUsername = ctx.username;

  try {
    const matchId = nk.matchCreate('werewolf', params);
    logger.info(`Created match: ${matchId}`);

    return JSON.stringify({
      success: true,
      matchId: matchId,
    });
  } catch (e) {
    logger.error(`Failed to create match: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to create match',
    });
  }
}

/**
 * RPC: Find an available match to join
 */
function rpcFindMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  logger.info(`User ${ctx.userId} searching for match`);

  let minPlayers = 0;
  let maxPlayers = 18;

  if (payload) {
    try {
      const params = JSON.parse(payload);
      minPlayers = params.minPlayers || 0;
      maxPlayers = params.maxPlayers || 18;
    } catch (e) {
      logger.error(`Failed to parse find_match payload: ${e}`);
    }
  }

  try {
    // Query for public matches in waiting state (no password required)
    const query = '+label.phase:waiting +label.isPrivate:false';
    const matches = nk.matchList(10, true, undefined, minPlayers, maxPlayers, query);

    // Filter out any remaining private matches (in case label parsing differs)
    const publicMatches = matches.filter((m) => {
      try {
        const label = JSON.parse(m.label || '{}');
        return label.isPrivate !== true;
      } catch {
        return true; // Include matches with unparseable labels
      }
    });

    if (publicMatches.length === 0) {
      // No waiting public matches, create a new one
      const matchId = nk.matchCreate('werewolf', {
        creatorId: ctx.userId,
        creatorUsername: ctx.username,
      });

      return JSON.stringify({
        success: true,
        matchId: matchId,
        isNew: true,
      });
    }

    // Return the first available public match
    const match = publicMatches[0];
    return JSON.stringify({
      success: true,
      matchId: match.matchId,
      isNew: false,
      currentPlayers: match.size,
    });
  } catch (e) {
    logger.error(`Failed to find match: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to find match',
    });
  }
}

/**
 * RPC: List all active matches
 */
function rpcListMatches(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  logger.info(`User ${ctx.userId} listing matches`);

  let limit = 20;
  let includeInProgress = false;

  if (payload) {
    try {
      const params = JSON.parse(payload);
      limit = params.limit || 20;
      includeInProgress = params.includeInProgress || false;
    } catch (e) {
      logger.error(`Failed to parse list_matches payload: ${e}`);
    }
  }

  try {
    // Query based on filter
    let query = includeInProgress ? undefined : '+label.phase:waiting';
    const matches = nk.matchList(limit, true, undefined, undefined, undefined, query);

    const matchList = matches.map((match) => {
      let label: any = {};
      try {
        label = JSON.parse(match.label);
      } catch (e) {
        // Ignore parse errors
      }

      return {
        matchId: match.matchId,
        players: match.size,
        phase: label.phase || 'unknown',
        hostName: label.hostName || 'Unknown',
        roomName: label.roomName || `房间 ${match.matchId.slice(-6)}`,
        isPrivate: label.isPrivate || false,
        maxPlayers: label.maxPlayers || 12,
        settings: label.settings || {},
      };
    });

    return JSON.stringify({
      success: true,
      matches: matchList,
    });
  } catch (e) {
    logger.error(`Failed to list matches: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to list matches',
    });
  }
}

/**
 * Matchmaker callback - called when players are matched together
 */
function onMatchmakerMatched(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: any[]
): string | void {
  if (matches.length < 6) {
    logger.info('Not enough players for matchmaker, need at least 6');
    return;
  }

  logger.info(`Matchmaker matched ${matches.length} players`);

  // Create a new match for the matched players
  try {
    const matchId = nk.matchCreate('werewolf', {
      matchmade: 'true',
      playerCount: matches.length.toString(),
    });

    logger.info(`Created matchmaker match: ${matchId}`);
    return matchId;
  } catch (e) {
    logger.error(`Failed to create matchmaker match: ${e}`);
    return;
  }
}

/**
 * RPC: Get user statistics
 */
function rpcGetUserStats(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let targetUserId = ctx.userId;

  // Allow fetching stats for another user if specified
  if (payload) {
    try {
      const params = JSON.parse(payload);
      if (params.userId) {
        targetUserId = params.userId;
      }
    } catch (e) {
      // Use requesting user's stats if parsing fails
    }
  }

  logger.info(`Getting stats for user ${targetUserId}`);

  try {
    // Read user stats from storage
    const objects = nk.storageRead([{
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId: targetUserId,
    }]);

    if (objects.length > 0 && objects[0].value) {
      const stats = objects[0].value as UserStats;
      // Migrate old stats that don't have level fields
      if (stats.level === undefined) {
        stats.level = 1;
        stats.currentXP = 0;
        stats.totalXP = 0;
        stats.winStreak = 0;
        stats.maxWinStreak = 0;
        stats.lastWinDate = '';
      }
      // Calculate level info
      const levelInfo = calculateLevelInfo(stats.totalXP || 0);
      return JSON.stringify({
        success: true,
        stats,
        levelInfo,
      });
    }

    // Return initial stats if no data exists
    const initialStats = createInitialUserStats(targetUserId);
    const initialLevelInfo = calculateLevelInfo(0);
    return JSON.stringify({
      success: true,
      stats: initialStats,
      levelInfo: initialLevelInfo,
    });
  } catch (e) {
    logger.error(`Failed to get user stats: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to get user stats',
    });
  }
}

/** Helper to get today's date string (YYYY-MM-DD) */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * RPC: Record game result (called by server after game ends)
 * This should be called internally by the match handler
 */
function rpcRecordGameResult(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No payload provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const { players, winner, sheriffId } = data;

    if (!players || !Array.isArray(players)) {
      return JSON.stringify({
        success: false,
        error: 'Invalid players data',
      });
    }

    logger.info(`Recording game result for ${players.length} players, winner: ${winner}`);

    const now = Date.now();
    const today = getTodayString();
    const writes: nkruntime.StorageWriteRequest[] = [];
    const levelUpPlayers: Array<{ userId: string; oldLevel: number; newLevel: number; xpGained: number }> = [];

    for (const player of players) {
      const { userId, role, faction, isWinner, isAlive, isLover } = player;

      // Read existing stats
      let stats: UserStats;
      try {
        const objects = nk.storageRead([{
          collection: STATS_COLLECTION,
          key: STATS_KEY,
          userId: userId,
        }]);

        if (objects.length > 0 && objects[0].value) {
          stats = objects[0].value as UserStats;
          // Migrate old stats that don't have level fields
          if (stats.level === undefined) {
            stats.level = 1;
            stats.currentXP = 0;
            stats.totalXP = 0;
            stats.winStreak = 0;
            stats.maxWinStreak = 0;
            stats.lastWinDate = '';
          }
        } else {
          stats = createInitialUserStats(userId);
        }
      } catch {
        stats = createInitialUserStats(userId);
      }

      const oldLevel = stats.level || 1;
      const wasSheriff = userId === sheriffId;
      const isFirstWinOfDay = isWinner && stats.lastWinDate !== today;

      // Update win streak
      if (isWinner) {
        stats.winStreak = (stats.winStreak || 0) + 1;
        stats.maxWinStreak = Math.max(stats.maxWinStreak || 0, stats.winStreak);
        stats.lastWinDate = today;
      } else {
        stats.winStreak = 0;
      }

      // Calculate XP gained
      const xpGained = calculateGameXP({
        won: isWinner,
        survived: isAlive,
        wasSheriff,
        sheriffWon: wasSheriff && isWinner,
        currentWinStreak: stats.winStreak,
        isFirstWinOfDay,
      });

      // Update XP and level
      stats.totalXP = (stats.totalXP || 0) + xpGained;
      const levelInfo = calculateLevelInfo(stats.totalXP);
      stats.level = levelInfo.level;
      stats.currentXP = levelInfo.currentXP;

      // Track level ups
      if (levelInfo.level > oldLevel) {
        levelUpPlayers.push({
          userId,
          oldLevel,
          newLevel: levelInfo.level,
          xpGained,
        });
        logger.info(`Player ${userId} leveled up: ${oldLevel} -> ${levelInfo.level}`);
      }

      // Update total stats
      stats.totalGames++;
      if (isWinner) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      stats.winRate = stats.totalGames > 0
        ? Math.round((stats.wins / stats.totalGames) * 100)
        : 0;

      // Update survival rate (weighted average)
      const oldSurvivalWeight = (stats.totalGames - 1) * (stats.survivalRate || 0);
      const newSurvival = isAlive ? 100 : 0;
      stats.survivalRate = stats.totalGames > 0
        ? Math.round((oldSurvivalWeight + newSurvival) / stats.totalGames)
        : 0;

      // Update faction stats
      if (faction === 'werewolf') {
        stats.werewolfGames++;
        if (isWinner) stats.werewolfWins++;
      } else if (faction === 'villager' || faction === 'neutral') {
        stats.villagerGames++;
        if (isWinner) stats.villagerWins++;
      }

      // Update lover stats
      if (isLover) {
        stats.loversGames++;
        if (isWinner && winner === 'lovers') {
          stats.loversWins++;
        }
      }

      // Update role stats
      if (role) {
        if (!stats.roleStats[role]) {
          stats.roleStats[role] = { played: 0, wins: 0 };
        }
        stats.roleStats[role].played++;
        if (isWinner) {
          stats.roleStats[role].wins++;
        }
      }

      // Update sheriff stats
      if (wasSheriff) {
        stats.gamesAsSheriff++;
        if (isWinner) {
          stats.sheriffWins++;
        }
      }

      // Update timestamps
      if (stats.firstGameAt === 0) {
        stats.firstGameAt = now;
      }
      stats.lastGameAt = now;

      // Add to write batch
      writes.push({
        collection: STATS_COLLECTION,
        key: STATS_KEY,
        userId: userId,
        value: stats,
        permissionRead: 2, // Public read
        permissionWrite: 0, // Server-only write
      });
    }

    // Write all updates
    nk.storageWrite(writes);
    logger.info(`Recorded stats for ${writes.length} players, ${levelUpPlayers.length} leveled up`);

    return JSON.stringify({
      success: true,
      playersUpdated: writes.length,
      levelUps: levelUpPlayers,
    });
  } catch (e) {
    logger.error(`Failed to record game result: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to record game result: ${e}`,
    });
  }
}

// ============================================================================
// Friend Invite System RPCs
// ============================================================================

/**
 * Generate a unique invite ID
 */
function generateInviteId(): string {
  return 'inv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * RPC: Search for users by username
 */
function rpcSearchUsers(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No search query provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const query = data.query as string;
    const limit = data.limit || 20;

    if (!query || query.length < 2) {
      return JSON.stringify({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
    }

    // Use Nakama's users listing with username filter
    // Note: This is a prefix search
    const users = nk.usersGetUsername([query]);

    // If exact match not found, we can't do wildcard search in Nakama
    // So we'll return what we can find
    const results = users.map(u => ({
      userId: u.userId,
      username: u.username,
      displayName: u.displayName || u.username,
      online: u.online || false,
    }));

    return JSON.stringify({
      success: true,
      users: results.slice(0, limit),
    });
  } catch (e) {
    logger.error(`Failed to search users: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to search users',
    });
  }
}

/**
 * RPC: Send a game invite to another user
 */
function rpcSendInvite(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  // Lifecycle-independent secret reclaim (does not require a live matchLoop)
  maybeSweepExpiredInviteSecrets(nk);

  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No payload provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const matchId = data.matchId as string;
    const receiverId = data.receiverId as string;

    if (!matchId) {
      return JSON.stringify({
        success: false,
        error: 'Match ID is required',
      });
    }

    if (!receiverId) {
      return JSON.stringify({
        success: false,
        error: 'Receiver ID is required',
      });
    }

    // Cannot invite yourself
    if (receiverId === ctx.userId) {
      return JSON.stringify({
        success: false,
        error: 'Cannot invite yourself',
      });
    }

    // Get match info (label intentionally omits password; only exposes isPrivate)
    const match = nk.matchGet(matchId);
    if (!match) {
      return JSON.stringify({
        success: false,
        error: 'Match not found',
      });
    }

    let matchLabel: { roomName?: string; maxPlayers?: number; phase?: string; isPrivate?: boolean } = {};
    try {
      matchLabel = JSON.parse(match.label || '{}');
    } catch {
      // Ignore parse errors
    }

    // Check if match is joinable
    if (matchLabel.phase && matchLabel.phase !== 'waiting') {
      return JSON.stringify({
        success: false,
        error: 'Game has already started',
      });
    }

    // Resolve password from authoritative match state; also verifies inviter is a member
    let invitePassword: string | null | undefined;
    try {
      const signalRaw = nk.matchSignal(matchId, JSON.stringify({
        type: INVITE_PASSWORD_SIGNAL_TYPE,
        userId: ctx.userId,
      }));
      const signalResult = JSON.parse(signalRaw) as InvitePasswordSignalResponse;
      if (!signalResult.ok) {
        return JSON.stringify({
          success: false,
          error: 'Only current match members can send invites',
        });
      }
      invitePassword = signalResult.password;
    } catch (e) {
      logger.error(`Failed to resolve invite password via matchSignal: ${e}`);
      return JSON.stringify({
        success: false,
        error: 'Match not available',
      });
    }

    // Get receiver info
    const receiverUsers = nk.usersGetId([receiverId]);
    if (receiverUsers.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'User not found',
      });
    }
    const receiver = receiverUsers[0];

    // Create invite metadata without password (credential stored server-only below)
    const now = Date.now();
    const inviteId = generateInviteId();
    const expiresAt = now + INVITE_CONFIG.EXPIRE_TIME;
    const requiresPassword = !!invitePassword;
    const invite: GameInvite = {
      inviteId,
      matchId,
      roomName: matchLabel.roomName || `房间 ${matchId.slice(-6)}`,
      senderId: ctx.userId,
      senderName: ctx.username,
      receiverId,
      receiverName: receiver.username || receiverId,
      status: InviteStatus.PENDING,
      currentPlayers: match.size,
      maxPlayers: matchLabel.maxPlayers || 12,
      createdAt: now,
      expiresAt,
      requiresPassword,
    };

    // Keep join password in server-only storage; never put it in owner-readable invite objects
    writeInviteSecret(nk, inviteId, receiverId, invitePassword, expiresAt);

    // Store invite for sender (sent invites)
    const senderInvites = readInvites(nk, ctx.userId, 'sent');
    senderInvites.push(invite);
    writeInvites(nk, ctx.userId, 'sent', senderInvites);

    // Store invite for receiver (received invites)
    const receiverInvites = readInvites(nk, receiverId, 'received');
    receiverInvites.push(invite);
    writeInvites(nk, receiverId, 'received', receiverInvites);

    // Send notification to receiver
    const notifications: nkruntime.NotificationRequest[] = [{
      userId: receiverId,
      subject: 'game_invite',
      content: {
        type: 'game_invite',
        invite,
      },
      code: 81, // OpCode.INVITE_RECEIVED
      persistent: true,
    }];
    nk.notificationsSend(notifications);

    logger.info(`User ${ctx.userId} sent invite to ${receiverId} for match ${matchId}`);

    return JSON.stringify({
      success: true,
      inviteId: invite.inviteId,
    });
  } catch (e) {
    logger.error(`Failed to send invite: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to send invite: ${e}`,
    });
  }
}

/**
 * RPC: Get discoverable invites for the current user.
 * Returns pending invites plus unexpired accepted invites (for accept-retry
 * password recovery after a lost RPC response or failed join).
 */
function rpcGetInvites(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  // Lifecycle-independent secret reclaim (does not require a live matchLoop)
  maybeSweepExpiredInviteSecrets(nk);

  try {
    const data = payload ? JSON.parse(payload) : {};
    const type = data.type || 'received'; // 'sent' or 'received'

    let invites = readInvites(nk, ctx.userId, type);

    // Filter out expired invites and update status
    const now = Date.now();
    const validInvites: GameInvite[] = [];
    let hasExpired = false;

    for (const invite of invites) {
      if (invite.status === InviteStatus.PENDING && invite.expiresAt < now) {
        invite.status = InviteStatus.EXPIRED;
        hasExpired = true;
        // Drop server-only credential once the invite can no longer be accepted
        deleteInviteSecret(nk, invite.inviteId, invite.receiverId);
      } else if (
        invite.status === InviteStatus.ACCEPTED &&
        expireAcceptedInviteRetryIfNeeded(nk, invite, now)
      ) {
        hasExpired = true;
      }
      // Pending + unexpired accepted (password never lives on invite objects)
      if (isInviteDiscoverableForClient(invite, now)) {
        validInvites.push(stripInvitePassword(invite));
      }
    }

    // Update storage if any expired
    if (hasExpired) {
      writeInvites(nk, ctx.userId, type, invites);
    }

    return JSON.stringify({
      success: true,
      invites: validInvites,
    });
  } catch (e) {
    logger.error(`Failed to get invites: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to get invites',
      invites: [],
    });
  }
}

/**
 * RPC: Respond to a game invite (accept or decline)
 */
function rpcRespondInvite(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  // Lifecycle-independent secret reclaim (does not require a live matchLoop)
  maybeSweepExpiredInviteSecrets(nk);

  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No payload provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const inviteId = data.inviteId as string;
    const accept = data.accept as boolean;

    if (!inviteId) {
      return JSON.stringify({
        success: false,
        error: 'Invite ID is required',
      });
    }

    // Get receiver's invites
    const invites = readInvites(nk, ctx.userId, 'received');
    const inviteIndex = invites.findIndex(i => i.inviteId === inviteId);

    if (inviteIndex === -1) {
      return JSON.stringify({
        success: false,
        error: 'Invite not found',
      });
    }

    const invite = invites[inviteIndex];

    // Idempotent accept retry: keep credential until expiry/cancel/decline so a
    // lost RPC response or notification failure can still recover the password.
    if (invite.status !== InviteStatus.PENDING) {
      if (
        accept === true &&
        invite.status === InviteStatus.ACCEPTED &&
        invite.receiverId === ctx.userId
      ) {
        const now = Date.now();
        // Reject expired accepted retries even when the throttled sweep has not
        // reclaimed the secret yet (up to INVITE_SECRET_SWEEP_INTERVAL_MS lag).
        if (expireAcceptedInviteRetryIfNeeded(nk, invite, now)) {
          writeInvites(nk, ctx.userId, 'received', invites);
          return JSON.stringify({
            success: false,
            error: 'Invite has expired',
          });
        }
        const retrySecretRaw = readInviteSecretResult(nk, inviteId, invite.receiverId);
        const hadLegacyInlinePassword =
          retrySecretRaw.status !== 'found' &&
          typeof invite.password === 'string' &&
          invite.password.length > 0;
        const retrySecret = migrateLegacyInvitePasswordIfNeeded(nk, invite, retrySecretRaw);
        if (invite.requiresPassword && retrySecret.status !== 'found') {
          return JSON.stringify({
            success: false,
            error: retrySecret.status === 'error'
              ? 'Invite credential temporarily unavailable'
              : 'Invite credential missing',
          });
        }
        if (hadLegacyInlinePassword) {
          writeInvites(nk, ctx.userId, 'received', invites);
        }
        return JSON.stringify({
          success: true,
          matchId: invite.matchId,
          password: retrySecret.status === 'found' ? retrySecret.password : undefined,
        });
      }
      return JSON.stringify({
        success: false,
        error: `Invite is already ${invite.status}`,
      });
    }

    const now = Date.now();
    if (invite.expiresAt < now) {
      invite.status = InviteStatus.EXPIRED;
      writeInvites(nk, ctx.userId, 'received', invites);
      deleteInviteSecret(nk, inviteId, invite.receiverId);
      return JSON.stringify({
        success: false,
        error: 'Invite has expired',
      });
    }

    // Reveal password only on successful accept, from server-only storage.
    // Private invites must not be marked accepted if the credential is missing/unreadable.
    // Pre-deployment invites may still carry an inline password with no secret object.
    let acceptPassword: string | undefined;
    if (accept) {
      let secretResult = readInviteSecretResult(nk, inviteId, invite.receiverId);
      secretResult = migrateLegacyInvitePasswordIfNeeded(nk, invite, secretResult);
      if (invite.requiresPassword) {
        if (secretResult.status !== 'found') {
          logger.error(
            `Invite secret unavailable for private invite ${inviteId}: ${secretResult.status}`
          );
          return JSON.stringify({
            success: false,
            error: secretResult.status === 'error'
              ? 'Invite credential temporarily unavailable'
              : 'Invite credential missing',
          });
        }
        acceptPassword = secretResult.password;
      } else if (secretResult.status === 'found') {
        acceptPassword = secretResult.password;
      }
    }

    // Update invite status
    const newStatus = accept ? InviteStatus.ACCEPTED : InviteStatus.DECLINED;
    invite.status = newStatus;
    writeInvites(nk, ctx.userId, 'received', invites);

    // Update sender's copy
    const senderInvites = readInvites(nk, invite.senderId, 'sent');
    const senderInviteIndex = senderInvites.findIndex(i => i.inviteId === inviteId);
    if (senderInviteIndex !== -1) {
      senderInvites[senderInviteIndex].status = newStatus;
      writeInvites(nk, invite.senderId, 'sent', senderInvites);
    }

    // Decline permanently consumes the credential. Accept keeps it for idempotent
    // retry until expiry sweep / cancel / receiver-list eviction.
    if (!accept) {
      deleteInviteSecret(nk, inviteId, invite.receiverId);
    }

    // Notify sender about the response (non-fatal: accept must still return password)
    const notificationCode = accept ? 82 : 83; // INVITE_ACCEPTED or INVITE_DECLINED
    const notifications: nkruntime.NotificationRequest[] = [{
      userId: invite.senderId,
      subject: accept ? 'invite_accepted' : 'invite_declined',
      content: {
        type: accept ? 'invite_accepted' : 'invite_declined',
        inviteId,
        responderId: ctx.userId,
        responderName: ctx.username,
        matchId: invite.matchId,
      },
      code: notificationCode,
      persistent: true,
    }];
    try {
      nk.notificationsSend(notifications);
    } catch (notifyError) {
      logger.warn(`Failed to notify sender about invite ${inviteId}: ${notifyError}`);
    }

    logger.info(`User ${ctx.userId} ${accept ? 'accepted' : 'declined'} invite ${inviteId}`);

    if (accept) {
      return JSON.stringify({
        success: true,
        matchId: invite.matchId,
        password: acceptPassword, // From server-only storage; never from invite list objects
      });
    }

    return JSON.stringify({
      success: true,
    });
  } catch (e) {
    logger.error(`Failed to respond to invite: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to respond to invite: ${e}`,
    });
  }
}

/**
 * RPC: Cancel a sent invite
 */
function rpcCancelInvite(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  // Lifecycle-independent secret reclaim (does not require a live matchLoop)
  maybeSweepExpiredInviteSecrets(nk);

  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No payload provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const inviteId = data.inviteId as string;

    if (!inviteId) {
      return JSON.stringify({
        success: false,
        error: 'Invite ID is required',
      });
    }

    // Get sender's invites
    const invites = readInvites(nk, ctx.userId, 'sent');
    const inviteIndex = invites.findIndex(i => i.inviteId === inviteId);

    if (inviteIndex === -1) {
      return JSON.stringify({
        success: false,
        error: 'Invite not found',
      });
    }

    const invite = invites[inviteIndex];

    // Can only cancel pending invites
    if (invite.status !== InviteStatus.PENDING) {
      return JSON.stringify({
        success: false,
        error: `Cannot cancel invite with status: ${invite.status}`,
      });
    }

    // Revoke join credential before status writes so a later storage failure
    // cannot leave a live private-room password after the sender marks cancelled.
    deleteInviteSecret(nk, inviteId, invite.receiverId);

    // Update invite status
    invite.status = InviteStatus.CANCELLED;
    writeInvites(nk, ctx.userId, 'sent', invites);

    // Update receiver's copy
    const receiverInvites = readInvites(nk, invite.receiverId, 'received');
    const receiverInviteIndex = receiverInvites.findIndex(i => i.inviteId === inviteId);
    if (receiverInviteIndex !== -1) {
      receiverInvites[receiverInviteIndex].status = InviteStatus.CANCELLED;
      writeInvites(nk, invite.receiverId, 'received', receiverInvites);
    }

    // Notify receiver about cancellation
    const notifications: nkruntime.NotificationRequest[] = [{
      userId: invite.receiverId,
      subject: 'invite_cancelled',
      content: {
        type: 'invite_cancelled',
        inviteId,
        senderId: ctx.userId,
        senderName: ctx.username,
      },
      code: 85, // OpCode.INVITE_CANCELLED
      persistent: false,
    }];
    nk.notificationsSend(notifications);

    logger.info(`User ${ctx.userId} cancelled invite ${inviteId}`);

    return JSON.stringify({
      success: true,
    });
  } catch (e) {
    logger.error(`Failed to cancel invite: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to cancel invite: ${e}`,
    });
  }
}

/**
 * Helper: Read invites from storage
 */
function readInvites(
  nk: nkruntime.Nakama,
  userId: string,
  type: 'sent' | 'received'
): GameInvite[] {
  const key = type === 'sent' ? INVITE_CONFIG.STORAGE_KEY_SENT : INVITE_CONFIG.STORAGE_KEY_RECEIVED;
  try {
    const objects = nk.storageRead([{
      collection: INVITE_CONFIG.STORAGE_COLLECTION,
      key,
      userId,
    }]);

    if (objects.length > 0 && objects[0].value) {
      const data = objects[0].value as { invites: GameInvite[] };
      return data.invites || [];
    }
  } catch {
    // Return empty array if storage doesn't exist
  }
  return [];
}

/**
 * Helper: Write invites to storage
 */
function writeInvites(
  nk: nkruntime.Nakama,
  userId: string,
  type: 'sent' | 'received',
  invites: GameInvite[]
): void {
  const key = type === 'sent' ? INVITE_CONFIG.STORAGE_KEY_SENT : INVITE_CONFIG.STORAGE_KEY_RECEIVED;

  // Migrate legacy inline passwords before strip — sibling list writes must not
  // destroy still-pending credentials without creating server-only secrets.
  migrateLegacyPasswordsBeforeInviteWrite(nk, invites);

  // Clean up old invites (keep last 50) and never persist passwords in owner-readable storage
  const recentInvites: GameInvite[] = invites.slice(-50).map((invite) =>
    stripInvitePassword(invite) as GameInvite
  );

  // Opportunistic expiry reclaim on writes; independent sweep also runs from
  // invite RPCs / InitModule / leaderboard-reset scheduler (not matchLoop).
  reclaimExpiredInviteSecrets(nk, recentInvites);

  // Persist eviction first. Only after the write succeeds reclaim secrets for
  // invites dropped from the receiver list — delete-before-write would leave a
  // pending invite without its password if storageWrite fails.
  nk.storageWrite([{
    collection: INVITE_CONFIG.STORAGE_COLLECTION,
    key,
    userId,
    value: { invites: recentInvites },
    permissionRead: 1, // Owner only — invite metadata; passwords live in INVITE_SECRET_COLLECTION
    permissionWrite: 0, // Server only
  }]);

  // Reclaim secrets only when the receiver's copy is evicted. Sender-list
  // eviction must not delete credentials still needed by a pending receiver invite.
  if (type === 'received') {
    reclaimSecretsForRemovedInvites(nk, invites, recentInvites);
  }
}

// ============================================================================
// Achievement System RPCs
// ============================================================================

/**
 * Helper: Read achievements from storage
 */
function readAchievements(nk: nkruntime.Nakama, userId: string): UserAchievements {
  try {
    const objects = nk.storageRead([{
      collection: ACHIEVEMENT_CONFIG.STORAGE_COLLECTION,
      key: ACHIEVEMENT_CONFIG.STORAGE_KEY,
      userId,
    }]);

    if (objects.length > 0 && objects[0].value) {
      return objects[0].value as UserAchievements;
    }
  } catch {
    // Return initial achievements if storage doesn't exist
  }
  return createInitialUserAchievements(userId);
}

/**
 * Helper: Write achievements to storage
 */
function writeAchievements(nk: nkruntime.Nakama, userId: string, achievements: UserAchievements): void {
  nk.storageWrite([{
    collection: ACHIEVEMENT_CONFIG.STORAGE_COLLECTION,
    key: ACHIEVEMENT_CONFIG.STORAGE_KEY,
    userId,
    value: achievements as { [key: string]: any },
    permissionRead: 2, // Public read
    permissionWrite: 0, // Server only
  }]);
}

/**
 * RPC: Get user's achievements
 */
function rpcGetAchievements(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let targetUserId = ctx.userId;

  // Allow fetching achievements for another user if specified
  if (payload) {
    try {
      const params = JSON.parse(payload);
      if (params.userId) {
        targetUserId = params.userId;
      }
    } catch (e) {
      // Use requesting user's achievements if parsing fails
    }
  }

  logger.info(`Getting achievements for user ${targetUserId}`);

  try {
    const userAchievements = readAchievements(nk, targetUserId);

    // Calculate statistics
    const totalAchievements = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
    const unlockedAchievements = Object.values(userAchievements.achievements).filter(a => a.completed).length;

    // Group achievements by category
    const byCategory: Record<string, Array<{
      definition: AchievementDefinition;
      progress: AchievementProgress;
    }>> = {};

    for (const id of Object.values(AchievementId)) {
      const definition = ACHIEVEMENT_DEFINITIONS[id];
      const progress = userAchievements.achievements[id] || {
        achievementId: id,
        current: 0,
        required: definition.requirement,
        completed: false,
      };

      if (!byCategory[definition.category]) {
        byCategory[definition.category] = [];
      }

      // Hide hidden achievements that are not completed
      if (definition.hidden && !progress.completed) {
        continue;
      }

      byCategory[definition.category].push({
        definition,
        progress,
      });
    }

    return JSON.stringify({
      success: true,
      achievements: userAchievements,
      totalAchievements,
      unlockedAchievements,
      byCategory,
      definitions: ACHIEVEMENT_DEFINITIONS,
    });
  } catch (e) {
    logger.error(`Failed to get achievements: ${e}`);
    return JSON.stringify({
      success: false,
      error: 'Failed to get achievements',
    });
  }
}

/**
 * RPC: Update achievements based on game result (called after recording game result)
 */
function rpcUpdateAchievements(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!payload) {
    return JSON.stringify({
      success: false,
      error: 'No payload provided',
    });
  }

  try {
    const data = JSON.parse(payload);
    const {
      userId,
      won,
      role,
      faction,
      survived,
      wasSheriff,
      isLover,
      loversWon,
      // Skill tracking (should be tracked during game)
      seerCheckedWolves = 0,
      witchSaved = false,
      witchPoisonedWolf = false,
      guardSaved = false,
      hunterKilledWolf = false,
      idiotRevealed = false,
      // Game context
      playerFactionSize = 0,
      votedOutWolves = 0,
      wasExposed = false,
    } = data;

    logger.info(`Updating achievements for user ${userId}, won: ${won}, role: ${role}`);

    // Read user stats and achievements
    let stats: UserStats;
    try {
      const objects = nk.storageRead([{
        collection: STATS_COLLECTION,
        key: STATS_KEY,
        userId,
      }]);
      stats = objects.length > 0 && objects[0].value
        ? objects[0].value as UserStats
        : createInitialUserStats(userId);
    } catch {
      stats = createInitialUserStats(userId);
    }

    const userAchievements = readAchievements(nk, userId);
    const newUnlocks: AchievementUnlock[] = [];
    let totalXPGained = 0;

    // Helper function to check and unlock achievement
    const checkAndUnlock = (achievementId: AchievementId, currentValue: number) => {
      const progress = userAchievements.achievements[achievementId] || {
        achievementId,
        current: 0,
        required: ACHIEVEMENT_DEFINITIONS[achievementId].requirement,
        completed: false,
      };

      const result = checkAchievementUnlock(progress, currentValue);
      userAchievements.achievements[achievementId] = result.progress;

      if (result.unlocked) {
        const definition = ACHIEVEMENT_DEFINITIONS[achievementId];
        newUnlocks.push({
          achievement: definition,
          progress: result.progress,
          xpEarned: definition.xpReward,
        });
        totalXPGained += definition.xpReward;
        userAchievements.totalUnlocked++;
        logger.info(`User ${userId} unlocked achievement: ${definition.name}`);
      }
    };

    // Helper to increment and check achievement
    const incrementAndCheck = (achievementId: AchievementId) => {
      const progress = userAchievements.achievements[achievementId] || {
        achievementId,
        current: 0,
        required: ACHIEVEMENT_DEFINITIONS[achievementId].requirement,
        completed: false,
      };
      if (!progress.completed) {
        checkAndUnlock(achievementId, progress.current + 1);
      }
    };

    // ==================== Check Beginner Achievements ====================
    // First game
    checkAndUnlock(AchievementId.FIRST_GAME, stats.totalGames);

    // First win
    if (won) {
      checkAndUnlock(AchievementId.FIRST_WIN, stats.wins);
    }

    // First wolf win
    if (won && faction === Faction.WEREWOLF) {
      checkAndUnlock(AchievementId.FIRST_WOLF_WIN, stats.werewolfWins);
    }

    // First villager win
    if (won && (faction === Faction.VILLAGER || faction === 'villager')) {
      checkAndUnlock(AchievementId.FIRST_VILLAGER_WIN, stats.villagerWins);
    }

    // ==================== Check Games Achievements ====================
    checkAndUnlock(AchievementId.GAMES_10, stats.totalGames);
    checkAndUnlock(AchievementId.GAMES_50, stats.totalGames);
    checkAndUnlock(AchievementId.GAMES_100, stats.totalGames);
    checkAndUnlock(AchievementId.GAMES_500, stats.totalGames);
    checkAndUnlock(AchievementId.GAMES_1000, stats.totalGames);

    // ==================== Check Wins Achievements ====================
    checkAndUnlock(AchievementId.WINS_10, stats.wins);
    checkAndUnlock(AchievementId.WINS_50, stats.wins);
    checkAndUnlock(AchievementId.WINS_100, stats.wins);
    checkAndUnlock(AchievementId.WINS_500, stats.wins);

    // ==================== Check Win Streak Achievements ====================
    if (won) {
      checkAndUnlock(AchievementId.WIN_STREAK_3, stats.winStreak);
      checkAndUnlock(AchievementId.WIN_STREAK_5, stats.winStreak);
      checkAndUnlock(AchievementId.WIN_STREAK_10, stats.winStreak);
      checkAndUnlock(AchievementId.WIN_STREAK_20, stats.winStreak);
    }

    // ==================== Check Role Master Achievements ====================
    if (won && role) {
      const roleStats = stats.roleStats[role];
      if (roleStats) {
        switch (role) {
          case Role.VILLAGER:
            checkAndUnlock(AchievementId.VILLAGER_MASTER, roleStats.wins);
            break;
          case Role.SEER:
            checkAndUnlock(AchievementId.SEER_MASTER, roleStats.wins);
            break;
          case Role.WITCH:
            checkAndUnlock(AchievementId.WITCH_MASTER, roleStats.wins);
            break;
          case Role.HUNTER:
            checkAndUnlock(AchievementId.HUNTER_MASTER, roleStats.wins);
            break;
          case Role.GUARD:
            checkAndUnlock(AchievementId.GUARD_MASTER, roleStats.wins);
            break;
          case Role.IDIOT:
            checkAndUnlock(AchievementId.IDIOT_MASTER, roleStats.wins);
            break;
          case Role.WEREWOLF:
            checkAndUnlock(AchievementId.WEREWOLF_MASTER, roleStats.wins);
            break;
          case Role.ALPHA_WOLF:
            checkAndUnlock(AchievementId.ALPHA_WOLF_MASTER, roleStats.wins);
            break;
          case Role.CUPID:
            checkAndUnlock(AchievementId.CUPID_MASTER, roleStats.wins);
            break;
        }
      }
    }

    // ==================== Check Skill Achievements ====================
    // Seer correct checks (cumulative)
    if (role === Role.SEER && seerCheckedWolves > 0) {
      const currentProgress = userAchievements.achievements[AchievementId.SEER_CORRECT_10]?.current || 0;
      const newTotal = currentProgress + seerCheckedWolves;
      checkAndUnlock(AchievementId.SEER_CORRECT_10, newTotal);
      checkAndUnlock(AchievementId.SEER_CORRECT_50, newTotal);
    }

    // Witch saves (cumulative)
    if (role === Role.WITCH && witchSaved) {
      incrementAndCheck(AchievementId.WITCH_SAVE_10);
    }

    // Witch poison wolf (cumulative)
    if (role === Role.WITCH && witchPoisonedWolf) {
      incrementAndCheck(AchievementId.WITCH_POISON_WOLF_10);
    }

    // Guard saves (cumulative)
    if (role === Role.GUARD && guardSaved) {
      incrementAndCheck(AchievementId.GUARD_SAVE_10);
    }

    // Hunter kills wolf (cumulative)
    if ((role === Role.HUNTER || role === Role.ALPHA_WOLF) && hunterKilledWolf) {
      incrementAndCheck(AchievementId.HUNTER_KILL_WOLF_10);
    }

    // ==================== Check Sheriff Achievements ====================
    if (wasSheriff) {
      checkAndUnlock(AchievementId.SHERIFF_ELECTED_10, stats.gamesAsSheriff);
      if (won) {
        checkAndUnlock(AchievementId.SHERIFF_WIN_10, stats.sheriffWins);
      }
    }

    // ==================== Check Special Achievements ====================
    // Lover victory
    if (isLover && loversWon) {
      incrementAndCheck(AchievementId.LOVER_VICTORY);
    }

    // Idiot reveal survival
    if (role === Role.IDIOT && idiotRevealed && survived) {
      incrementAndCheck(AchievementId.IDIOT_REVEAL);
    }

    // Double kill witch (used both antidote and poison in same game)
    if (role === Role.WITCH && witchSaved && witchPoisonedWolf) {
      incrementAndCheck(AchievementId.DOUBLE_KILL_WITCH);
    }

    // Wolf exterminator (voted out 2+ wolves)
    if (won && !isWerewolf(role as Role) && votedOutWolves >= 2) {
      incrementAndCheck(AchievementId.WOLF_EXTERMINATOR);
    }

    // Silent killer (wolf won without being exposed)
    if (won && isWerewolf(role as Role) && !wasExposed) {
      incrementAndCheck(AchievementId.SILENT_KILLER);
    }

    // Last stand (last villager won)
    if (won && !isWerewolf(role as Role) && playerFactionSize === 1) {
      incrementAndCheck(AchievementId.LAST_STAND);
    }

    // Comeback king (faction was down to 1 and won)
    if (won && playerFactionSize === 1) {
      incrementAndCheck(AchievementId.COMEBACK_KING);
    }

    // ==================== Check Survival Achievements ====================
    if (survived) {
      // Count total survivals (need to track this separately)
      const survivalProgress = userAchievements.achievements[AchievementId.SURVIVOR_10]?.current || 0;
      const newSurvivals = survivalProgress + 1;
      checkAndUnlock(AchievementId.SURVIVOR_10, newSurvivals);
      checkAndUnlock(AchievementId.SURVIVOR_50, newSurvivals);
    }

    // ==================== Check Level Achievements ====================
    const levelInfo = calculateLevelInfo(stats.totalXP);
    checkAndUnlock(AchievementId.LEVEL_10, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_25, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_50, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_75, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_100, levelInfo.level);

    // ==================== Save achievements ====================
    userAchievements.totalXPFromAchievements += totalXPGained;
    userAchievements.lastUpdated = Date.now();
    writeAchievements(nk, userId, userAchievements);

    // If XP was gained from achievements, update user stats
    if (totalXPGained > 0) {
      stats.totalXP += totalXPGained;
      const newLevelInfo = calculateLevelInfo(stats.totalXP);
      stats.level = newLevelInfo.level;
      stats.currentXP = newLevelInfo.currentXP;

      nk.storageWrite([{
        collection: STATS_COLLECTION,
        key: STATS_KEY,
        userId,
        value: stats,
        permissionRead: 2,
        permissionWrite: 0,
      }]);
    }

    return JSON.stringify({
      success: true,
      newUnlocks,
      totalXPGained,
      totalUnlocked: userAchievements.totalUnlocked,
    });
  } catch (e) {
    logger.error(`Failed to update achievements: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to update achievements: ${e}`,
    });
  }
}

// ============================================================================
// Leaderboard System RPCs
// ============================================================================

/** Leaderboard type */
type LeaderboardType = 'level' | 'wins' | 'winRate' | 'winStreak';

/** Leaderboard entry */
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  value: number;
  level: number;
  totalGames: number;
  wins: number;
  winRate: number;
  maxWinStreak: number;
}

/**
 * RPC: Get leaderboard
 * Returns top players by various metrics
 */
function rpcGetLeaderboard(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let type: LeaderboardType = 'level';
  let limit = 50;
  let offset = 0;

  if (payload) {
    try {
      const params = JSON.parse(payload);
      type = params.type || 'level';
      limit = Math.min(params.limit || 50, 100); // Max 100 entries
      offset = params.offset || 0;
    } catch (e) {
      logger.error(`Failed to parse get_leaderboard payload: ${e}`);
    }
  }

  logger.info(`Getting leaderboard: type=${type}, limit=${limit}, offset=${offset}`);

  try {
    // Read all user stats from storage
    // Note: In production, you would want to use Nakama's built-in leaderboard system
    // For simplicity, we're doing a manual query here
    const query = `+value.totalGames:>0`;
    const objects = nk.storageList(
      undefined, // No specific user
      STATS_COLLECTION,
      200, // Read up to 200 entries
      undefined
    );

    if (objects.length === 0) {
      return JSON.stringify({
        success: true,
        leaderboard: [],
        type,
        total: 0,
      });
    }

    // Get user info for all users
    const userIds = objects.map(obj => obj.userId);
    let usersMap: Record<string, { username: string; displayName: string }> = {};

    try {
      const users = nk.usersGetId(userIds);
      for (const user of users) {
        usersMap[user.userId] = {
          username: user.username || '',
          displayName: user.displayName || user.username || '',
        };
      }
    } catch (e) {
      logger.warn(`Failed to get user info: ${e}`);
    }

    // Transform storage objects to leaderboard entries
    let entries: Array<{
      userId: string;
      stats: UserStats;
      sortValue: number;
    }> = [];

    for (const obj of objects) {
      const stats = obj.value as UserStats;
      if (!stats || stats.totalGames === 0) continue;

      let sortValue = 0;
      switch (type) {
        case 'level':
          sortValue = stats.totalXP || 0;
          break;
        case 'wins':
          sortValue = stats.wins || 0;
          break;
        case 'winRate':
          // Require at least 10 games for win rate ranking
          if (stats.totalGames >= 10) {
            sortValue = stats.winRate || 0;
          }
          break;
        case 'winStreak':
          sortValue = stats.maxWinStreak || 0;
          break;
      }

      entries.push({
        userId: obj.userId,
        stats,
        sortValue,
      });
    }

    // Sort by sort value (descending)
    entries.sort((a, b) => b.sortValue - a.sortValue);

    // Apply pagination
    const total = entries.length;
    entries = entries.slice(offset, offset + limit);

    // Build leaderboard response
    const leaderboard: LeaderboardEntry[] = entries.map((entry, index) => {
      const user = usersMap[entry.userId] || { username: '', displayName: '' };
      let value = 0;

      switch (type) {
        case 'level':
          value = entry.stats.level || 1;
          break;
        case 'wins':
          value = entry.stats.wins || 0;
          break;
        case 'winRate':
          value = entry.stats.winRate || 0;
          break;
        case 'winStreak':
          value = entry.stats.maxWinStreak || 0;
          break;
      }

      return {
        rank: offset + index + 1,
        userId: entry.userId,
        username: user.username,
        displayName: user.displayName,
        value,
        level: entry.stats.level || 1,
        totalGames: entry.stats.totalGames || 0,
        wins: entry.stats.wins || 0,
        winRate: entry.stats.winRate || 0,
        maxWinStreak: entry.stats.maxWinStreak || 0,
      };
    });

    // Get current user's rank if they're in the leaderboard
    let myRank: LeaderboardEntry | null = null;
    const myEntryIndex = entries.findIndex(e => e.userId === ctx.userId);
    if (myEntryIndex === -1) {
      // User not in current page, check if they have stats
      const myStatsObjs = nk.storageRead([{
        collection: STATS_COLLECTION,
        key: STATS_KEY,
        userId: ctx.userId,
      }]);

      if (myStatsObjs.length > 0 && myStatsObjs[0].value) {
        const myStats = myStatsObjs[0].value as UserStats;
        if (myStats.totalGames > 0) {
          // Find my rank by counting how many are ahead
          let myValue = 0;
          switch (type) {
            case 'level':
              myValue = myStats.totalXP || 0;
              break;
            case 'wins':
              myValue = myStats.wins || 0;
              break;
            case 'winRate':
              myValue = myStats.totalGames >= 10 ? (myStats.winRate || 0) : -1;
              break;
            case 'winStreak':
              myValue = myStats.maxWinStreak || 0;
              break;
          }

          // Count how many are ahead
          let aheadCount = 0;
          for (const obj of objects) {
            const stats = obj.value as UserStats;
            if (!stats || stats.totalGames === 0) continue;
            if (obj.userId === ctx.userId) continue;

            let otherValue = 0;
            switch (type) {
              case 'level':
                otherValue = stats.totalXP || 0;
                break;
              case 'wins':
                otherValue = stats.wins || 0;
                break;
              case 'winRate':
                otherValue = stats.totalGames >= 10 ? (stats.winRate || 0) : -1;
                break;
              case 'winStreak':
                otherValue = stats.maxWinStreak || 0;
                break;
            }

            if (otherValue > myValue) {
              aheadCount++;
            }
          }

          const myUser = usersMap[ctx.userId] || { username: ctx.username || '', displayName: ctx.username || '' };
          let displayValue = 0;
          switch (type) {
            case 'level':
              displayValue = myStats.level || 1;
              break;
            case 'wins':
              displayValue = myStats.wins || 0;
              break;
            case 'winRate':
              displayValue = myStats.winRate || 0;
              break;
            case 'winStreak':
              displayValue = myStats.maxWinStreak || 0;
              break;
          }

          myRank = {
            rank: aheadCount + 1,
            userId: ctx.userId,
            username: myUser.username,
            displayName: myUser.displayName,
            value: displayValue,
            level: myStats.level || 1,
            totalGames: myStats.totalGames || 0,
            wins: myStats.wins || 0,
            winRate: myStats.winRate || 0,
            maxWinStreak: myStats.maxWinStreak || 0,
          };
        }
      }
    }

    return JSON.stringify({
      success: true,
      leaderboard,
      type,
      total,
      offset,
      limit,
      myRank,
    });
  } catch (e) {
    logger.error(`Failed to get leaderboard: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to get leaderboard: ${e}`,
    });
  }
}

// ============================================================================
// Replay System RPC
// ============================================================================

/**
 * RPC: Get user's replay list
 */
function rpcGetReplays(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    let limit = 20;
    let offset = 0;

    if (payload) {
      const params = JSON.parse(payload);
      limit = Math.min(params.limit || 20, 50);
      offset = params.offset || 0;
    }

    const result = getUserReplays(nk, ctx.userId, limit, offset);

    return JSON.stringify({
      success: true,
      replays: result.replays,
      total: result.total,
      limit,
      offset
    });
  } catch (e) {
    logger.error(`Failed to get replays: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to get replays: ${e}`
    });
  }
}

/**
 * RPC: Get a specific replay by ID
 */
function rpcGetReplayById(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    if (!payload) {
      return JSON.stringify({
        success: false,
        error: 'Replay ID is required'
      });
    }

    const params = JSON.parse(payload);
    const replayId = params.replayId || params.id;

    if (!replayId) {
      return JSON.stringify({
        success: false,
        error: 'Replay ID is required'
      });
    }

    // Try to get the replay
    let replay: GameReplay | null = null;

    // First, try with ownerId if provided
    if (params.ownerId) {
      replay = getReplayByOwner(nk, replayId, params.ownerId);
    }

    // If not found, try to search
    if (!replay) {
      replay = getReplay(nk, replayId);
    }

    if (!replay) {
      return JSON.stringify({
        success: false,
        error: 'Replay not found'
      });
    }

    // Calculate stats
    const stats = getReplayStats(replay);
    const keyEvents = getKeyEvents(replay);

    return JSON.stringify({
      success: true,
      replay,
      stats,
      keyEvents
    });
  } catch (e) {
    logger.error(`Failed to get replay: ${e}`);
    return JSON.stringify({
      success: false,
      error: `Failed to get replay: ${e}`
    });
  }
}

// Export for esbuild bundling
// @ts-ignore - Nakama runtime expects InitModule to be available globally
globalThis.InitModule = InitModule;
