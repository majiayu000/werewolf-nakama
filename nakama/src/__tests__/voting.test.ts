/**
 * Voting Logic Unit Tests
 * Tests for vote counting, tie handling, sheriff weight, and vote processing
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import {
  setupTestGame,
  resetPlayerIdCounter,
  getPlayerByRole,
  getAlivePlayers,
  createMockDispatcher,
  createMockLogger,
  MockDispatcher,
  MockLogger,
} from './test-utils';
import {
  Role,
  Faction,
  PlayerStatus,
  GamePhase,
  GameState,
  Player,
  VoteRecord,
  OpCode,
} from '../werewolf/types';

// ============================================================================
// Test Helpers - Vote Processing Logic
// ============================================================================

interface VoteCountResult {
  eliminated: string | null;
  isTie: boolean;
  voteCount: Map<string, number>;
  voteList: Array<{ voterId: string; targetId: string | null; weight: number }>;
}

/**
 * Count votes and determine elimination result
 * Mirrors the logic in match_handler.ts processVotes function
 */
function countVotes(state: GameState): VoteCountResult {
  const voteCount = new Map<string, number>();
  const voteList: Array<{ voterId: string; targetId: string | null; weight: number }> = [];

  for (const [voterId, vote] of state.votes) {
    // Sheriff's vote counts as 1.5
    const weight = state.sheriffId === voterId ? 1.5 : 1;
    voteList.push({ voterId, targetId: vote.targetId, weight });
    if (vote.targetId) {
      voteCount.set(vote.targetId, (voteCount.get(vote.targetId) || 0) + weight);
    }
  }

  // Find highest voted
  let maxVotes = 0;
  let eliminated: string | null = null;
  let isTie = false;

  for (const [targetId, count] of voteCount) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  // If tie, no one is eliminated
  if (isTie) {
    eliminated = null;
  }

  return { eliminated, isTie, voteCount, voteList };
}

/**
 * Check if a player can vote
 */
function canPlayerVote(player: Player, state: GameState): boolean {
  // Dead players cannot vote
  if (player.status !== PlayerStatus.ALIVE) {
    return false;
  }

  // Revealed idiot cannot vote
  if (player.role === Role.IDIOT) {
    const ext = state.extendedStates.get(player.oderId);
    if (ext?.idiotRevealed) {
      return false;
    }
  }

  return true;
}

/**
 * Get all players who can vote
 */
function getVotingEligiblePlayers(state: GameState): Player[] {
  return Array.from(state.players.values()).filter(p => canPlayerVote(p, state));
}

/**
 * Cast a vote
 */
function castVote(state: GameState, voterId: string, targetId: string | null): boolean {
  const voter = state.players.get(voterId);
  if (!voter || !canPlayerVote(voter, state)) {
    return false;
  }

  // Validate target if not abstaining
  if (targetId) {
    const target = state.players.get(targetId);
    if (!target || target.status !== PlayerStatus.ALIVE) {
      return false;
    }
  }

  const vote: VoteRecord = {
    voterId,
    targetId,
    timestamp: Date.now(),
  };

  state.votes.set(voterId, vote);
  voter.votedFor = targetId;
  return true;
}

/**
 * Check if idiot should reveal and survive
 */
function processIdiotReveal(state: GameState, eliminatedId: string): boolean {
  const target = state.players.get(eliminatedId);
  const targetExt = state.extendedStates.get(eliminatedId);

  if (target?.role === Role.IDIOT && !targetExt?.idiotRevealed) {
    if (targetExt) {
      targetExt.idiotRevealed = true;
    }
    return true; // Idiot survives
  }
  return false;
}

// ============================================================================
// Vote Counting Tests
// ============================================================================

