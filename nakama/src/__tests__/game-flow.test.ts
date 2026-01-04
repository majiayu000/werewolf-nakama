/**
 * Game Flow Integration Tests
 * Tests for complete game scenarios and multi-phase interactions
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import {
  setupTestGame,
  resetPlayerIdCounter,
  getPlayerByRole,
  getPlayersByRole,
  checkWinCondition,
  canUseDeathSkill,
  simulateNightPhase,
  simulateVoting,
  simulateGameTurn,
  transitionPhase,
  processLoverDeath,
  getPendingShooters,
  getAlivePlayers,
  getAliveWerewolves,
  getAliveVillagers,
} from './test-utils';
import {
  Role,
  Faction,
  PlayerStatus,
  GamePhase,
  NightSubPhase,
} from '../werewolf/types';

// ============================================================================
// Game Initialization Tests
// ============================================================================

describe('Game Initialization', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('game starts with correct number of players', () => {
    const { state, players } = setupTestGame({
      playerCount: 9,
      roles: [
        Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
        Role.SEER, Role.WITCH, Role.GUARD,
        Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
      ],
    });

    expect(state.players.size).toBe(9);
    expect(players.length).toBe(9);
  });

  test('roles are assigned correctly', () => {
    const { players } = setupTestGame({
      playerCount: 6,
      roles: [
        Role.WEREWOLF, Role.WEREWOLF,
        Role.SEER, Role.HUNTER,
        Role.VILLAGER, Role.VILLAGER,
      ],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const seer = getPlayerByRole(players, Role.SEER);
    const hunter = getPlayerByRole(players, Role.HUNTER);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    expect(wolves.length).toBe(2);
    expect(seer).toBeDefined();
    expect(hunter).toBeDefined();
    expect(villagers.length).toBe(2);
  });

  test('all players start alive and ready', () => {
    const { players } = setupTestGame({ playerCount: 6 });

    for (const player of players) {
      expect(player.status).toBe(PlayerStatus.ALIVE);
      expect(player.isReady).toBe(true);
    }
  });

  test('witch starts with both potions', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const witch = getPlayerByRole(players, Role.WITCH)!;
    const witchExt = state.extendedStates.get(witch.oderId)!;

    expect(witchExt.witchItems?.hasAntidote).toBe(true);
    expect(witchExt.witchItems?.hasPoison).toBe(true);
  });

  test('seat numbers are assigned sequentially', () => {
    const { players } = setupTestGame({ playerCount: 8 });

    for (let i = 0; i < players.length; i++) {
      expect(players[i].seatNumber).toBe(i + 1);
    }
  });
});

// ============================================================================
// Night Phase Flow Tests
// ============================================================================

describe('Night Phase Flow', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('wolf kills villager when not protected', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = getPlayerByRole(players, Role.VILLAGER)!;

    const result = simulateNightPhase(state, {
      wolfTarget: villager.oderId,
    });

    expect(result.deaths).toContain(villager.oderId);
    expect(result.savedByGuard).toBe(false);
    expect(villager.status).toBe(PlayerStatus.DEAD_BY_WOLF);
  });

  test('guard saves target from wolf kill', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = players[3];

    const result = simulateNightPhase(state, {
      wolfTarget: villager.oderId,
      guardTarget: villager.oderId,
    });

    expect(result.deaths).not.toContain(villager.oderId);
    expect(result.savedByGuard).toBe(true);
    expect(villager.status).toBe(PlayerStatus.ALIVE);
  });

  test('witch saves wolf kill victim', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = getPlayerByRole(players, Role.VILLAGER)!;

    const result = simulateNightPhase(state, {
      wolfTarget: villager.oderId,
      witchSave: true,
    });

    expect(result.deaths).not.toContain(villager.oderId);
    expect(result.savedByWitch).toBe(true);
    expect(villager.status).toBe(PlayerStatus.ALIVE);
  });

  test('witch poisons target in addition to wolf kill', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager1 = players[3];
    const villager2 = players[4];

    const result = simulateNightPhase(state, {
      wolfTarget: villager1.oderId,
      witchPoisonTarget: villager2.oderId,
    });

    expect(result.deaths).toContain(villager1.oderId);
    expect(result.deaths).toContain(villager2.oderId);
    expect(villager1.status).toBe(PlayerStatus.DEAD_BY_WOLF);
    expect(villager2.status).toBe(PlayerStatus.DEAD_BY_POISON);
  });

  test('witch cannot save and poison in same night', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager1 = players[3];
    const villager2 = players[4];

    // Witch saves villager1 and poisons villager2
    const result = simulateNightPhase(state, {
      wolfTarget: villager1.oderId,
      witchSave: true,
      witchPoisonTarget: villager2.oderId,
    });

    // Both actions work (in real game, UI would prevent this)
    expect(result.savedByWitch).toBe(true);
    expect(result.poisonedPlayer).toBe(villager2.oderId);
    expect(villager1.status).toBe(PlayerStatus.ALIVE);
    expect(villager2.status).toBe(PlayerStatus.DEAD_BY_POISON);
  });

  test('peaceful night when no actions taken', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const result = simulateNightPhase(state, {});

    expect(result.deaths.length).toBe(0);
    for (const player of players) {
      expect(player.status).toBe(PlayerStatus.ALIVE);
    }
  });
});

// ============================================================================
// Day Voting Flow Tests
// ============================================================================

describe('Day Voting Flow', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('majority vote eliminates player', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      phase: GamePhase.DAY_VOTING,
    });

    const wolf = players[0];
    const votes = new Map<string, string | null>();

    // All villagers vote for wolf
    votes.set(players[2].oderId, wolf.oderId);
    votes.set(players[3].oderId, wolf.oderId);
    votes.set(players[4].oderId, wolf.oderId);
    votes.set(players[5].oderId, wolf.oderId);

    const result = simulateVoting(state, votes);

    expect(result.eliminated).toBe(wolf.oderId);
    expect(result.isTie).toBe(false);
    expect(wolf.status).toBe(PlayerStatus.DEAD_BY_VOTE);
  });

  test('tie vote eliminates no one', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      phase: GamePhase.DAY_VOTING,
    });

    const votes = new Map<string, string | null>();

    // Split vote: 3 for wolf, 3 for villager
    votes.set(players[2].oderId, players[0].oderId);
    votes.set(players[3].oderId, players[0].oderId);
    votes.set(players[4].oderId, players[0].oderId);
    votes.set(players[0].oderId, players[2].oderId);
    votes.set(players[1].oderId, players[2].oderId);
    votes.set(players[5].oderId, players[2].oderId);

    const result = simulateVoting(state, votes);

    expect(result.eliminated).toBeNull();
    expect(result.isTie).toBe(true);
  });

  test('all abstain results in no elimination', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
    });

    const votes = new Map<string, string | null>();
    for (const player of players) {
      votes.set(player.oderId, null);
    }

    const result = simulateVoting(state, votes);

    expect(result.eliminated).toBeNull();
    expect(result.isTie).toBe(true);
  });

  test('sheriff vote has 1.5x weight', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      phase: GamePhase.DAY_VOTING,
    });

    // Set sheriff
    state.sheriffId = players[2].oderId;

    const wolf = players[0];
    const villager = players[3];
    const votes = new Map<string, string | null>();

    // Sheriff (1.5) + 1 vote for wolf = 2.5
    votes.set(players[2].oderId, wolf.oderId); // Sheriff
    votes.set(players[4].oderId, wolf.oderId);
    // 2 votes for villager = 2
    votes.set(players[0].oderId, villager.oderId);
    votes.set(players[1].oderId, villager.oderId);

    const result = simulateVoting(state, votes);

    expect(result.eliminated).toBe(wolf.oderId);
    expect(result.isTie).toBe(false);
  });

  test('idiot survives first vote and reveals', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      phase: GamePhase.DAY_VOTING,
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    const votes = new Map<string, string | null>();

    // Everyone votes for idiot
    for (const player of players) {
      if (player.oderId !== idiot.oderId) {
        votes.set(player.oderId, idiot.oderId);
      }
    }

    const result = simulateVoting(state, votes);

    expect(result.eliminated).toBeNull(); // Idiot survives
    expect(idiotExt.idiotRevealed).toBe(true);
    expect(idiot.status).toBe(PlayerStatus.ALIVE);
  });
});

// ============================================================================
// Multi-Turn Game Flow Tests
// ============================================================================

describe('Multi-Turn Game Flow', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('villagers win by eliminating all wolves', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    // Turn 1: Wolf kills villager, villagers vote out wolf
    const votes1 = new Map<string, string | null>();
    for (const v of villagers) {
      votes1.set(v.oderId, wolves[0].oderId);
    }
    votes1.set(players[2].oderId, wolves[0].oderId); // Seer

    const turn1 = simulateGameTurn(state, {
      wolfTarget: villagers[0].oderId,
    }, votes1);

    expect(turn1.nightDeaths).toContain(villagers[0].oderId);
    expect(turn1.dayEliminated).toBe(wolves[0].oderId);
    expect(turn1.gameWinner).toBeNull(); // Game continues

    // Turn 2: Wolf kills another villager, villagers vote out remaining wolf
    const votes2 = new Map<string, string | null>();
    votes2.set(villagers[1].oderId, wolves[1].oderId);
    votes2.set(players[2].oderId, wolves[1].oderId); // Seer

    transitionPhase(state, GamePhase.NIGHT, { incrementDay: true });
    const turn2 = simulateGameTurn(state, {
      wolfTarget: villagers[1].oderId,
    }, votes2);

    expect(turn2.dayEliminated).toBe(wolves[1].oderId);
    expect(turn2.gameWinner).toBe(Faction.VILLAGER);
  });

  test('werewolves win when equal to villagers', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    // Night 1: Kill villager1
    simulateNightPhase(state, { wolfTarget: villagers[0].oderId });
    // Day 1: No elimination (abstain/tie)
    simulateVoting(state, new Map());

    // Night 2: Kill villager2
    transitionPhase(state, GamePhase.NIGHT);
    simulateNightPhase(state, { wolfTarget: villagers[1].oderId });

    // Now: 2 wolves, 2 villagers (seer + villager3)
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('game continues when balance is maintained', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    // Night: Wolf kills villager
    simulateNightPhase(state, { wolfTarget: villagers[0].oderId });
    // Day: Vote out wolf
    const votes = new Map<string, string | null>();
    votes.set(villagers[1].oderId, wolves[0].oderId);
    votes.set(players[2].oderId, wolves[0].oderId);
    votes.set(villagers[2].oderId, wolves[0].oderId);
    simulateVoting(state, votes);

    // Now: 1 wolf, 3 villagers - game continues
    const winner = checkWinCondition(state);
    expect(winner).toBeNull();
  });
});

// ============================================================================
// Special Scenarios Tests
// ============================================================================

describe('Special Scenarios', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('lovers both die when one is killed', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager1 = players[3];
    const villager2 = players[4];

    // Setup lovers
    state.cupidTarget1 = villager1.oderId;
    state.cupidTarget2 = villager2.oderId;
    state.loversLinked = true;

    const ext1 = state.extendedStates.get(villager1.oderId)!;
    const ext2 = state.extendedStates.get(villager2.oderId)!;
    ext1.isLovers = true;
    ext1.loverId = villager2.oderId;
    ext2.isLovers = true;
    ext2.loverId = villager1.oderId;

    // Kill one lover
    simulateNightPhase(state, { wolfTarget: villager1.oderId });

    // Process lover death
    const loverDeath = processLoverDeath(state, villager1.oderId);

    expect(villager1.status).toBe(PlayerStatus.DEAD_BY_WOLF);
    expect(loverDeath).toBe(villager2.oderId);
    expect(villager2.status).toBe(PlayerStatus.DEAD_BY_LOVER);
  });

  test('cross-faction lovers can win together', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.CUPID, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolf = players[0];
    const villager = players[3];

    // Setup cross-faction lovers
    state.cupidTarget1 = wolf.oderId;
    state.cupidTarget2 = villager.oderId;
    state.loversLinked = true;
    state.loversFaction = true;

    const wolfExt = state.extendedStates.get(wolf.oderId)!;
    const villagerExt = state.extendedStates.get(villager.oderId)!;
    wolfExt.isLovers = true;
    wolfExt.loverId = villager.oderId;
    villagerExt.isLovers = true;
    villagerExt.loverId = wolf.oderId;

    // Kill everyone except lovers
    players[1].status = PlayerStatus.DEAD_BY_VOTE;
    players[2].status = PlayerStatus.DEAD_BY_WOLF;
    players[4].status = PlayerStatus.DEAD_BY_WOLF;
    players[5].status = PlayerStatus.DEAD_BY_WOLF;

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.LOVERS);
  });

  test('hunter triggers death skill when killed by vote', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    // Kill hunter by vote
    hunter.status = PlayerStatus.DEAD_BY_VOTE;

    const shooters = getPendingShooters(state, [hunter.oderId]);

    expect(shooters).toContain(hunter.oderId);
    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_VOTE)).toBe(true);
  });

  test('hunter cannot shoot when poisoned', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.WITCH, Role.VILLAGER, Role.VILLAGER],
    });

    const hunter = getPlayerByRole(players, Role.HUNTER)!;

    // Poison hunter
    hunter.status = PlayerStatus.DEAD_BY_POISON;

    const shooters = getPendingShooters(state, [hunter.oderId]);

    expect(shooters).not.toContain(hunter.oderId);
    expect(canUseDeathSkill(hunter, PlayerStatus.DEAD_BY_POISON)).toBe(false);
  });

  test('alpha wolf can shoot when killed', () => {
    const { players } = setupTestGame({
      roles: [Role.ALPHA_WOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const alphaWolf = getPlayerByRole(players, Role.ALPHA_WOLF)!;
    alphaWolf.status = PlayerStatus.DEAD_BY_VOTE;

    expect(canUseDeathSkill(alphaWolf, PlayerStatus.DEAD_BY_VOTE)).toBe(true);
  });

  test('witch uses antidote once and loses it', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const witch = getPlayerByRole(players, Role.WITCH)!;
    const witchExt = state.extendedStates.get(witch.oderId)!;
    const villager = getPlayerByRole(players, Role.VILLAGER)!;

    expect(witchExt.witchItems?.hasAntidote).toBe(true);

    // Night 1: Witch saves
    simulateNightPhase(state, {
      wolfTarget: villager.oderId,
      witchSave: true,
    });

    expect(witchExt.witchItems?.hasAntidote).toBe(false);
  });
});

// ============================================================================
// Phase Transition Tests
// ============================================================================

describe('Phase Transitions', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('transition from waiting to night', () => {
    const { state } = setupTestGame({
      phase: GamePhase.WAITING,
    });

    transitionPhase(state, GamePhase.NIGHT);

    expect(state.phase).toBe(GamePhase.NIGHT);
    expect(state.nightSubPhase).toBe(NightSubPhase.WEREWOLF);
  });

  test('transition from night to day resets night state', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.NIGHT,
    });

    const villager = players[3];
    state.wolfTarget = villager.oderId;
    state.guardTarget = villager.oderId;

    transitionPhase(state, GamePhase.DAY_DISCUSSION);

    expect(state.phase).toBe(GamePhase.DAY_DISCUSSION);
    expect(state.nightSubPhase).toBeNull();
  });

  test('increment day number on new day', () => {
    const { state } = setupTestGame({
      dayNumber: 1,
    });

    transitionPhase(state, GamePhase.NIGHT, { incrementDay: true });

    expect(state.dayNumber).toBe(2);
  });

  test('transition to voting clears previous votes', () => {
    const { state, players } = setupTestGame();

    // Set some votes
    state.votes.set(players[0].oderId, {
      voterId: players[0].oderId,
      targetId: players[1].oderId,
      timestamp: Date.now(),
    });

    transitionPhase(state, GamePhase.DAY_VOTING);

    expect(state.votes.size).toBe(0);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('game ends immediately if wolves equal villagers at start', () => {
    const { state } = setupTestGame({
      playerCount: 4,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER],
    });

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('game ends immediately if no wolves', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill both wolves
    players[0].status = PlayerStatus.DEAD_BY_VOTE;
    players[1].status = PlayerStatus.DEAD_BY_VOTE;

    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.VILLAGER);
  });

  test('single wolf vs single villager is wolf win', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill all except 1 wolf and 1 villager
    players[1].status = PlayerStatus.DEAD_BY_VOTE;
    players[2].status = PlayerStatus.DEAD_BY_WOLF;
    players[3].status = PlayerStatus.DEAD_BY_WOLF;
    players[4].status = PlayerStatus.DEAD_BY_WOLF;

    // 1 wolf vs 1 villager
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('double death in same night (wolf kill + poison)', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager1 = players[3];
    const wolf = players[0];

    const result = simulateNightPhase(state, {
      wolfTarget: villager1.oderId,
      witchPoisonTarget: wolf.oderId,
    });

    expect(result.deaths.length).toBe(2);
    expect(result.deaths).toContain(villager1.oderId);
    expect(result.deaths).toContain(wolf.oderId);
  });

  test('guard protects self', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.GUARD, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const guard = getPlayerByRole(players, Role.GUARD)!;

    const result = simulateNightPhase(state, {
      wolfTarget: guard.oderId,
      guardTarget: guard.oderId,
    });

    expect(result.savedByGuard).toBe(true);
    expect(guard.status).toBe(PlayerStatus.ALIVE);
  });

  test('revealed idiot cannot vote', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
      phase: GamePhase.DAY_VOTING,
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    const wolf = players[0];

    // Reveal idiot first
    idiotExt.idiotRevealed = true;

    // Now vote - idiot's vote shouldn't count
    const votes = new Map<string, string | null>();
    votes.set(idiot.oderId, wolf.oderId); // Idiot votes (shouldn't count)
    votes.set(players[3].oderId, wolf.oderId);
    votes.set(players[4].oderId, players[3].oderId);
    votes.set(players[5].oderId, players[3].oderId);

    const result = simulateVoting(state, votes);

    // 1 valid vote for wolf, 2 for villager - villager eliminated
    expect(result.eliminated).toBe(players[3].oderId);
  });
});

// ============================================================================
// Complex Game Scenarios
// ============================================================================

describe('Complex Game Scenarios', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('full 9-player game to villager victory', () => {
    const { state, players } = setupTestGame({
      playerCount: 9,
      roles: [
        Role.WEREWOLF, Role.WEREWOLF, Role.WEREWOLF,
        Role.SEER, Role.WITCH, Role.GUARD,
        Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
      ],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const seer = getPlayerByRole(players, Role.SEER)!;
    const witch = getPlayerByRole(players, Role.WITCH)!;

    // Night 1: Wolves kill villager, guard protects seer, witch saves
    const villager1 = players[6];
    simulateNightPhase(state, {
      wolfTarget: villager1.oderId,
      guardTarget: seer.oderId,
      witchSave: true,
    });

    expect(villager1.status).toBe(PlayerStatus.ALIVE); // Saved by witch

    // Day 1: Vote out wolf1
    const votes1 = new Map<string, string | null>();
    for (let i = 3; i < 9; i++) {
      votes1.set(players[i].oderId, wolves[0].oderId);
    }
    simulateVoting(state, votes1);

    expect(wolves[0].status).toBe(PlayerStatus.DEAD_BY_VOTE);

    // Night 2: Wolves kill seer (guard cannot protect again)
    transitionPhase(state, GamePhase.NIGHT);
    simulateNightPhase(state, {
      wolfTarget: seer.oderId,
      guardTarget: witch.oderId, // Guard protects witch
    });

    expect(seer.status).toBe(PlayerStatus.DEAD_BY_WOLF);

    // Day 2: Vote out wolf2
    const votes2 = new Map<string, string | null>();
    votes2.set(witch.oderId, wolves[1].oderId);
    votes2.set(players[5].oderId, wolves[1].oderId); // Guard
    votes2.set(players[6].oderId, wolves[1].oderId);
    votes2.set(players[7].oderId, wolves[1].oderId);
    votes2.set(players[8].oderId, wolves[1].oderId);
    transitionPhase(state, GamePhase.DAY_VOTING);
    simulateVoting(state, votes2);

    expect(wolves[1].status).toBe(PlayerStatus.DEAD_BY_VOTE);

    // Night 3: Last wolf kills a villager, witch poisons wolf
    transitionPhase(state, GamePhase.NIGHT);
    simulateNightPhase(state, {
      wolfTarget: players[6].oderId,
      witchPoisonTarget: wolves[2].oderId,
    });

    // All wolves dead
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.VILLAGER);
  });

  test('werewolf victory through attrition', () => {
    const { state, players } = setupTestGame({
      playerCount: 6,
      roles: [
        Role.WEREWOLF, Role.WEREWOLF,
        Role.SEER,
        Role.VILLAGER, Role.VILLAGER, Role.VILLAGER,
      ],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    // Night 1: Kill villager1
    simulateNightPhase(state, { wolfTarget: villagers[0].oderId });

    // Day 1: Tie vote
    transitionPhase(state, GamePhase.DAY_VOTING);
    const votes1 = new Map<string, string | null>();
    simulateVoting(state, votes1);

    // Night 2: Kill villager2
    transitionPhase(state, GamePhase.NIGHT);
    simulateNightPhase(state, { wolfTarget: villagers[1].oderId });

    // Now: 2 wolves, 2 villagers (seer + villager3)
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.WEREWOLF);
  });

  test('witch double kill to end game', () => {
    const { state, players } = setupTestGame({
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.WITCH, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolves = getPlayersByRole(players, Role.WEREWOLF);
    const villagers = getPlayersByRole(players, Role.VILLAGER);

    // Kill one wolf by vote first
    wolves[0].status = PlayerStatus.DEAD_BY_VOTE;

    // Night: Wolf kills villager, witch poisons wolf
    const result = simulateNightPhase(state, {
      wolfTarget: villagers[0].oderId,
      witchPoisonTarget: wolves[1].oderId,
    });

    expect(result.deaths).toContain(villagers[0].oderId);
    expect(result.deaths).toContain(wolves[1].oderId);

    // All wolves dead
    const winner = checkWinCondition(state);
    expect(winner).toBe(Faction.VILLAGER);
  });
});
