/**
 * Shared game-end stats + achievement writer.
 * Used by the match handler (authoritative path) and RPC wrappers for API compatibility.
 */

import {
  UserStats,
  createInitialUserStats,
  calculateLevelInfo,
  calculateGameXP,
  AchievementId,
  AchievementProgress,
  UserAchievements,
  AchievementUnlock,
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_CONFIG,
  createInitialUserAchievements,
  checkAchievementUnlock,
  Role,
  Faction,
  isWerewolf,
} from './types';

export const STATS_COLLECTION = 'werewolf_stats';
export const STATS_KEY = 'user_stats';

/** Per-player result payload accepted by the shared writer */
export interface GameResultPlayer {
  /** Preferred Nakama user id */
  userId?: string;
  /** Legacy alias used by match handler payloads */
  oderId?: string;
  role: Role | string | null;
  faction: Faction | string;
  isWinner: boolean;
  isAlive: boolean;
  isLover?: boolean;
  /** Optional skill counters — defaulted when match state lacks them */
  seerCheckedWolves?: number;
  witchSaved?: boolean;
  witchPoisonedWolf?: boolean;
  guardSaved?: boolean;
  hunterKilledWolf?: boolean;
  idiotRevealed?: boolean;
  playerFactionSize?: number;
  votedOutWolves?: number;
  wasExposed?: boolean;
}

export interface ApplyGameResultInput {
  players: GameResultPlayer[];
  winner: Faction | string;
  sheriffId?: string | null;
  /**
   * When false, only update XP/stats (legacy record_game_result compatibility).
   * Achievements remain the responsibility of update_achievements / match path.
   * Defaults to true.
   */
  evaluateAchievements?: boolean;
}

export interface LevelUpInfo {
  userId: string;
  oldLevel: number;
  newLevel: number;
  xpGained: number;
}

export interface PlayerAchievementResult {
  userId: string;
  newUnlocks: AchievementUnlock[];
  totalXPGained: number;
}

export interface ApplyGameResultOutput {
  playersUpdated: number;
  levelUps: LevelUpInfo[];
  achievements: PlayerAchievementResult[];
}

export function resolvePlayerUserId(player: GameResultPlayer): string | null {
  const id = player.userId || player.oderId;
  return id && id.length > 0 ? id : null;
}