describe('Vote Counting', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('single target receives all votes', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = players[0]; // Werewolf
    const voters = players.slice(2); // 4 villagers vote

    for (const voter of voters) {
      castVote(state, voter.oderId, target.oderId);
    }

    const result = countVotes(state);

    expect(result.eliminated).toBe(target.oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(target.oderId)).toBe(4);
  });

  test('majority vote determines elimination', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target1 = players[0]; // 3 votes
    const target2 = players[1]; // 1 vote

    castVote(state, players[2].oderId, target1.oderId);
    castVote(state, players[3].oderId, target1.oderId);
    castVote(state, players[4].oderId, target1.oderId);
    castVote(state, players[5].oderId, target2.oderId);

    const result = countVotes(state);

    expect(result.eliminated).toBe(target1.oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(target1.oderId)).toBe(3);
    expect(result.voteCount.get(target2.oderId)).toBe(1);
  });

  test('tie results in no elimination', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target1 = players[0];
    const target2 = players[1];

    // 2 votes each = tie
    castVote(state, players[2].oderId, target1.oderId);
    castVote(state, players[3].oderId, target1.oderId);
    castVote(state, players[4].oderId, target2.oderId);
    castVote(state, players[5].oderId, target2.oderId);

    const result = countVotes(state);

    expect(result.eliminated).toBeNull();
    expect(result.isTie).toBe(true);
    expect(result.voteCount.get(target1.oderId)).toBe(2);
    expect(result.voteCount.get(target2.oderId)).toBe(2);
  });

  test('abstain votes do not count toward any target', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = players[0];

    // 2 vote for target, 2 abstain
    castVote(state, players[2].oderId, target.oderId);
    castVote(state, players[3].oderId, target.oderId);
    castVote(state, players[4].oderId, null); // Abstain
    castVote(state, players[5].oderId, null); // Abstain

    const result = countVotes(state);

    expect(result.eliminated).toBe(target.oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(target.oderId)).toBe(2);
    expect(result.voteList.filter(v => v.targetId === null).length).toBe(2);
  });

  test('all abstain results in no elimination', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Everyone abstains
    for (const player of players) {
      castVote(state, player.oderId, null);
    }

    const result = countVotes(state);

    expect(result.eliminated).toBeNull();
    expect(result.isTie).toBe(false);
    expect(result.voteCount.size).toBe(0);
  });
});

// ============================================================================
// Sheriff Vote Weight Tests
// ============================================================================

describe('Sheriff Vote Weight', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('sheriff vote counts as 1.5', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const sheriff = players[2];
    state.sheriffId = sheriff.oderId;

    const target = players[0];

    castVote(state, sheriff.oderId, target.oderId);

    const result = countVotes(state);

    expect(result.voteCount.get(target.oderId)).toBe(1.5);
    expect(result.voteList.find(v => v.voterId === sheriff.oderId)?.weight).toBe(1.5);
  });

  test('sheriff vote breaks tie', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const sheriff = players[2];
    state.sheriffId = sheriff.oderId;

    const target1 = players[0];
    const target2 = players[1];

    // Sheriff (1.5) + player3 (1) = 2.5 for target1
    // player4 (1) + player5 (1) = 2 for target2
    castVote(state, sheriff.oderId, target1.oderId);
    castVote(state, players[3].oderId, target1.oderId);
    castVote(state, players[4].oderId, target2.oderId);
    castVote(state, players[5].oderId, target2.oderId);

    const result = countVotes(state);

    expect(result.eliminated).toBe(target1.oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(target1.oderId)).toBe(2.5);
    expect(result.voteCount.get(target2.oderId)).toBe(2);
  });

  test('non-sheriff votes count as 1', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    state.sheriffId = players[0].oderId; // Wolf is sheriff

    const target = players[0];

    // Non-sheriff player votes
    castVote(state, players[2].oderId, target.oderId);

    const result = countVotes(state);

    expect(result.voteList.find(v => v.voterId === players[2].oderId)?.weight).toBe(1);
    expect(result.voteCount.get(target.oderId)).toBe(1);
  });

  test('no sheriff means all votes count as 1', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    state.sheriffId = null; // No sheriff elected

    const target = players[0];

    for (const player of players.slice(2)) {
      castVote(state, player.oderId, target.oderId);
    }

    const result = countVotes(state);

    expect(result.voteCount.get(target.oderId)).toBe(4);
    expect(result.voteList.every(v => v.weight === 1)).toBe(true);
  });
});

// ============================================================================
// Voting Eligibility Tests
// ============================================================================

describe('Voting Eligibility', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('alive player can vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    expect(canPlayerVote(voter, state)).toBe(true);
  });

  test('dead player cannot vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    voter.status = PlayerStatus.DEAD_BY_WOLF;

    expect(canPlayerVote(voter, state)).toBe(false);
  });

  test('revealed idiot cannot vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    idiotExt.idiotRevealed = true;

    expect(canPlayerVote(idiot, state)).toBe(false);
  });

  test('unrevealed idiot can vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    idiotExt.idiotRevealed = false;

    expect(canPlayerVote(idiot, state)).toBe(true);
  });

  test('voting eligible players excludes dead and revealed idiot', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill one player
    players[3].status = PlayerStatus.DEAD_BY_WOLF;

    // Reveal idiot
    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    idiotExt.idiotRevealed = true;

    const eligible = getVotingEligiblePlayers(state);

    expect(eligible.length).toBe(4); // 6 - 1 dead - 1 revealed idiot = 4
    expect(eligible.find(p => p.oderId === players[3].oderId)).toBeUndefined();
    expect(eligible.find(p => p.oderId === idiot.oderId)).toBeUndefined();
  });
});

// ============================================================================
// Vote Casting Tests
// ============================================================================

