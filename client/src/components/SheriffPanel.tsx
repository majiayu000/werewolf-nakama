/**
 * SheriffPanel 组件
 * 警长竞选系统 UI：竞选报名、发言、投票、警徽移交
 */

import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import type { Player, SheriffCandidate } from '../types/werewolf';
import { GamePhase } from '../types/werewolf';

interface SheriffPanelProps {
  /** 加入竞选回调 */
  onJoinCampaign: () => void;
  /** 退出竞选回调 */
  onQuitCampaign: () => void;
  /** 投票回调 */
  onVote: (candidateId: string) => void;
  /** 移交警徽回调 */
  onTransfer: (targetId: string | null) => void;
  /** 是否显示为紧凑模式 */
  compact?: boolean;
}

// 倒计时显示组件
function CountdownTimer({ endTime, urgent = false }: { endTime: number; urgent?: boolean }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTime - now) / 1000));
      setRemaining(diff);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const isUrgent = urgent || remaining <= 10;

  return (
    <motion.div
      className={`
        text-2xl font-bold tabular-nums
        ${isUrgent ? 'text-red-400' : 'text-yellow-400'}
      `}
      animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      {remaining}s
    </motion.div>
  );
}

// 候选人卡片
interface CandidateCardProps {
  candidate: SheriffCandidate;
  isSelected: boolean;
  voteCount: number;
  isCurrentSpeaker?: boolean;
  disabled: boolean;
  onSelect: () => void;
  showVotes?: boolean;
}