export function getTodayString(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

export function readUserStats(nk: nkruntime.Nakama, userId: string): UserStats {
  try {
    const objects = nk.storageRead([{
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
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
      if (!stats.userId) {
        stats.userId = userId;
      }
      return stats;
    }
  } catch {
    // fall through
  }
  return createInitialUserStats(userId);
}

export function readAchievements(nk: nkruntime.Nakama, userId: string): UserAchievements {
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
    // fall through
  }
  return createInitialUserAchievements(userId);
}

export function writeAchievements(
  nk: nkruntime.Nakama,
  userId: string,
  achievements: UserAchievements
): void {
  nk.storageWrite([{
    collection: ACHIEVEMENT_CONFIG.STORAGE_COLLECTION,
    key: ACHIEVEMENT_CONFIG.STORAGE_KEY,
    userId,
    value: achievements as { [key: string]: any },
    permissionRead: 2,
    permissionWrite: 0,
  }]);
}

/**
 * Apply one player's win/loss/XP/level/streak counters in memory.
 * Does not write storage.
 */
export function applyPlayerGameStats(
  stats: UserStats,
  player: GameResultPlayer,
  opts: {
    sheriffId?: string | null;
    winner: Faction | string;
    today: string;
    now: number;
  }
): { stats: UserStats; xpGained: number; oldLevel: number; leveledUp: boolean } {
  const userId = resolvePlayerUserId(player)!;
  const { role, faction, isWinner, isAlive, isLover } = player;
  const wasSheriff = userId === opts.sheriffId;
  const isFirstWinOfDay = isWinner && stats.lastWinDate !== opts.today;
  const oldLevel = stats.level || 1;

  if (isWinner) {
    stats.winStreak = (stats.winStreak || 0) + 1;
    stats.maxWinStreak = Math.max(stats.maxWinStreak || 0, stats.winStreak);
    stats.lastWinDate = opts.today;
  } else {
    stats.winStreak = 0;
  }

  const xpGained = calculateGameXP({
    won: isWinner,
    survived: isAlive,
    wasSheriff,
    sheriffWon: wasSheriff && isWinner,
    currentWinStreak: stats.winStreak,
    isFirstWinOfDay,
  });

  stats.totalXP = (stats.totalXP || 0) + xpGained;
  const levelInfo = calculateLevelInfo(stats.totalXP);
  stats.level = levelInfo.level;
  stats.currentXP = levelInfo.currentXP;

  stats.totalGames++;
  if (isWinner) {
    stats.wins++;
  } else {
    stats.losses++;
  }
  stats.winRate = stats.totalGames > 0
    ? Math.round((stats.wins / stats.totalGames) * 100)
    : 0;

  const oldSurvivalWeight = (stats.totalGames - 1) * (stats.survivalRate || 0);
  const newSurvival = isAlive ? 100 : 0;
  stats.survivalRate = stats.totalGames > 0
    ? Math.round((oldSurvivalWeight + newSurvival) / stats.totalGames)
    : 0;

  if (faction === Faction.WEREWOLF || faction === 'werewolf') {
    stats.werewolfGames++;
    if (isWinner) stats.werewolfWins++;
  } else if (
    faction === Faction.VILLAGER ||
    faction === 'villager' ||
    faction === Faction.NEUTRAL ||
    faction === 'neutral'
  ) {
    stats.villagerGames++;
    if (isWinner) stats.villagerWins++;
  }

  if (isLover) {
    stats.loversGames++;
    if (isWinner && (opts.winner === Faction.LOVERS || opts.winner === 'lovers')) {
      stats.loversWins++;
    }
  }

  if (role) {
    if (!stats.roleStats[role]) {
      stats.roleStats[role] = { played: 0, wins: 0 };
    }
    stats.roleStats[role].played++;
    if (isWinner) {
      stats.roleStats[role].wins++;
    }
  }

  if (wasSheriff) {
    stats.gamesAsSheriff++;
    if (isWinner) {
      stats.sheriffWins++;
    }
  }

  if (stats.firstGameAt === 0) {
    stats.firstGameAt = opts.now;
  }
  stats.lastGameAt = opts.now;

  return {
    stats,
    xpGained,
    oldLevel,
    leveledUp: levelInfo.level > oldLevel,
  };
}

export interface EvaluateAchievementsInput {
  userId: string;
  stats: UserStats;
  won: boolean;
  role: Role | string | null;
  faction: Faction | string;
  survived: boolean;
  wasSheriff: boolean;
  isLover: boolean;
  loversWon: boolean;
  seerCheckedWolves?: number;
  witchSaved?: boolean;
  witchPoisonedWolf?: boolean;
  guardSaved?: boolean;
  hunterKilledWolf?: boolean;
  idiotRevealed?: boolean;
  playerFactionSize?: number;
  votedOutWolves?: number;
  /**
   * Explicit exposure flag for SILENT_KILLER.
   * Only `false` awards the achievement; `undefined`/omitted is ineligible.
   */
  wasExposed?: boolean;
}

export interface EvaluateAchievementsResult {
  newUnlocks: AchievementUnlock[];
  totalXPGained: number;
  stats: UserStats;
  /** Achievements storage object ready to batch-write with stats */
  achievementsWrite: nkruntime.StorageWriteRequest;
}

/**
 * Evaluate achievements for a player after stats have been updated.
 * Does not persist — caller must write `achievementsWrite` (and updated stats) atomically.
 */
export function evaluateAchievements(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger | null,
  input: EvaluateAchievementsInput
): EvaluateAchievementsResult {
  const {
    userId,
    stats,
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
    guardSaved = false,
    hunterKilledWolf = false,
    idiotRevealed = false,
    playerFactionSize = 0,
    votedOutWolves = 0,
    wasExposed,
  } = input;

  const userAchievements = readAchievements(nk, userId);
  const newUnlocks: AchievementUnlock[] = [];
  let totalXPGained = 0;

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
      logger?.info(`User ${userId} unlocked achievement: ${definition.name}`);
    }
  };

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

  const checkLevelAchievements = () => {
    const levelInfo = calculateLevelInfo(stats.totalXP);
    checkAndUnlock(AchievementId.LEVEL_10, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_25, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_50, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_75, levelInfo.level);
    checkAndUnlock(AchievementId.LEVEL_100, levelInfo.level);
  };

  // Beginner
  checkAndUnlock(AchievementId.FIRST_GAME, stats.totalGames);
  if (won) {
    checkAndUnlock(AchievementId.FIRST_WIN, stats.wins);
  }
  if (won && (faction === Faction.WEREWOLF || faction === 'werewolf')) {
    checkAndUnlock(AchievementId.FIRST_WOLF_WIN, stats.werewolfWins);
  }
  if (won && (faction === Faction.VILLAGER || faction === 'villager')) {
    checkAndUnlock(AchievementId.FIRST_VILLAGER_WIN, stats.villagerWins);
  }

  // Games / wins / streaks
  checkAndUnlock(AchievementId.GAMES_10, stats.totalGames);
  checkAndUnlock(AchievementId.GAMES_50, stats.totalGames);
  checkAndUnlock(AchievementId.GAMES_100, stats.totalGames);
  checkAndUnlock(AchievementId.GAMES_500, stats.totalGames);
  checkAndUnlock(AchievementId.GAMES_1000, stats.totalGames);

  checkAndUnlock(AchievementId.WINS_10, stats.wins);
  checkAndUnlock(AchievementId.WINS_50, stats.wins);
  checkAndUnlock(AchievementId.WINS_100, stats.wins);
  checkAndUnlock(AchievementId.WINS_500, stats.wins);

  if (won) {
    checkAndUnlock(AchievementId.WIN_STREAK_3, stats.winStreak);
    checkAndUnlock(AchievementId.WIN_STREAK_5, stats.winStreak);
    checkAndUnlock(AchievementId.WIN_STREAK_10, stats.winStreak);
    checkAndUnlock(AchievementId.WIN_STREAK_20, stats.winStreak);
  }

  // Role masters
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

  // Skill achievements
  if (role === Role.SEER && seerCheckedWolves > 0) {
    const currentProgress = userAchievements.achievements[AchievementId.SEER_CORRECT_10]?.current || 0;
    const newTotal = currentProgress + seerCheckedWolves;
    checkAndUnlock(AchievementId.SEER_CORRECT_10, newTotal);
    checkAndUnlock(AchievementId.SEER_CORRECT_50, newTotal);
  }
  if (role === Role.WITCH && witchSaved) {
    incrementAndCheck(AchievementId.WITCH_SAVE_10);
  }
  if (role === Role.WITCH && witchPoisonedWolf) {
    incrementAndCheck(AchievementId.WITCH_POISON_WOLF_10);
  }
  if (role === Role.GUARD && guardSaved) {
    incrementAndCheck(AchievementId.GUARD_SAVE_10);
  }
  if ((role === Role.HUNTER || role === Role.ALPHA_WOLF) && hunterKilledWolf) {
    incrementAndCheck(AchievementId.HUNTER_KILL_WOLF_10);
  }

  // Sheriff
  if (wasSheriff) {
    checkAndUnlock(AchievementId.SHERIFF_ELECTED_10, stats.gamesAsSheriff);
    if (won) {
      checkAndUnlock(AchievementId.SHERIFF_WIN_10, stats.sheriffWins);
    }
  }

  // Special
  if (isLover && loversWon) {
    incrementAndCheck(AchievementId.LOVER_VICTORY);
  }
  if (role === Role.IDIOT && idiotRevealed && survived) {
    incrementAndCheck(AchievementId.IDIOT_REVEAL);
  }
  if (role === Role.WITCH && witchSaved && witchPoisonedWolf) {
    incrementAndCheck(AchievementId.DOUBLE_KILL_WITCH);
  }
  if (won && role && !isWerewolf(role as Role) && votedOutWolves >= 2) {
    incrementAndCheck(AchievementId.WOLF_EXTERMINATOR);
  }
  // Require explicit wasExposed === false; omitted/undefined is ineligible
  if (won && role && isWerewolf(role as Role) && wasExposed === false) {
    incrementAndCheck(AchievementId.SILENT_KILLER);
  }
  if (won && role && !isWerewolf(role as Role) && playerFactionSize === 1) {
    incrementAndCheck(AchievementId.LAST_STAND);
  }
  if (won && playerFactionSize === 1) {
    incrementAndCheck(AchievementId.COMEBACK_KING);
  }

  // Survival
  if (survived) {
    const survivalProgress = userAchievements.achievements[AchievementId.SURVIVOR_10]?.current || 0;
    const newSurvivals = survivalProgress + 1;
    checkAndUnlock(AchievementId.SURVIVOR_10, newSurvivals);
    checkAndUnlock(AchievementId.SURVIVOR_50, newSurvivals);
  }

  // Apply achievement XP, then re-check level achievements (cascade until stable)
  if (totalXPGained > 0) {
    stats.totalXP += totalXPGained;
    const newLevelInfo = calculateLevelInfo(stats.totalXP);
    stats.level = newLevelInfo.level;
    stats.currentXP = newLevelInfo.currentXP;
  }

  let previousUnlockCount = -1;
  while (previousUnlockCount !== newUnlocks.length) {
    previousUnlockCount = newUnlocks.length;
    const xpBefore = totalXPGained;
    checkLevelAchievements();
    const levelXpDelta = totalXPGained - xpBefore;
    if (levelXpDelta > 0) {
      stats.totalXP += levelXpDelta;
      const newLevelInfo = calculateLevelInfo(stats.totalXP);
      stats.level = newLevelInfo.level;
      stats.currentXP = newLevelInfo.currentXP;
    }
  }

  userAchievements.totalXPFromAchievements += totalXPGained;
  userAchievements.lastUpdated = Date.now();

  const achievementsWrite: nkruntime.StorageWriteRequest = {
    collection: ACHIEVEMENT_CONFIG.STORAGE_COLLECTION,
    key: ACHIEVEMENT_CONFIG.STORAGE_KEY,
    userId,
    value: userAchievements as { [key: string]: any },
    permissionRead: 2,
    permissionWrite: 0,
  };

  return { newUnlocks, totalXPGained, stats, achievementsWrite };
}

