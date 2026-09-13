/**
 * Tests for shared game-result writer (XP + achievements on match end)
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import {
  applyGameResultStats,
  readUserStats,
  readAchievements,
  STATS_COLLECTION,
  STATS_KEY,
} from '../werewolf/game-result';
import {
  Role,
  Faction,
  AchievementId,
  ACHIEVEMENT_CONFIG,
  XP_REWARDS,
  getFinalGuardActionsByPlayer,
  computePlayerFactionSize,
  findWitchActionForEffectiveTarget,
} from '../werewolf/types';
import { createMockLogger } from './test-utils';

// ============================================================================
// In-memory Nakama storage mock
// ============================================================================

type StorageKey = string;

function storageKey(collection: string, key: string, userId: string): StorageKey {
  return `${collection}::${key}::${userId}`;
}

function createMockNakama() {
  const store = new Map<StorageKey, any>();

  const nk = {
    storageRead: (reads: Array<{ collection: string; key: string; userId: string }>) => {
      return reads
        .map(r => {
          const value = store.get(storageKey(r.collection, r.key, r.userId));
          if (value === undefined) return null;
          return {
            collection: r.collection,
            key: r.key,
            userId: r.userId,
            value,
          };
        })
        .filter(Boolean) as any[];
    },
    storageWrite: (writes: Array<{
      collection: string;
      key: string;
      userId: string;
      value: any;
      permissionRead?: number;
      permissionWrite?: number;
    }>) => {
      for (const w of writes) {
        store.set(storageKey(w.collection, w.key, w.userId), w.value);
      }
    },
    _store: store,
  };

  return nk as unknown as nkruntime.Nakama & { _store: Map<StorageKey, any> };
}

describe('applyGameResultStats', () => {
  let nk: ReturnType<typeof createMockNakama>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    nk = createMockNakama();
    logger = createMockLogger();
  });

  test('finishing a match increments XP and unlocks FIRST_GAME / FIRST_WIN', () => {
    const userId = 'player-winner-1';

    const result = applyGameResultStats(nk, logger as any, {
      players: [
        {
          oderId: userId, // match-handler style field; writer resolves to userId
          role: Role.VILLAGER,
          faction: Faction.VILLAGER,
          isWinner: true,
          isAlive: true,
          isLover: false,
        },
      ],
      winner: Faction.VILLAGER,
      sheriffId: null,
    });

    expect(result.playersUpdated).toBe(1);

    const stats = readUserStats(nk, userId);
    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.totalXP).toBeGreaterThan(0);
    // Base completion + win + survived + first win of day (+ achievement XP)
    const minGameXp =
      XP_REWARDS.GAME_COMPLETED +
      XP_REWARDS.GAME_WON +
      XP_REWARDS.SURVIVED +
      XP_REWARDS.FIRST_WIN_OF_DAY;
    expect(stats.totalXP).toBeGreaterThanOrEqual(minGameXp);
    expect(stats.level).toBeGreaterThanOrEqual(1);
    expect(stats.winStreak).toBe(1);

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.FIRST_GAME]?.completed).toBe(true);
    expect(achievements.achievements[AchievementId.FIRST_WIN]?.completed).toBe(true);

    const unlockIds = result.achievements[0].newUnlocks.map(u => u.achievement.id);
    expect(unlockIds).toContain(AchievementId.FIRST_GAME);
    expect(unlockIds).toContain(AchievementId.FIRST_WIN);

    // Stats persisted under werewolf_stats
    const stored = nk.storageRead([{
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
    }]);
    expect(stored.length).toBe(1);
    expect((stored[0].value as any).userId).toBe(userId);

    // Achievements persisted
    const storedAch = nk.storageRead([{
      collection: ACHIEVEMENT_CONFIG.STORAGE_COLLECTION,
      key: ACHIEVEMENT_CONFIG.STORAGE_KEY,
      userId,
    }]);
    expect(storedAch.length).toBe(1);
  });

  test('accepts userId field (RPC-style) and applies loss without FIRST_WIN', () => {
    const userId = 'player-loser-1';

    applyGameResultStats(nk, logger as any, {
      players: [
        {
          userId,
          role: Role.WEREWOLF,
          faction: Faction.WEREWOLF,
          isWinner: false,
          isAlive: false,
        },
      ],
      winner: Faction.VILLAGER,
    });

    const stats = readUserStats(nk, userId);
    expect(stats.totalGames).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.winStreak).toBe(0);
    expect(stats.totalXP).toBeGreaterThan(0);

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.FIRST_GAME]?.completed).toBe(true);
    expect(achievements.achievements[AchievementId.FIRST_WIN]?.completed).toBe(false);
  });

  test('migrates legacy stats missing level fields', () => {
    const userId = 'legacy-player';
    nk.storageWrite([{
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
      value: {
        userId,
        totalGames: 2,
        wins: 1,
        losses: 1,
        winRate: 50,
        villagerWins: 1,
        villagerGames: 2,
        werewolfWins: 0,
        werewolfGames: 0,
        loversWins: 0,
        loversGames: 0,
        roleStats: {},
        survivalRate: 50,
        gamesAsSheriff: 0,
        sheriffWins: 0,
        firstGameAt: 1,
        lastGameAt: 2,
        // no level / XP fields
      },
      permissionRead: 2,
      permissionWrite: 0,
    }]);

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.SEER,
        faction: Faction.VILLAGER,
        isWinner: true,
        isAlive: true,
      }],
      winner: Faction.VILLAGER,
    });

    const stats = readUserStats(nk, userId);
    expect(stats.level).toBeDefined();
    expect(stats.totalXP).toBeGreaterThan(0);
    expect(stats.totalGames).toBe(3);
    expect(stats.wins).toBe(2);
  });

  test('does not award SILENT_KILLER when wasExposed is omitted', () => {
    const userId = 'wolf-unknown-exposure';

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.WEREWOLF,
        faction: Faction.WEREWOLF,
        isWinner: true,
        isAlive: true,
        // wasExposed intentionally omitted
      }],
      winner: Faction.WEREWOLF,
    });

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.SILENT_KILLER]?.completed).toBeFalsy();
  });

  test('awards SILENT_KILLER only when wasExposed is explicitly false', () => {
    const userId = 'wolf-silent';

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.WEREWOLF,
        faction: Faction.WEREWOLF,
        isWinner: true,
        isAlive: true,
        wasExposed: false,
      }],
      winner: Faction.WEREWOLF,
    });

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.SILENT_KILLER]?.completed).toBe(true);
  });

  test('advances skill achievements from real match outcomes', () => {
    const userId = 'seer-accurate';

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.SEER,
        faction: Faction.VILLAGER,
        isWinner: true,
        isAlive: true,
        seerCheckedWolves: 2,
      }],
      winner: Faction.VILLAGER,
    });

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.SEER_CORRECT_10]?.current).toBe(2);
  });

  test('adds multiple guard saves toward GUARD_SAVE_10', () => {
    const userId = 'guard-multi-save';

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.GUARD,
        faction: Faction.VILLAGER,
        isWinner: true,
        isAlive: true,
        guardSaves: 3,
      }],
      winner: Faction.VILLAGER,
    });

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.GUARD_SAVE_10]?.current).toBe(3);
  });

  test('requires survival for LAST_STAND and COMEBACK_KING', () => {
    const deadTeammate = 'dead-villager';
    const soleSurvivor = 'alive-villager';

    applyGameResultStats(nk, logger as any, {
      players: [
        {
          userId: deadTeammate,
          role: Role.VILLAGER,
          faction: Faction.VILLAGER,
          isWinner: true,
          isAlive: false,
          playerFactionSize: 1,
        },
        {
          userId: soleSurvivor,
          role: Role.VILLAGER,
          faction: Faction.VILLAGER,
          isWinner: true,
          isAlive: true,
          playerFactionSize: 1,
        },
      ],
      winner: Faction.VILLAGER,
    });

    const deadAchievements = readAchievements(nk, deadTeammate);
    expect(deadAchievements.achievements[AchievementId.LAST_STAND]?.completed).toBeFalsy();
    expect(deadAchievements.achievements[AchievementId.COMEBACK_KING]?.completed).toBeFalsy();

    const aliveAchievements = readAchievements(nk, soleSurvivor);
    expect(aliveAchievements.achievements[AchievementId.LAST_STAND]?.completed).toBe(true);
    expect(aliveAchievements.achievements[AchievementId.COMEBACK_KING]?.completed).toBe(true);
  });

  test('dedupes alternating guard actions to the final target per night', () => {
    const actions = [
      { playerId: 'guard-1', role: Role.GUARD, action: 'protect', targetId: 'A', timestamp: 1 },
      { playerId: 'guard-1', role: Role.GUARD, action: 'protect', targetId: 'B', timestamp: 2 },
      { playerId: 'guard-1', role: Role.GUARD, action: 'protect', targetId: 'A', timestamp: 3 },
    ];

    const finalByPlayer = getFinalGuardActionsByPlayer(actions);
    expect(finalByPlayer.size).toBe(1);
    expect(finalByPlayer.get('guard-1')?.targetId).toBe('A');

    // Counting matching entries without dedupe would yield 2; final action yields 1
    const matchingRaw = actions.filter(a => a.targetId === 'A').length;
    expect(matchingRaw).toBe(2);
    const matchingFinal = Array.from(finalByPlayer.values()).filter(a => a.targetId === 'A').length;
    expect(matchingFinal).toBe(1);
  });

  test('credits poison to the witch matching the effective target', () => {
    const actions = [
      { playerId: 'witch-a', role: Role.WITCH, action: 'poison', targetId: 'villager-1', timestamp: 1 },
      { playerId: 'witch-b', role: Role.WITCH, action: 'poison', targetId: 'wolf-1', timestamp: 2 },
    ];

    // Naive .find(poison) credits witch-a; effective target wolf-1 must credit witch-b
    const naive = actions.find(a => a.role === Role.WITCH && a.action === 'poison');
    expect(naive?.playerId).toBe('witch-a');

    const credited = findWitchActionForEffectiveTarget(actions, 'poison', 'wolf-1');
    expect(credited?.playerId).toBe('witch-b');
    expect(credited?.targetId).toBe('wolf-1');

    expect(findWitchActionForEffectiveTarget(actions, 'poison', null)).toBeUndefined();
  });

  test('sizes sole-survivor factions with effective allies and lovers', () => {
    // Cupid (neutral) must count living villagers as allies on a village win
    expect(computePlayerFactionSize({
      winner: Faction.VILLAGER,
      playerRole: Role.CUPID,
      playerIsLover: false,
      alivePlayers: [
        { role: Role.CUPID, isLover: false },
        { role: Role.VILLAGER, isLover: false },
        { role: Role.SEER, isLover: false },
      ],
    })).toBe(3);

    // Raw NEUTRAL-only sizing would incorrectly report 1
    expect(computePlayerFactionSize({
      winner: Faction.VILLAGER,
      playerRole: Role.CUPID,
      playerIsLover: false,
      alivePlayers: [
        { role: Role.CUPID, isLover: false },
      ],
    })).toBe(1);

    // Lovers victory sizes the lovers pair, not origin factions
    expect(computePlayerFactionSize({
      winner: Faction.LOVERS,
      playerRole: Role.VILLAGER,
      playerIsLover: true,
      alivePlayers: [
        { role: Role.VILLAGER, isLover: true },
        { role: Role.WEREWOLF, isLover: true },
      ],
    })).toBe(2);
  });

  test('skips achievements when evaluateAchievements is false', () => {
    const userId = 'stats-only';

    applyGameResultStats(nk, logger as any, {
      players: [{
        userId,
        role: Role.VILLAGER,
        faction: Faction.VILLAGER,
        isWinner: true,
        isAlive: true,
      }],
      winner: Faction.VILLAGER,
      evaluateAchievements: false,
    });

    const stats = readUserStats(nk, userId);
    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(1);

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.FIRST_GAME]?.completed).toBeFalsy();
  });
});