describe('Vote Casting', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('vote for valid target succeeds', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    const target = players[0];

    const success = castVote(state, voter.oderId, target.oderId);

    expect(success).toBe(true);
    expect(state.votes.has(voter.oderId)).toBe(true);
    expect(state.votes.get(voter.oderId)?.targetId).toBe(target.oderId);
    expect(voter.votedFor).toBe(target.oderId);
  });

  test('vote for dead target fails', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    const target = players[0];
    target.status = PlayerStatus.DEAD_BY_VOTE;

    const success = castVote(state, voter.oderId, target.oderId);

    expect(success).toBe(false);
    expect(state.votes.has(voter.oderId)).toBe(false);
  });

  test('vote for nonexistent target fails', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];

    const success = castVote(state, voter.oderId, 'nonexistent-player-id');

    expect(success).toBe(false);
    expect(state.votes.has(voter.oderId)).toBe(false);
  });

  test('abstain vote (null target) succeeds', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];

    const success = castVote(state, voter.oderId, null);

    expect(success).toBe(true);
    expect(state.votes.has(voter.oderId)).toBe(true);
    expect(state.votes.get(voter.oderId)?.targetId).toBeNull();
    expect(voter.votedFor).toBeNull();
  });

  test('dead player vote fails', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    voter.status = PlayerStatus.DEAD_BY_WOLF;
    const target = players[0];

    const success = castVote(state, voter.oderId, target.oderId);

    expect(success).toBe(false);
  });

  test('revealed idiot vote fails', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    idiotExt.idiotRevealed = true;
    const target = players[0];

    const success = castVote(state, idiot.oderId, target.oderId);

    expect(success).toBe(false);
  });

  test('player can change vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];
    const target1 = players[0];
    const target2 = players[1];

    // First vote
    castVote(state, voter.oderId, target1.oderId);
    expect(state.votes.get(voter.oderId)?.targetId).toBe(target1.oderId);

    // Change vote
    castVote(state, voter.oderId, target2.oderId);
    expect(state.votes.get(voter.oderId)?.targetId).toBe(target2.oderId);
  });
});

// ============================================================================
// Idiot Reveal Tests
// ============================================================================

describe('Idiot Reveal on Vote', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('unrevealed idiot reveals and survives when voted out', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    expect(idiotExt.idiotRevealed).toBe(false);

    // Vote for idiot
    for (const player of players.filter(p => p !== idiot)) {
      castVote(state, player.oderId, idiot.oderId);
    }

    const result = countVotes(state);
    expect(result.eliminated).toBe(idiot.oderId);

    // Process idiot reveal
    const survived = processIdiotReveal(state, idiot.oderId);

    expect(survived).toBe(true);
    expect(idiotExt.idiotRevealed).toBe(true);
    expect(idiot.status).toBe(PlayerStatus.ALIVE); // Not killed yet
  });

  test('already revealed idiot dies when voted out', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.IDIOT, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const idiot = getPlayerByRole(players, Role.IDIOT)!;
    const idiotExt = state.extendedStates.get(idiot.oderId)!;
    idiotExt.idiotRevealed = true; // Already revealed

    // Vote for idiot
    for (const player of players.filter(p => p !== idiot)) {
      castVote(state, player.oderId, idiot.oderId);
    }

    const result = countVotes(state);
    expect(result.eliminated).toBe(idiot.oderId);

    // Process idiot reveal (should fail since already revealed)
    const survived = processIdiotReveal(state, idiot.oderId);

    expect(survived).toBe(false);
    // In actual game, idiot would be killed
  });

  test('non-idiot does not trigger reveal mechanic', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const villager = getPlayerByRole(players, Role.VILLAGER)!;

    // Vote for villager
    for (const player of players.filter(p => p !== villager)) {
      castVote(state, player.oderId, villager.oderId);
    }

    const result = countVotes(state);
    const survived = processIdiotReveal(state, result.eliminated!);

    expect(survived).toBe(false);
  });
});

// ============================================================================
// Three-Way Tie Tests
// ============================================================================

