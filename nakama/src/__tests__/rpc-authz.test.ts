/**
 * SEC-02: client-callable RPCs must not include stats/achievement writers.
 */

import { describe, expect, test } from 'bun:test';
import {
  CLIENT_RPC_IDS,
  FORBIDDEN_CLIENT_WRITE_RPC_IDS,
} from '../werewolf/rpc-registry';
import {
  applyGameResultStats,
  evaluateAchievements,
  readUserStats,
  readAchievements,
} from '../werewolf/game-result';
import { Role, Faction, AchievementId } from '../werewolf/types';
import { createMockLogger } from './test-utils';

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
    }>) => {
      for (const w of writes) {
        store.set(storageKey(w.collection, w.key, w.userId), w.value);
      }
    },
  };

  return nk as unknown as nkruntime.Nakama;
}

describe('SEC-02 RPC authz', () => {
  test('client RPC allowlist excludes write endpoints', () => {
    for (const forbidden of FORBIDDEN_CLIENT_WRITE_RPC_IDS) {
      expect(CLIENT_RPC_IDS).not.toContain(forbidden);
    }
    expect(CLIENT_RPC_IDS).toContain('get_user_stats');
    expect(CLIENT_RPC_IDS).toContain('get_achievements');
  });

  test('main.ts InitModule source does not register write RPCs', async () => {
    const mainSource = await Bun.file(
      new URL('../main.ts', import.meta.url)
    ).text();

    expect(mainSource).not.toMatch(/registerRpc\(\s*['"]record_game_result['"]/);
    expect(mainSource).not.toMatch(/registerRpc\(\s*['"]update_achievements['"]/);
    expect(mainSource).toContain('CLIENT_RPC_IDS');
    expect(mainSource).toContain("registerRpc('get_achievements'");
  });

  test('match-end writer applyGameResultStats updates stats and achievements without RPCs', () => {
    const nk = createMockNakama();
    const logger = createMockLogger();
    const userId = 'authz-player-1';

    const result = applyGameResultStats(nk, logger as any, {
      players: [
        {
          userId,
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
    expect(readUserStats(nk, userId).wins).toBe(1);

    const achievements = readAchievements(nk, userId);
    expect(achievements.achievements[AchievementId.FIRST_GAME]?.completed).toBe(true);
    expect(achievements.achievements[AchievementId.FIRST_WIN]?.completed).toBe(true);
  });

  test('evaluateAchievements is a server helper (callable without RPC registration)', () => {
    const nk = createMockNakama();
    const logger = createMockLogger();
    const userId = 'authz-player-2';

    applyGameResultStats(nk, logger as any, {
      players: [
        {
          userId,
          role: Role.WEREWOLF,
          faction: Faction.WEREWOLF,
          isWinner: true,
          isAlive: true,
          wasExposed: false,
        },
      ],
      winner: Faction.WEREWOLF,
    });

    const stats = readUserStats(nk, userId);
    expect(typeof evaluateAchievements).toBe('function');
    evaluateAchievements(nk, logger as any, {
      userId,
      stats,
      won: true,
      role: Role.WEREWOLF,
      faction: Faction.WEREWOLF,
      survived: true,
      wasSheriff: false,
      isLover: false,
      loversWon: false,
      wasExposed: false,
    });
  });
});
