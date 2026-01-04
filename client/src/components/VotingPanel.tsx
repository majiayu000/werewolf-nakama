/**
 * VotingPanel 组件
 * 独立的投票界面，显示投票目标选择、实时票数统计、倒计时
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Player, VoteResult } from '../types/werewolf';
import { GamePhase } from '../types/werewolf';
import { useSoundEffects, SoundType } from '../hooks/useSoundEffects';
import { VoteCountBubble, VoteProgressBar, VoteConfirmButton } from './VoteAnimation';

interface VotingPanelProps {
  /** 投票回调 */
  onVote: (targetId: string | null) => void;
  /** 投票结果（可选，用于显示最终结果） */
  voteResult?: VoteResult | null;
  /** 是否显示为紧凑模式（侧边栏） */
  compact?: boolean;
}

// 投票选项卡片
interface VoteOptionProps {
  player: Player;
  isSelected: boolean;
  voteCount: number;
  voters: string[];
  totalVotes: number;
  disabled: boolean;
  onSelect: () => void;
  allPlayers: Player[];
  t: (key: string) => string;
}

function VoteOption({
  player,
  isSelected,
  voteCount,
  voters,
  totalVotes,
  disabled,
  onSelect,
  allPlayers,
  t,
}: VoteOptionProps) {
  const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

  // 获取投票者名字
  const voterNames = voters
    .map((id) => allPlayers.find((p) => p.id === id)?.name)
    .filter(Boolean);

  return (
    <motion.button
      className={`
        relative w-full p-3 rounded-lg text-left transition-all overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700/50'}
        ${isSelected ? 'ring-2 ring-red-500 bg-red-900/30' : 'bg-gray-800/50'}
      `}
      onClick={disabled ? undefined : onSelect}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      layout
    >
      {/* 票数进度条背景 */}
      <motion.div
        className="absolute inset-0 bg-red-600/20"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10 flex items-center justify-between">
        {/* 玩家信息 */}
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
              ${player.isAlive ? 'bg-gray-600' : 'bg-gray-800 opacity-50'}
              ${isSelected ? 'ring-2 ring-red-400' : ''}
            `}
          >
            {player.seatNumber}
          </div>
          <div>
            <div className="font-medium">{player.name}</div>
            {voterNames.length > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">
                {t('votingPanel.votedBy')}: {voterNames.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* 票数 */}
        <div className="flex items-center gap-2">
          {voteCount > 0 && (
            <VoteCountBubble count={voteCount} isNew size="md" />
          )}
          {isSelected && (
            <motion.div
              className="text-green-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              ✓
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// 投票统计面板
interface VoteStatsProps {
  totalPlayers: number;
  votedCount: number;
  timeLeft?: number;
}

function VoteStats({ totalPlayers, votedCount, timeLeft }: VoteStatsProps) {
  return (
    <div className="bg-gray-800/80 rounded-lg p-4">
      <VoteProgressBar
        current={votedCount}
        total={totalPlayers}
        timeLeft={timeLeft}
        isUrgent={timeLeft !== undefined && timeLeft <= 10}
      />
    </div>
  );
}

// 投票结果显示
interface VoteResultDisplayProps {
  result: VoteResult;
  players: Player[];
  t: (key: string) => string;
}

function VoteResultDisplay({ result, players, t }: VoteResultDisplayProps) {
  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name || t('common.unknown');

  // 按票数排序
  const sortedVotes = useMemo(() => {
    return Object.entries(result.votes)
      .map(([targetId, voterIds]) => ({
        targetId,
        targetName: getPlayerName(targetId),
        count: voterIds.length,
        voters: voterIds.map((id) => getPlayerName(id)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [result.votes, players]);

  return (
    <motion.div
      className="bg-gray-800/90 rounded-lg p-4 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center">
        <h3 className="text-lg font-bold mb-2">{t('voting.result.title')}</h3>
        {result.isTie ? (
          <motion.div
            className="text-yellow-400 text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            ⚖️ {t('voting.result.tie')}
          </motion.div>
        ) : result.executed ? (
          <motion.div
            className="text-red-400 text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            ⚔️ {getPlayerName(result.executed)} {t('voting.result.eliminated')}
          </motion.div>
        ) : (
          <div className="text-gray-400">{t('voting.result.noElimination')}</div>
        )}
      </div>

      {/* 票数统计 */}
      <div className="space-y-2">
        {sortedVotes.map((vote, index) => (
          <motion.div
            key={vote.targetId}
            className={`
              p-2 rounded-lg
              ${vote.targetId === result.executed ? 'bg-red-900/50 border border-red-600' : 'bg-gray-700/50'}
            `}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold">{vote.targetName}</span>
                {vote.targetId === result.executed && (
                  <span className="text-red-400">☠️</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <VoteCountBubble count={vote.count} size="sm" />
                <span className="text-gray-400 text-sm">{t('voting.votesReceived')}</span>
              </div>
            </div>
            {vote.voters.length > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                {t('votingPanel.voters')}: {vote.voters.join(', ')}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function VotingPanel({ onVote, voteResult, compact = false }: VotingPanelProps) {
  const { t } = useTranslation();
  const { playerId, players, gameState, voteTarget, setVoteTarget } = useGameStore();
  const { playSound } = useSoundEffects();

  const [hasVoted, setHasVoted] = useState(false);
  const lastTimerRef = useRef<number | undefined>(undefined);

  // 倒计时警告音效
  useEffect(() => {
    const timer = gameState.timer;
    const lastTimer = lastTimerRef.current;

    if (timer !== undefined && lastTimer !== undefined && timer !== lastTimer) {
      // 最后10秒每秒播放警告音
      if (timer <= 10 && timer > 0) {
        playSound(SoundType.TIMER_URGENT);
      } else if (timer <= 30 && timer > 10 && timer % 5 === 0) {
        // 30秒内每5秒播放一次滴答声
        playSound(SoundType.TIMER_TICK);
      }
    }

    lastTimerRef.current = timer;
  }, [gameState.timer, playSound]);

  // 获取自己的状态
  const me = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  // 获取存活且可被投票的玩家
  const votablePlayers = useMemo(
    () => players.filter((p) => p.isAlive && p.id !== playerId),
    [players, playerId]
  );

  // 统计投票情况（根据 players 的 votedFor 字段）
  // 已翻牌的白痴不计入需要投票的人数
  const voteStats = useMemo(() => {
    const stats: Record<string, string[]> = {};
    let votedCount = 0;

    players.forEach((p) => {
      if (p.votedFor) {
        if (!stats[p.votedFor]) {
          stats[p.votedFor] = [];
        }
        stats[p.votedFor].push(p.id);
        votedCount++;
      }
    });

    // 有投票权的玩家：存活且非已翻牌白痴
    const eligibleVoters = players.filter((p) => p.isAlive && !p.idiotRevealed);

    return {
      votes: stats,
      votedCount,
      totalVoters: eligibleVoters.length,
    };
  }, [players]);

  // 是否在投票阶段
  const isVotingPhase = gameState.phase === GamePhase.DAY_VOTING;

  // 重置投票状态当阶段改变
  useEffect(() => {
    if (!isVotingPhase) {
      setHasVoted(false);
      setVoteTarget(null);
    }
  }, [isVotingPhase, setVoteTarget]);

  // 处理选择目标
  const handleSelectTarget = (targetId: string) => {
    if (hasVoted || !me?.isAlive) return;
    playSound(SoundType.BUTTON_CLICK);
    setVoteTarget(voteTarget === targetId ? null : targetId);
  };

  // 确认投票
  const handleConfirmVote = () => {
    if (voteTarget && !hasVoted) {
      playSound(SoundType.VOTE_CAST);
      onVote(voteTarget);
      setHasVoted(true);
    }
  };

  // 弃权
  const handleAbstain = () => {
    if (!hasVoted) {
      playSound(SoundType.BUTTON_CLICK);
      onVote(null);
      setHasVoted(true);
    }
  };

  // 如果有投票结果，显示结果
  if (voteResult) {
    return (
      <div className={`${compact ? 'p-2' : 'p-4'}`}>
        <VoteResultDisplay result={voteResult} players={players} t={t} />
      </div>
    );
  }

  // 非投票阶段不显示
  if (!isVotingPhase) {
    return null;
  }

  // 检查白痴翻牌状态（翻牌后不能投票）
  const isRevealedIdiot = me?.idiotRevealed === true;
  const canVote = me?.isAlive && !hasVoted && !isRevealedIdiot;

  return (
    <div className={`flex flex-col h-full ${compact ? '' : 'bg-gray-900/95'}`}>
      {/* 标题 */}
      <div className={`${compact ? 'p-2' : 'p-4'} border-b border-gray-700`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗳️</span>
          <h2 className="text-lg font-bold">{t('votingPanel.title')}</h2>
        </div>
        {!me?.isAlive && (
          <p className="text-sm text-gray-500 mt-1">{t('votingPanel.deadCannotVote')}</p>
        )}
        {isRevealedIdiot && me?.isAlive && (
          <p className="text-sm text-yellow-500 mt-1">🃏 {t('votingPanel.idiotLostVoteRight')}</p>
        )}
        {hasVoted && (
          <p className="text-sm text-green-500 mt-1">✓ {t('votingPanel.voteCompleted')}</p>
        )}
      </div>

      {/* 投票统计 */}
      <div className={`${compact ? 'p-2' : 'p-4'}`}>
        <VoteStats
          totalPlayers={voteStats.totalVoters}
          votedCount={voteStats.votedCount}
          timeLeft={gameState.timer}
        />
      </div>

      {/* 投票选项列表 */}
      <div className={`flex-1 overflow-y-auto ${compact ? 'p-2' : 'p-4'} space-y-2`}>
        <AnimatePresence mode="popLayout">
          {votablePlayers.map((player) => (
            <VoteOption
              key={player.id}
              player={player}
              isSelected={voteTarget === player.id}
              voteCount={voteStats.votes[player.id]?.length || 0}
              voters={voteStats.votes[player.id] || []}
              totalVotes={voteStats.votedCount}
              disabled={!canVote}
              onSelect={() => handleSelectTarget(player.id)}
              allPlayers={players}
              t={t}
            />
          ))}
        </AnimatePresence>

        {votablePlayers.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {t('votingPanel.noVotablePlayers')}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {canVote && (
        <div className={`${compact ? 'p-2' : 'p-4'} border-t border-gray-700 space-y-2`}>
          {voteTarget ? (
            <VoteConfirmButton
              targetName={players.find((p) => p.id === voteTarget)?.name || ''}
              onConfirm={handleConfirmVote}
            />
          ) : (
            <motion.button
              className="w-full py-4 rounded-xl font-bold text-lg bg-gray-700 text-gray-500 cursor-not-allowed"
              disabled
            >
              {t('gameRoom.selectVoteTarget')}
            </motion.button>
          )}

          <motion.button
            className="w-full py-2 rounded-lg font-medium text-gray-400
                       bg-gray-800 hover:bg-gray-700 transition-all"
            onClick={handleAbstain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('votingPanel.abstain')}
          </motion.button>
        </div>
      )}

      {/* 已投票后的状态 */}
      {hasVoted && me?.isAlive && (
        <div className={`${compact ? 'p-2' : 'p-4'} border-t border-gray-700`}>
          <div className="text-center text-gray-400">
            <p>{t('votingPanel.waitingForOthers')}</p>
            <motion.div
              className="mt-2 flex justify-center gap-1"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                />
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

// 独立的投票弹窗组件
interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (targetId: string | null) => void;
  voteResult?: VoteResult | null;
}

export function VotingModal({ isOpen, onClose, onVote, voteResult }: VotingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md max-h-[80vh] bg-gray-900 rounded-xl shadow-2xl
                       border border-gray-700 overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* 关闭按钮 */}
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white
                         w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
              onClick={onClose}
            >
              ✕
            </button>

            <VotingPanel onVote={onVote} voteResult={voteResult} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VotingPanel;