/**
 * Persist a single player's achievement evaluation (for the update_achievements RPC).
 */
export function persistAchievementEvaluation(
  nk: nkruntime.Nakama,
  result: EvaluateAchievementsResult
): void {
  const writes: nkruntime.StorageWriteRequest[] = [result.achievementsWrite];
  if (result.totalXPGained > 0) {
    const userId = result.achievementsWrite.userId;
    writes.push({
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
      value: result.stats as { [key: string]: any },
      permissionRead: 2,
      permissionWrite: 0,
    });
  }
  nk.storageWrite(writes);
}

/**
 * Authoritative game-end writer: updates XP/level/streak/stats and evaluates achievements.
 * Stats + achievement objects are committed in one storageWrite batch.
 */
export function applyGameResultStats(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger | null,
  input: ApplyGameResultInput
): ApplyGameResultOutput {
  const { players, winner, sheriffId } = input;
  const shouldEvaluateAchievements = input.evaluateAchievements !== false;
  const now = Date.now();
  const today = getTodayString();
  const writes: nkruntime.StorageWriteRequest[] = [];
  const levelUps: LevelUpInfo[] = [];
  const achievements: PlayerAchievementResult[] = [];

  for (const player of players) {
    const userId = resolvePlayerUserId(player);
    if (!userId) {
      logger?.warn('Skipping player without userId/oderId in game result');
      continue;
    }

    let stats = readUserStats(nk, userId);
    const applied = applyPlayerGameStats(stats, player, {
      sheriffId,
      winner,
      today,
      now,
    });
    stats = applied.stats;

    if (applied.leveledUp) {
      levelUps.push({
        userId,
        oldLevel: applied.oldLevel,
        newLevel: stats.level,
        xpGained: applied.xpGained,
      });
      logger?.info(`Player ${userId} leveled up: ${applied.oldLevel} -> ${stats.level}`);
    }

    if (shouldEvaluateAchievements) {
      const loversWon = winner === Faction.LOVERS || winner === 'lovers';
      const wasSheriff = userId === sheriffId;
      const achievementResult = evaluateAchievements(nk, logger, {
        userId,
        stats,
        won: player.isWinner,
        role: player.role,
        faction: player.faction,
        survived: player.isAlive,
        wasSheriff,
        isLover: !!player.isLover,
        loversWon: !!player.isLover && loversWon,
        seerCheckedWolves: player.seerCheckedWolves ?? 0,
        witchSaved: player.witchSaved ?? false,
        witchPoisonedWolf: player.witchPoisonedWolf ?? false,
        guardSaved: player.guardSaved ?? false,
        hunterKilledWolf: player.hunterKilledWolf ?? false,
        idiotRevealed: player.idiotRevealed ?? false,
        playerFactionSize: player.playerFactionSize ?? 0,
        votedOutWolves: player.votedOutWolves ?? 0,
        // Pass through as-is (undefined stays undefined — no false default)
        wasExposed: player.wasExposed,
      });
      stats = achievementResult.stats;
      writes.push(achievementResult.achievementsWrite);

      achievements.push({
        userId,
        newUnlocks: achievementResult.newUnlocks,
        totalXPGained: achievementResult.totalXPGained,
      });
    }

    writes.push({
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
      value: stats as { [key: string]: any },
      permissionRead: 2,
      permissionWrite: 0,
    });
  }

  if (writes.length > 0) {
    nk.storageWrite(writes);
    logger?.info(
      `Recorded stats for ${players.length} players (${writes.length} storage objects), ${levelUps.length} leveled up`
    );
  }

  return {
    playersUpdated: players.filter(p => resolvePlayerUserId(p)).length,
    levelUps,
    achievements,
  };
}