function CandidateCard({
  candidate,
  isSelected,
  voteCount,
  isCurrentSpeaker,
  disabled,
  onSelect,
  showVotes = true,
}: CandidateCardProps) {
  const { t } = useTranslation();

  return (
    <motion.button
      className={`
        relative w-full p-3 rounded-lg text-left transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-yellow-900/30'}
        ${isSelected ? 'ring-2 ring-yellow-500 bg-yellow-900/40' : 'bg-gray-800/50'}
        ${isCurrentSpeaker ? 'ring-2 ring-green-500 bg-green-900/30' : ''}
      `}
      onClick={disabled ? undefined : onSelect}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      layout
    >
      <div className="flex items-center justify-between">
        {/* 候选人信息 */}
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
              bg-yellow-600/30 border-2 border-yellow-500/50
              ${isCurrentSpeaker ? 'animate-pulse' : ''}
            `}
          >
            {candidate.seatNumber}
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {candidate.name}
              {isCurrentSpeaker && (
                <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">
                  {t('sheriff.speech.speaking')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 票数 */}
        {showVotes && voteCount > 0 && (
          <motion.div
            className="flex items-center gap-1 bg-yellow-600/50 px-2 py-1 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={voteCount}
          >
            <span className="text-yellow-300 font-bold">{voteCount}</span>
            <span className="text-yellow-200/80 text-sm">{t('sheriff.voting.votes')}</span>
          </motion.div>
        )}

        {/* 选中标记 */}
        {isSelected && (
          <motion.div
            className="absolute right-2 top-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <span className="text-yellow-400">&#10003;</span>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

// 警徽徽章组件
export function SheriffBadge({
  sheriffId,
  players,
  size = 'md',
}: {
  sheriffId: string | null;
  players: Player[];
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useTranslation();

  if (!sheriffId) return null;

  const sheriff = players.find((p) => p.id === sheriffId);
  if (!sheriff) return null;

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <motion.div
      className={`
        inline-flex items-center gap-2 rounded-full
        bg-gradient-to-r from-yellow-600 to-yellow-500
        text-black font-bold shadow-lg
        ${sizeClasses[size]}
      `}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <span className="text-lg">&#128737;</span>
      <span>{t('sheriff.seatFormat', { seat: sheriff.seatNumber, name: sheriff.name })}</span>
      <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">{t('sheriff.weightShort')}</span>
    </motion.div>
  );
}

// 竞选报名阶段
function CampaignPhase({
  candidates,
  isSelfCandidate,
  isAlive,
  onJoin,
  onQuit,
  endTime,
}: {
  candidates: SheriffCandidate[];
  isSelfCandidate: boolean;
  isAlive: boolean;
  onJoin: () => void;
  onQuit: () => void;
  endTime: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* 标题和倒计时 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <span>&#128737;</span> {t('sheriff.campaign.title')}
          </h3>
          <p className="text-sm text-gray-400">{t('sheriff.campaign.description')}</p>
        </div>
        <CountdownTimer endTime={endTime} />
      </div>

      {/* 竞选按钮 */}
      {isAlive && (
        <div className="flex gap-2">
          {!isSelfCandidate ? (
            <motion.button
              className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold transition-colors"
              onClick={onJoin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              &#128587; {t('sheriff.campaign.join')}
            </motion.button>
          ) : (
            <motion.button
              className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold transition-colors"
              onClick={onQuit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              &#10006; {t('sheriff.campaign.quit')}
            </motion.button>
          )}
        </div>
      )}

      {/* 当前候选人列表 */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          {t('sheriff.campaign.candidatesCount', { count: candidates.length })}
        </h4>
        {candidates.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">{t('sheriff.campaign.noCandidates')}</p>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => (
              <motion.div
                key={c.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-600/30 flex items-center justify-center font-bold">
                  {c.seatNumber}
                </div>
                <span>{c.name}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 竞选发言阶段
function SpeechPhase({
  candidates,
  currentSpeaker,
  speakerIndex,
  totalSpeakers,
  endTime,
}: {
  candidates: SheriffCandidate[];
  currentSpeaker: SheriffCandidate | null;
  speakerIndex: number;
  totalSpeakers: number;
  endTime: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
            <span>&#127908;</span> {t('sheriff.speech.title')}
          </h3>
          <p className="text-sm text-gray-400">
            {t('sheriff.speech.progress', { current: speakerIndex + 1, total: totalSpeakers })}
          </p>
        </div>
        <CountdownTimer endTime={endTime} />
      </div>

      {/* 当前发言者 */}
      {currentSpeaker && (
        <motion.div
          className="p-4 rounded-xl bg-gradient-to-r from-green-900/50 to-green-800/30 border border-green-500/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-2xl font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {currentSpeaker.seatNumber}
            </motion.div>
            <div>
              <div className="text-lg font-bold">{currentSpeaker.name}</div>
              <div className="text-sm text-green-400">{t('sheriff.speech.speakingNow')}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 发言进度条 */}
      <div className="flex gap-1">
        {candidates.map((c, i) => (
          <motion.div
            key={c.id}
            className={`
              flex-1 h-2 rounded-full transition-colors
              ${i < speakerIndex ? 'bg-green-500' : ''}
              ${i === speakerIndex ? 'bg-green-400 animate-pulse' : ''}
              ${i > speakerIndex ? 'bg-gray-700' : ''}
            `}
          />
        ))}
      </div>

      {/* 候选人列表 */}
      <div className="space-y-2">
        {candidates.map((c, i) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            isSelected={false}
            voteCount={0}
            isCurrentSpeaker={i === speakerIndex}
            disabled={true}
            onSelect={() => {}}
            showVotes={false}
          />
        ))}
      </div>
    </div>
  );
}

// 警长投票阶段
function VotingPhase({
  candidates,
  selectedId,
  voteCounts,
  hasVoted,
  isAlive,
  onVote,
  onSelect,
  endTime,
}: {
  candidates: SheriffCandidate[];
  selectedId: string | null;
  voteCounts: Map<string, number>;
  hasVoted: boolean;
  isAlive: boolean;
  onVote: (id: string) => void;
  onSelect: (id: string | null) => void;
  endTime: number;
}) {
  const { t } = useTranslation();
  const canVote = isAlive && !hasVoted;

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <span>&#128499;</span> {t('sheriff.voting.title')}
          </h3>
          <p className="text-sm text-gray-400">
            {hasVoted ? t('sheriff.voting.voted') : t('sheriff.voting.selectCandidate')}
          </p>
        </div>
        <CountdownTimer endTime={endTime} />
      </div>

      {/* 候选人列表 */}
      <div className="space-y-2">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            isSelected={selectedId === c.id}
            voteCount={voteCounts.get(c.id) || 0}
            disabled={!canVote}
            onSelect={() => onSelect(c.id)}
          />
        ))}
      </div>

      {/* 确认投票按钮 */}
      {canVote && selectedId && (
        <motion.button
          className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold transition-colors"
          onClick={() => onVote(selectedId)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          &#10003; {t('voting.confirmVote')}
        </motion.button>
      )}

      {hasVoted && (
        <motion.div
          className="text-center py-3 text-yellow-400/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          &#9989; {t('sheriff.voting.waitingForOthers')}
        </motion.div>
      )}
    </div>
  );
}

// 警徽移交阶段
function TransferPhase({
  eligiblePlayers,
  selectedId,
  sheriffName,
  isSheriff,
  onTransfer,
  onSelect,
  endTime,
}: {
  eligiblePlayers: SheriffCandidate[];
  selectedId: string | null;
  sheriffName: string;
  isSheriff: boolean;
  onTransfer: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  endTime: number;
}) {
  const { t } = useTranslation();

  if (!isSheriff) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <motion.div
            className="text-5xl mb-4"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            &#128737;
          </motion.div>
          <h3 className="text-lg font-bold text-yellow-400">{t('sheriff.transfer.transferring')}</h3>
          <p className="text-gray-400 mt-2">
            {t('sheriff.transfer.selectingSuccessor', { name: sheriffName })}
          </p>
          <div className="mt-4">
            <CountdownTimer endTime={endTime} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <span>&#128737;</span> {t('sheriff.transfer.title')}
          </h3>
          <p className="text-sm text-gray-400">{t('sheriff.transfer.description')}</p>
        </div>
        <CountdownTimer endTime={endTime} urgent />
      </div>

      {/* 可选玩家列表 */}
      <div className="space-y-2">
        {eligiblePlayers.map((p) => (
          <motion.button
            key={p.id}
            className={`
              w-full p-3 rounded-lg text-left transition-all
              ${selectedId === p.id ? 'ring-2 ring-yellow-500 bg-yellow-900/40' : 'bg-gray-800/50 hover:bg-gray-700/50'}
            `}
            onClick={() => onSelect(p.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold">
                {p.seatNumber}
              </div>
              <span className="font-medium">{p.name}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <motion.button
          className={`
            flex-1 py-3 px-4 rounded-lg font-bold transition-colors
            ${selectedId ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 cursor-not-allowed'}
          `}
          onClick={() => selectedId && onTransfer(selectedId)}
          disabled={!selectedId}
          whileHover={selectedId ? { scale: 1.02 } : {}}
          whileTap={selectedId ? { scale: 0.98 } : {}}
        >
          &#10003; {t('sheriff.transfer.confirm')}
        </motion.button>
        <motion.button
          className="py-3 px-4 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors"
          onClick={() => onTransfer(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          &#128293; {t('sheriff.transfer.destroy')}
        </motion.button>
      </div>
    </div>
  );
}

// 选举结果显示
export function ElectionResult({
  sheriffId,
  sheriffName,
  isAutoElected,
  isTie,
}: {
  sheriffId: string | null;
  sheriffName: string | null;
  isAutoElected?: boolean;
  isTie?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl p-8 max-w-sm mx-4 text-center"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {isTie ? (
          <>
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ repeat: 3, duration: 0.5 }}
            >
              &#128528;
            </motion.div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">{t('sheriff.election.tie')}</h3>
            <p className="text-gray-400">{t('sheriff.election.noSheriff')}</p>
          </>
        ) : sheriffId && sheriffName ? (
          <>
            <motion.div
              className="text-6xl mb-4"
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              &#128737;
            </motion.div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">
              {isAutoElected ? t('sheriff.election.autoElected') : t('sheriff.election.congratulations')}
            </h3>
            <p className="text-2xl font-bold">{sheriffName}</p>
            <p className="text-gray-400 mt-2">{t('sheriff.election.gotPosition')}</p>
          </>
        ) : (
          <>
            <motion.div className="text-6xl mb-4">&#128737;</motion.div>
            <p className="text-gray-400">{t('sheriff.election.waitingResult')}</p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// 主组件
export function SheriffPanel({
  onJoinCampaign,
  onQuitCampaign,
  onVote,
  onTransfer,
  compact = false,
}: SheriffPanelProps) {
  const {
    playerId,
    players,
    gameState,
    sheriffId,
    isMySelfCandidate,
    sheriffElectionInfo,
    sheriffVoteTarget,
    setSheriffVoteTarget,
    sheriffTransferInfo,
    sheriffTransferTarget,
    setSheriffTransferTarget,
  } = useGameStore();

  const [hasVoted, setHasVoted] = useState(false);

  // 当前玩家是否存活
  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;

  // 当前玩家是否是警长
  const isSheriff = sheriffId === playerId;

  // 计算投票数
  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    // 这里需要从服务器获取实际投票数，暂时返回空
    return counts;
  }, []);

  // 计算结束时间
  const endTime = useMemo(() => {
    const timer = gameState.timer || 30;
    return Date.now() + timer * 1000;
  }, [gameState.timer]);

  // 重置投票状态
  useEffect(() => {
    if (gameState.phase !== GamePhase.SHERIFF_VOTING) {
      setHasVoted(false);
    }
  }, [gameState.phase]);

  // 处理投票
  const handleVote = (candidateId: string) => {
    if (hasVoted) return;
    setHasVoted(true);
    onVote(candidateId);
  };

  // 根据阶段渲染不同内容
  const renderContent = () => {
    switch (gameState.phase) {
      case GamePhase.SHERIFF_CAMPAIGN:
        return (
          <CampaignPhase
            candidates={sheriffElectionInfo?.candidates || []}
            isSelfCandidate={isMySelfCandidate}
            isAlive={isAlive}
            onJoin={onJoinCampaign}
            onQuit={onQuitCampaign}
            endTime={endTime}
          />
        );

      case GamePhase.SHERIFF_SPEECH:
        return (
          <SpeechPhase
            candidates={sheriffElectionInfo?.candidates || []}
            currentSpeaker={sheriffElectionInfo?.currentSpeaker || null}
            speakerIndex={sheriffElectionInfo?.speakerIndex || 0}
            totalSpeakers={sheriffElectionInfo?.totalSpeakers || 0}
            endTime={endTime}
          />
        );

      case GamePhase.SHERIFF_VOTING:
        return (
          <VotingPhase
            candidates={sheriffElectionInfo?.candidates || []}
            selectedId={sheriffVoteTarget}
            voteCounts={voteCounts}
            hasVoted={hasVoted}
            isAlive={isAlive}
            onVote={handleVote}
            onSelect={setSheriffVoteTarget}
            endTime={endTime}
          />
        );

      case GamePhase.SHERIFF_TRANSFER:
        return (
          <TransferPhase
            eligiblePlayers={sheriffTransferInfo?.eligiblePlayers || []}
            selectedId={sheriffTransferTarget}
            sheriffName={sheriffTransferInfo?.sheriffName || '警长'}
            isSheriff={isSheriff}
            onTransfer={onTransfer}
            onSelect={setSheriffTransferTarget}
            endTime={endTime}
          />
        );

      default:
        return null;
    }
  };

  // 检查是否应该显示警长面板
  const shouldShow =
    gameState.phase === GamePhase.SHERIFF_CAMPAIGN ||
    gameState.phase === GamePhase.SHERIFF_SPEECH ||
    gameState.phase === GamePhase.SHERIFF_VOTING ||
    gameState.phase === GamePhase.SHERIFF_TRANSFER;

  if (!shouldShow) {
    return null;
  }

  return (
    <motion.div
      className={`
        bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30
        ${compact ? 'max-h-[400px] overflow-y-auto' : ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {renderContent()}
    </motion.div>
  );
}

// 警长状态条（显示在游戏界面顶部）
export function SheriffStatusBar() {
  const { t } = useTranslation();
  const { sheriffId, players } = useGameStore();

  if (!sheriffId) return null;

  const sheriff = players.find((p) => p.id === sheriffId);
  if (!sheriff) return null;

  return (
    <motion.div
      className="flex items-center justify-center gap-2 py-2 px-4 bg-yellow-900/30 border-b border-yellow-500/30"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="text-lg">&#128737;</span>
      <span className="text-yellow-400 font-medium">
        {t('sheriff.currentFormat', { seat: sheriff.seatNumber, name: sheriff.name })}
      </span>
      <span className="text-xs bg-yellow-600/50 px-2 py-0.5 rounded-full text-yellow-200">
        {t('sheriff.weightShort')}
      </span>
      {!sheriff.isAlive && (
        <span className="text-xs bg-red-600/50 px-2 py-0.5 rounded-full text-red-200">
          {t('sheriff.dead')}
        </span>
      )}
    </motion.div>
  );
}

export default SheriffPanel;
