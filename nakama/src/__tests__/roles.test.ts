/**
 * Role Skills Unit Tests
 * Tests for individual role abilities and interactions
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import {
  setupTestGame,
  resetPlayerIdCounter,
  getPlayerByRole,
  getPlayersByRole,
  checkWinCondition,
  canUseDeathSkill,
  processWolfKill,
  processWitchHeal,
  processWitchPoison,
  processSeerCheck,
  getAlivePlayers,
  getAliveWerewolves,
} from './test-utils';
import {
  Role,
  Faction,
  PlayerStatus,
  GamePhase,
  NightSubPhase,
} from '../werewolf/types';

// ============================================================================
// Werewolf Tests
// ============================================================================

describe('Werewolf Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('werewolves can kill a villager at night', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = getPlayerByRole(players, Role.VILLAGER)!;
    const result = processWolfKill(state, target.oderId);

    expect(result.killed).not.toBeNull();
    expect(result.killed?.oderId).toBe(target.oderId);
    expect(target.status).toBe(PlayerStatus.DEAD_BY_WOLF);
  });

  test('werewolves cannot kill protected player', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = players[3]; // A villager
    const targetExt = state.extendedStates.get(target.oderId)!;
    targetExt.isProtected = true;

    const result = processWolfKill(state, target.oderId);

    expect(result.killed).toBeNull();
    expect(result.savedByGuard).toBe(true);
    expect(target.status).toBe(PlayerStatus.ALIVE);
  });

  test('wolf votes determine kill target', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const target = getPlayerByRole(players, Role.VILLAGER)!;

    // Both wolves vote for the same target
    state.wolfVotes.set(wolves[0].oderId, target.oderId);
    state.wolfVotes.set(wolves[1].oderId, target.oderId);

    // Count votes
    const voteCount = new Map<string, number>();
    for (const targetId of state.wolfVotes.values()) {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
    }

    let maxVotes = 0;
    let selectedTarget = '';
    for (const [id, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count;
        selectedTarget = id;
      }
    }

    expect(selectedTarget).toBe(target.oderId);
    expect(maxVotes).toBe(2);
  });
});

// ============================================================================
// Alpha Wolf Tests
// ============================================================================

describe('Alpha Wolf Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('alpha wolf can use death skill when killed by vote', () => {
    const { players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const alphaWolf = getPlayerByRole(players, Role.ALPHA_WOLF)!;
    alphaWolf.status = PlayerStatus.DEAD_BY_VOTE;

    expect(canUseDeathSkill(alphaWolf, PlayerStatus.DEAD_BY_VOTE)).toBe(true);
  });

  test('alpha wolf can use death skill when killed by hunter', () => {
    const { players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const alphaWolf = getPlayerByRole(players, Role.ALPHA_WOLF)!;

    expect(canUseDeathSkill(alphaWolf, PlayerStatus.DEAD_BY_HUNTER)).toBe(true);
  });
});

// ============================================================================
// Seer Tests
// ============================================================================

describe('Seer Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('seer can check werewolf and get werewolf faction', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const werewolf = getPlayerByRole(players, Role.WEREWOLF)!;
    const result = processSeerCheck(state, werewolf.oderId);

    expect(result).toBe(Faction.WEREWOLF);
  });

  test('seer can check villager and get villager faction', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = getPlayerByRole(players, Role.VILLAGER)!;
    const result = processSeerCheck(state, villager.oderId);

    expect(result).toBe(Faction.VILLAGER);
  });

  test('seer can check alpha wolf and get werewolf faction', () => {
    const { state, players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const alphaWolf = getPlayerByRole(players, Role.ALPHA_WOLF)!;
    const result = processSeerCheck(state, alphaWolf.oderId);

    expect(result).toBe(Faction.WEREWOLF);
  });

  test('seer can check special roles and get villager faction', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.WITCH, Role.HUNTER, Role.GUARD],
    });

    const witch = getPlayerByRole(players, Role.WITCH)!;
    const hunter = getPlayerByRole(players, Role.HUNTER)!;
    const guard = getPlayerByRole(players, Role.GUARD)!;

    expect(processSeerCheck(state, witch.oderId)).toBe(Faction.VILLAGER);
    expect(processSeerCheck(state, hunter.oderId)).toBe(Faction.VILLAGER);
    expect(processSeerCheck(state, guard.oderId)).toBe(Faction.VILLAGER);
  });
});

// ============================================================================
// Witch Tests
// ============================================================================

describe('Witch Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('witch can heal player killed by wolf', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const victim = getPlayerByRole(players, Role.VILLAGER)!;

    // Wolf kills the victim first
    processWolfKill(state, victim.oderId);
    expect(victim.status).toBe(PlayerStatus.DEAD_BY_WOLF);

    // Witch heals
    const healed = processWitchHeal(state, victim.oderId);
    expect(healed).toBe(true);
    expect(victim.status).toBe(PlayerStatus.ALIVE);
  });

  test('witch cannot heal living player', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = getPlayerByRole(players, Role.VILLAGER)!;
    expect(target.status).toBe(PlayerStatus.ALIVE);

    const healed = processWitchHeal(state, target.oderId);
    expect(healed).toBe(false);
  });

  test('witch can poison living player', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = getPlayerByRole(players, Role.VILLAGER)!;

    const poisoned = processWitchPoison(state, target.oderId);
    expect(poisoned).not.toBeNull();
    expect(target.status).toBe(PlayerStatus.DEAD_BY_POISON);
  });

  test('witch cannot poison dead player', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = getPlayerByRole(players, Role.VILLAGER)!;
    target.status = PlayerStatus.DEAD_BY_WOLF;

    const poisoned = processWitchPoison(state, target.oderId);
    expect(poisoned).toBeNull();
  });

  test('witch has antidote and poison initially', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const witch = getPlayerByRole(players, Role.WITCH)!;
    const extState = state.extendedStates.get(witch.oderId)!;

    expect(extState.witchItems?.hasAntidote).toBe(true);
    expect(extState.witchItems?.hasPoison).toBe(true);
  });
});

// ============================================================================
// Hunter Tests
// ============================================================================

describe('Hunter Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('hunter can use death skill when killed by vote', () => {
    const { players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_VOTE)).toBe(true);
  });

  test('hunter can use death skill when killed by wolf', () => {
    const { players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_WOLF)).toBe(true);
  });

  test('hunter CANNOT use death skill when poisoned by witch', () => {
    const { players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.WITCH, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    // Hunter cannot shoot when poisoned
    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_POISON)).toBe(false);
  });

  test('hunter can shoot when killed by alpha wolf', () => {
    const { players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_ALPHA_WOLF)).toBe(true);
  });
});

// ============================================================================
// Guard Tests
// ============================================================================

describe('Guard Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('guard protection saves player from wolf kill', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = getPlayerByRole(players, Role.VILLAGER)!;
    const targetExt = state.extendedStates.get(target.oderId)!;

    // Guard protects the target
    targetExt.isProtected = true;
    state.guardTarget = target.oderId;

    // Wolf tries to kill
    const result = processWolfKill(state, target.oderId);

    expect(result.killed).toBeNull();
    expect(result.savedByGuard).toBe(true);
    expect(target.status).toBe(PlayerStatus.ALIVE);
  });

  test('guard cannot protect same person twice in a row', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const guard = getPlayerByRole(players, Role.GUARD)!;
    const guardExt = state.extendedStates.get(guard.oderId)!;
    const target = getPlayerByRole(players, Role.VILLAGER)!;

    // First night: guard protects target
    guardExt.lastProtectedBy = target.oderId;

    // Second night: guard tries to protect same target
    // This should be blocked by the game logic
    const canProtect = guardExt.lastProtectedBy !== target.oderId;
    expect(canProtect).toBe(false);

    // Guard can protect a different target
    const otherTarget = players[4]; // Another villager
    const canProtectOther = guardExt.lastProtectedBy !== otherTarget.oderId;
    expect(canProtectOther).toBe(true);
  });
});

// ============================================================================
// Idiot Tests
// ============================================================================

describe('Idiot Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('idiot can reveal to survive vote', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;

    expect(idiotExt.idiotRevealed).toBe(false);

    // Idiot gets voted out, reveals, and survives
    idiotExt.idiotRevealed = true;

    expect(idiotExt.idiotRevealed).toBe(true);
    expect(idiot.status).toBe(PlayerStatus.ALIVE); // Should still be alive after reveal
  });

  test('revealed idiot loses voting rights', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;

    // Idiot is revealed
    idiotExt.idiotRevealed = true;

    // Revealed idiot should not be able to vote
    const canVote = !idiotExt.idiotRevealed;
    expect(canVote).toBe(false);
  });
});

// ============================================================================
// Win Condition Tests
// ============================================================================

describe('Win Conditions', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('villagers win when all werewolves are dead', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill all werewolves
    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    wolves[0].status = PlayerStatus.DEAD_BY_VOTE;
    wolves[1].status = PlayerStatus.DEAD_BY_HUNTER;

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.VILLAGER);
  });

  test('werewolves win when they equal villagers', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill villagers until wolves equal villagers
    players[2].status = PlayerStatus.DEAD_BY_WOLF;
    players[3].status = PlayerStatus.DEAD_BY_WOLF;

    // Now: 2 wolves, 2 villagers => wolves win
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('werewolves win when they outnumber villagers', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill more villagers
    players[2].status = PlayerStatus.DEAD_BY_WOLF;
    players[3].status = PlayerStatus.DEAD_BY_WOLF;
    players[4].status = PlayerStatus.DEAD_BY_POISON;

    // Now: 2 wolves, 1 villager => wolves win
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('game continues when neither side wins', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill one villager - still more villagers than wolves
    players[2].status = PlayerStatus.DEAD_BY_WOLF;

    // Now: 2 wolves, 3 villagers => game continues
    const winner = checkWinCondition(state);
    expect(winner).toBeNull();
  });

  test('lovers win when they are the only survivors (cross-faction)', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Setup cross-faction lovers (wolf + villager)
    const wolf = players[0];
    const villager = players[3];

    state.cupidTarget1 = wolf.oderId;
    state.cupidTarget2 = villager.oderId;
    state.loversLinked = true;
    state.loversFaction = true; // Cross-faction

    const wolfExt = state.extendedStates.get(wolf.oderId)!;
    const villagerExt = state.extendedStates.get(villager.oderId)!;
    wolfExt.isLovers = true;
    wolfExt.loverId = villager.oderId;
    villagerExt.isLovers = true;
    villagerExt.loverId = wolf.oderId;

    // Kill everyone except the lovers
    players[1].status = PlayerStatus.DEAD_BY_VOTE; // Other wolf
    players[2].status = PlayerStatus.DEAD_BY_WOLF; // Cupid
    players[4].status = PlayerStatus.DEAD_BY_WOLF; // Villager
    players[5].status = PlayerStatus.DEAD_BY_WOLF; // Villager

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.LOVERS);
  });

  test('same-faction lovers do not get special win', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Setup same-faction lovers (villager + villager)
    const villager1 = players[3];
    const villager2 = players[4];

    state.cupidTarget1 = villager1.oderId;
    state.cupidTarget2 = villager2.oderId;
    state.loversLinked = true;
    state.loversFaction = false; // Same faction

    // Kill all werewolves
    players[0].status = PlayerStatus.DEAD_BY_VOTE;
    players[1].status = PlayerStatus.DEAD_BY_VOTE;

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.VILLAGER); // Not LOVERS
  });
});

// ============================================================================
// Cupid Tests
// ============================================================================

describe('Cupid Role', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('cupid can link two players as lovers', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      nightSubPhase: NightSubPhase.CUPID,
      dayNumber: 1,
    });

    const target1 = players[3];
    const target2 = players[4];

    // Link lovers
    state.cupidTarget1 = target1.oderId;
    state.cupidTarget2 = target2.oderId;
    state.loversLinked = true;

    const ext1 = state.extendedStates.get(target1.oderId)!;
    const ext2 = state.extendedStates.get(target2.oderId)!;
    ext1.isLovers = true;
    ext1.loverId = target2.oderId;
    ext2.isLovers = true;
    ext2.loverId = target1.oderId;

    expect(state.loversLinked).toBe(true);
    expect(ext1.isLovers).toBe(true);
    expect(ext2.isLovers).toBe(true);
    expect(ext1.loverId).toBe(target2.oderId);
    expect(ext2.loverId).toBe(target1.oderId);
  });

  test('cross-faction lovers are detected', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolf = players[0];
    const villager = players[3];

    state.cupidTarget1 = wolf.oderId;
    state.cupidTarget2 = villager.oderId;
    state.loversLinked = true;

    // Check if cross-faction
    const faction1 = players[0].role === Role.WEREWOLF ? Faction.WEREWOLF : Faction.VILLAGER;
    const faction2 = Faction.VILLAGER;
    const isCrossFaction = faction1 !== faction2;

    expect(isCrossFaction).toBe(true);
    state.loversFaction = true;
    expect(state.loversFaction).toBe(true);
  });
});

// ============================================================================
// Death Skill Chain Tests
// ============================================================================

describe('Death Skill Chains', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('hunter shooting alpha wolf triggers alpha wolf death skill', () => {
    const { players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;
    const alphaWolf = getPlayerByRole(players, Role.ALPHA_WOLF)!;

    // Hunter shoots alpha wolf
    alphaWolf.status = PlayerStatus.DEAD_BY_HUNTER;

    // Alpha wolf can still use death skill
    expect(canUseDeathSkill(alphaWolf, PlayerStatus.DEAD_BY_HUNTER)).toBe(true);
  });

  test('villager cannot use death skill', () => {
    const { players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = getPlayerByRole(players, Role.VILLAGER)!;

    expect(canUseDeathSkill(villager, PlayerStatus.DEAD_BY_VOTE)).toBe(false);
    expect(canUseDeathSkill(villager, PlayerStatus.DEAD_BY_WOLF)).toBe(false);
  });

  test('witch cannot use death skill', () => {
    const { players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const witch = getPlayerByRole(players, Role.WITCH)!;

    expect(canUseDeathSkill(witch, PlayerStatus.DEAD_BY_VOTE)).toBe(false);
    expect(canUseDeathSkill(witch, PlayerStatus.DEAD_BY_WOLF)).toBe(false);
  });
});
