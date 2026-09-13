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
  UserStats, createInitialUserStats, calculateLevelInfo,
  GameInvite, InviteStatus, INVITE_CONFIG, LevelInfo,
  // Achievement types
  AchievementId, AchievementCategory, AchievementRarity,
  AchievementDefinition, AchievementProgress, UserAchievements,
  ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CONFIG, createInitialUserAchievements,
  Role, Faction
} from './werewolf/types';
import {
  getUserReplays, getReplay, getReplayByOwner, getReplayStats, getKeyEvents,
  GameReplay, ReplayListItem
} from './werewolf/replay';
import {
  STATS_COLLECTION,
  STATS_KEY,
  applyGameResultStats,
  evaluateAchievements,
  persistAchievementEvaluation,
  readAchievements,
  readUserStats,
  resolvePlayerUserId,
} from './werewolf/game-result';

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

/**
 * RPC: Record game result (thin wrapper over shared applyGameResultStats)
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

    // Normalize oderId → userId so legacy payloads still work
    const normalizedPlayers = players.map((p: any) => ({
      ...p,
      userId: resolvePlayerUserId(p) || undefined,
    }));

    logger.info(`Recording game result for ${normalizedPlayers.length} players, winner: ${winner}`);

    // Stats-only: legacy clients may also call update_achievements; avoid double-counting
    // event-based achievement progress (survivals, skill counters, etc.).
    const result = applyGameResultStats(nk, logger, {
      players: normalizedPlayers,
      winner,
      sheriffId,
      evaluateAchievements: false,
    });

    return JSON.stringify({
      success: true,
      playersUpdated: result.playersUpdated,
      levelUps: result.levelUps,
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

    // Get match info
    const matches = nk.matchList(1, true, undefined, undefined, undefined, `+match_id:${matchId}`);
    if (matches.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Match not found',
      });
    }

    const match = matches[0];
    let matchLabel: { roomName?: string; maxPlayers?: number; password?: string; phase?: string } = {};
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

    // Get receiver info
    const receiverUsers = nk.usersGetId([receiverId]);
    if (receiverUsers.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'User not found',
      });
    }
    const receiver = receiverUsers[0];

    // Create invite
    const now = Date.now();
    const invite: GameInvite = {
      inviteId: generateInviteId(),
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
      expiresAt: now + INVITE_CONFIG.EXPIRE_TIME,
      password: matchLabel.password, // Include password for private rooms
    };

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
        invite: {
          ...invite,
          password: undefined, // Don't include password in notification
        },
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
 * RPC: Get pending invites for the current user
 */
function rpcGetInvites(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
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
      }
      // Only return pending invites by default
      if (invite.status === InviteStatus.PENDING) {
        validInvites.push({
          ...invite,
          password: undefined, // Don't expose password in list
        });
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

    // Check if already responded or expired
    if (invite.status !== InviteStatus.PENDING) {
      return JSON.stringify({
        success: false,
        error: `Invite is already ${invite.status}`,
      });
    }

    const now = Date.now();
    if (invite.expiresAt < now) {
      invite.status = InviteStatus.EXPIRED;
      writeInvites(nk, ctx.userId, 'received', invites);
      return JSON.stringify({
        success: false,
        error: 'Invite has expired',
      });
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

    // Notify sender about the response
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
    nk.notificationsSend(notifications);

    logger.info(`User ${ctx.userId} ${accept ? 'accepted' : 'declined'} invite ${inviteId}`);

    if (accept) {
      return JSON.stringify({
        success: true,
        matchId: invite.matchId,
        password: invite.password, // Return password for private rooms
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

  // Clean up old invites (keep last 50)
  const recentInvites = invites.slice(-50);

  nk.storageWrite([{
    collection: INVITE_CONFIG.STORAGE_COLLECTION,
    key,
    userId,
    value: { invites: recentInvites },
    permissionRead: 1, // Owner only
    permissionWrite: 0, // Server only
  }]);
}

// ============================================================================
// Achievement System RPCs
// ============================================================================

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
 * RPC: Update achievements based on game result (thin wrapper over evaluateAchievements)
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
      seerCheckedWolves = 0,
      witchSaved = false,
      witchPoisonedWolf = false,
      guardSaves,
      guardSaved = false,
      hunterKilledWolf = false,
      idiotRevealed = false,
      playerFactionSize = 0,
      votedOutWolves = 0,
      wasExposed,
    } = data;

    if (!userId) {
      return JSON.stringify({
        success: false,
        error: 'userId is required',
      });
    }

    logger.info(`Updating achievements for user ${userId}, won: ${won}, role: ${role}`);

    const stats = readUserStats(nk, userId);
    const result = evaluateAchievements(nk, logger, {
      userId,
      stats,
      won: !!won,
      role,
      faction,
      survived: !!survived,
      wasSheriff: !!wasSheriff,
      isLover: !!isLover,
      loversWon: !!loversWon,
      seerCheckedWolves,
      witchSaved,
      witchPoisonedWolf,
      guardSaves: typeof guardSaves === 'number' ? guardSaves : undefined,
      guardSaved,
      hunterKilledWolf,
      idiotRevealed,
      playerFactionSize,
      votedOutWolves,
      // Pass through as-is; undefined must not award SILENT_KILLER
      wasExposed: typeof wasExposed === 'boolean' ? wasExposed : undefined,
    });

    persistAchievementEvaluation(nk, result);

    const userAchievements = readAchievements(nk, userId);
    return JSON.stringify({
      success: true,
      newUnlocks: result.newUnlocks,
      totalXPGained: result.totalXPGained,
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