describe('Multi-Way Ties', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('three-way tie results in no elimination', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // 2 votes for each of 3 targets
    castVote(state, players[0].oderId, players[3].oderId);
    castVote(state, players[1].oderId, players[3].oderId);
    castVote(state, players[2].oderId, players[4].oderId);
    castVote(state, players[3].oderId, players[4].oderId);
    castVote(state, players[4].oderId, players[5].oderId);
    castVote(state, players[5].oderId, players[0].oderId);

    // Actually this creates: target3=2, target4=2, target5=1, target0=1 - not a 3-way tie
    // Let me fix this
    state.votes.clear();

    // Create true 3-way tie: each gets 2 votes
    castVote(state, players[0].oderId, players[1].oderId);
    castVote(state, players[1].oderId, players[2].oderId);
    castVote(state, players[2].oderId, players[0].oderId);
    castVote(state, players[3].oderId, players[1].oderId);
    castVote(state, players[4].oderId, players[2].oderId);
    castVote(state, players[5].oderId, players[0].oderId);

    // Now: player0=2, player1=2, player2=2

    const result = countVotes(state);

    expect(result.isTie).toBe(true);
    expect(result.eliminated).toBeNull();
  });

  test('one player beats tie among others', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // player0 gets 3 votes, player1 and player2 each get 1
    castVote(state, players[1].oderId, players[0].oderId);
    castVote(state, players[2].oderId, players[0].oderId);
    castVote(state, players[3].oderId, players[0].oderId);
    castVote(state, players[4].oderId, players[1].oderId);
    castVote(state, players[5].oderId, players[2].oderId);

    const result = countVotes(state);

    expect(result.eliminated).toBe(players[0].oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(players[0].oderId)).toBe(3);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Voting Edge Cases', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('single player voting (only one eligible voter)', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Kill all but one player
    for (let i = 1; i < 5; i++) {
      players[i].status = PlayerStatus.DEAD_BY_WOLF;
    }

    // Only player0 and player5 are alive
    const target = players[5];
    castVote(state, players[0].oderId, target.oderId);

    const result = countVotes(state);

    expect(result.eliminated).toBe(target.oderId);
    expect(result.voteCount.get(target.oderId)).toBe(1);
  });

  test('self-vote is valid', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const voter = players[2];

    // Vote for self
    const success = castVote(state, voter.oderId, voter.oderId);

    expect(success).toBe(true);
    expect(state.votes.get(voter.oderId)?.targetId).toBe(voter.oderId);
  });

  test('werewolf can vote', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const wolf = getPlayerByRole(players, Role.WEREWOLF)!;
    const target = players[2];

    const success = castVote(state, wolf.oderId, target.oderId);

    expect(success).toBe(true);
    expect(canPlayerVote(wolf, state)).toBe(true);
  });

  test('vote record includes timestamp', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const before = Date.now();
    castVote(state, players[2].oderId, players[0].oderId);
    const after = Date.now();

    const vote = state.votes.get(players[2].oderId);

    expect(vote?.timestamp).toBeGreaterThanOrEqual(before);
    expect(vote?.timestamp).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// Complex Scenarios
// ============================================================================

describe('Complex Voting Scenarios', () => {
  beforeEach(() => {
    resetPlayerIdCounter();
  });

  test('sheriff vote breaks 2v2 tie', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Make player2 the sheriff
    state.sheriffId = players[2].oderId;

    const target1 = players[0]; // Will get sheriff vote (1.5) + 1 vote = 2.5
    const target2 = players[1]; // Will get 2 normal votes = 2

    castVote(state, players[2].oderId, target1.oderId); // Sheriff vote = 1.5
    castVote(state, players[3].oderId, target1.oderId); // Normal vote = 1
    castVote(state, players[4].oderId, target2.oderId); // Normal vote = 1
    castVote(state, players[5].oderId, target2.oderId); // Normal vote = 1

    const result = countVotes(state);

    expect(result.eliminated).toBe(target1.oderId);
    expect(result.voteCount.get(target1.oderId)).toBe(2.5);
    expect(result.voteCount.get(target2.oderId)).toBe(2);
  });

  test('many abstains with few votes still determines winner', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    const target = players[0];

    // Only 1 vote, everyone else abstains
    castVote(state, players[2].oderId, target.oderId);
    castVote(state, players[3].oderId, null);
    castVote(state, players[4].oderId, null);
    castVote(state, players[5].oderId, null);

    const result = countVotes(state);

    expect(result.eliminated).toBe(target.oderId);
    expect(result.isTie).toBe(false);
    expect(result.voteCount.get(target.oderId)).toBe(1);
  });

  test('voting after some players died during discussion', () => {
    const { state, players } = setupTestGame({
      phase: GamePhase.DAY_VOTING,
      roles: [Role.WEREWOLF, Role.WEREWOLF, Role.HUNTER, Role.VILLAGER, Role.VILLAGER, Role.VILLAGER],
    });

    // Simulate a player dying mid-day (e.g., hunter shot)
    players[3].status = PlayerStatus.DEAD_BY_HUNTER;

    const target = players[0];
    const eligibleVoters = getVotingEligiblePlayers(state);

    // Only alive players can vote
    expect(eligibleVoters.length).toBe(5);

    for (const voter of eligibleVoters) {
      if (voter.oderId !== target.oderId) {
        castVote(state, voter.oderId, target.oderId);
      }
    }

    const result = countVotes(state);

    expect(result.eliminated).toBe(target.oderId);
    expect(result.voteCount.get(target.oderId)).toBe(4); // 5 eligible - 1 target = 4 votes
  });
});
