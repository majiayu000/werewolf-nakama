/**
 * InvitePanel 组件
 * 好友邀请系统界面
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GameInvite, SearchedUser } from '../types/werewolf';

interface InvitePanelProps {
  matchId: string | null;
  isConnected: boolean;
  onSearchUsers: (query: string) => Promise<SearchedUser[]>;
  onSendInvite: (matchId: string, receiverId: string) => Promise<{ success: boolean; inviteId?: string; error?: string }>;
  onGetInvites: (type?: 'sent' | 'received') => Promise<GameInvite[]>;
  onRespondInvite: (inviteId: string, accept: boolean) => Promise<{ success: boolean; matchId?: string; password?: string; error?: string }>;
  onCancelInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  onJoinMatch: (matchId: string, password?: string) => Promise<void>;
}

// 格式化剩余时间
function formatTimeRemaining(expiresAt: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return t('invite.time.expired');

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (minutes > 0) {
    return t('invite.time.minutesSeconds', { minutes, seconds });
  }
  return t('invite.time.seconds', { seconds });
}

// 搜索用户卡片
function UserCard({
  user,
  onInvite,
  inviting,
}: {
  user: SearchedUser;
  onInvite: () => void;
  inviting: boolean;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          {user.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
          )}
        </div>
        <div>
          <div className="text-white font-medium">{user.displayName}</div>
          <div className="text-xs text-gray-400">@{user.username}</div>
        </div>
      </div>
      <button
        onClick={onInvite}
        disabled={inviting}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
          inviting
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
      >
        {inviting ? t('invite.sending') : t('invite.buttons.invite')}
      </button>
    </motion.div>
  );
}

// 邀请卡片
function InviteCard({
  invite,
  type,
  onAccept,
  onDecline,
  onCancel,
  loading,
}: {
  invite: GameInvite;
  type: 'sent' | 'received';
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(invite.expiresAt, t));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(invite.expiresAt, t));
    }, 1000);
    return () => clearInterval(timer);
  }, [invite.expiresAt, t]);

  return (
    <motion.div
      initial={{ opacity: 0, x: type === 'sent' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 bg-gray-800/60 rounded-xl border border-gray-700"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {type === 'received' ? '📨' : '📤'}
            </span>
            <span className="text-white font-medium">
              {type === 'received' ? invite.senderName : invite.receiverName}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {invite.roomName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {t('invite.players', { current: invite.currentPlayers, max: invite.maxPlayers })}
          </div>
          <div className={`text-xs mt-1 ${
            invite.expiresAt - Date.now() < 60000 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {t('invite.time.remaining', { time: timeRemaining })}
          </div>
        </div>
      </div>

      {type === 'received' ? (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600
                       text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t('invite.accept')}
          </button>
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-gray-600/20
                       text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-600/30"
          >
            {t('invite.decline')}
          </button>
        </div>
      ) : (
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                     text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          {t('invite.cancel')}
        </button>
      )}
    </motion.div>
  );
}

// 邀请通知弹窗
export function InviteNotification({
  invite,
  onAccept,
  onDecline,
  onClose,
}: {
  invite: GameInvite;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(invite.expiresAt, t));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = formatTimeRemaining(invite.expiresAt, t);
      setTimeRemaining(remaining);
      if (invite.expiresAt <= Date.now()) {
        onClose();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [invite.expiresAt, onClose, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 w-80 bg-gray-900 rounded-xl border border-purple-500/50
                 shadow-lg shadow-purple-500/20 overflow-hidden"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📨</span>
          <span className="text-white font-bold">{t('invite.notification.title')}</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* 内容 */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600
                          flex items-center justify-center text-white font-bold text-lg">
            {invite.senderName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium">{invite.senderName}</div>
            <div className="text-sm text-gray-400">{t('invite.notification.invitesToJoin')}</div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="text-gray-300 font-medium">{invite.roomName}</div>
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{t('invite.players', { current: invite.currentPlayers, max: invite.maxPlayers })}</span>
            <span className={invite.expiresAt - Date.now() < 60000 ? 'text-red-400' : ''}>
              {t('invite.time.remaining', { time: timeRemaining })}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white
                       rounded-lg font-medium transition-colors"
          >
            {t('invite.notification.joinGame')}
          </button>
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300
                       rounded-lg font-medium transition-colors"
          >
            {t('invite.decline')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// 邀请按钮（用于房间列表）
export function InviteButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30
                 text-purple-400 rounded-lg text-sm font-medium transition-colors
                 border border-purple-500/30"
    >
      <span>📨</span>
      <span>{t('invite.title')}</span>
    </button>
  );
}

// 主邀请面板组件
export default function InvitePanel({
  matchId,
  isConnected,
  onSearchUsers,
  onSendInvite,
  onGetInvites,
  onRespondInvite,
  onCancelInvite,
  onJoinMatch,
}: InvitePanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'search' | 'received' | 'sent'>('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());
  const [respondingInvites, setRespondingInvites] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载邀请列表
  const loadInvites = useCallback(async () => {
    if (!isConnected) return;

    setLoadingInvites(true);
    try {
      const [received, sent] = await Promise.all([
        onGetInvites('received'),
        onGetInvites('sent'),
      ]);
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  }, [isConnected, onGetInvites]);

  // 定期刷新邀请列表
  useEffect(() => {
    loadInvites();
    const interval = setInterval(loadInvites, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, [loadInvites]);

  // 搜索用户
  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) {
      setMessage({ type: 'error', text: t('invite.search.minChars') });
      return;
    }

    setSearching(true);
    try {
      const results = await onSearchUsers(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setMessage({ type: 'error', text: t('invite.search.noResults') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('invite.search.failed') });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, onSearchUsers, t]);

  // 发送邀请
  const handleSendInvite = useCallback(async (userId: string) => {
    if (!matchId) {
      setMessage({ type: 'error', text: t('invite.messages.noRoomJoined') });
      return;
    }

    setInvitingUsers(prev => new Set(prev).add(userId));
    try {
      const result = await onSendInvite(matchId, userId);
      if (result.success) {
        setMessage({ type: 'success', text: t('invite.messages.inviteSent') });
        loadInvites();
      } else {
        setMessage({ type: 'error', text: result.error || t('invite.messages.sendFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('invite.messages.sendFailed') });
    } finally {
      setInvitingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [matchId, onSendInvite, loadInvites, t]);

  // 接受邀请
  const handleAcceptInvite = useCallback(async (invite: GameInvite) => {
    setRespondingInvites(prev => new Set(prev).add(invite.inviteId));
    try {
      const result = await onRespondInvite(invite.inviteId, true);
      if (result.success && result.matchId) {
        setMessage({ type: 'success', text: t('invite.messages.joiningGame') });
        await onJoinMatch(result.matchId, result.password);
        loadInvites();
      } else {
        setMessage({ type: 'error', text: result.error || t('invite.messages.acceptFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('invite.messages.joinFailed') });
    } finally {
      setRespondingInvites(prev => {
        const next = new Set(prev);
        next.delete(invite.inviteId);
        return next;
      });
    }
  }, [onRespondInvite, onJoinMatch, loadInvites, t]);

  // 拒绝邀请
  const handleDeclineInvite = useCallback(async (invite: GameInvite) => {
    setRespondingInvites(prev => new Set(prev).add(invite.inviteId));
    try {
      const result = await onRespondInvite(invite.inviteId, false);
      if (result.success) {
        setMessage({ type: 'success', text: t('invite.messages.declined') });
        loadInvites();
      } else {
        setMessage({ type: 'error', text: result.error || t('invite.messages.declineFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('invite.messages.operationFailed') });
    } finally {
      setRespondingInvites(prev => {
        const next = new Set(prev);
        next.delete(invite.inviteId);
        return next;
      });
    }
  }, [onRespondInvite, loadInvites, t]);

  // 取消邀请
  const handleCancelInvite = useCallback(async (invite: GameInvite) => {
    setRespondingInvites(prev => new Set(prev).add(invite.inviteId));
    try {
      const result = await onCancelInvite(invite.inviteId);
      if (result.success) {
        setMessage({ type: 'success', text: t('invite.messages.cancelled') });
        loadInvites();
      } else {
        setMessage({ type: 'error', text: result.error || t('invite.messages.cancelFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('invite.messages.operationFailed') });
    } finally {
      setRespondingInvites(prev => {
        const next = new Set(prev);
        next.delete(invite.inviteId);
        return next;
      });
    }
  }, [onCancelInvite, loadInvites, t]);

  // 清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-xl border border-gray-800">
      {/* 标签页 */}
      <div className="flex border-b border-gray-800">
        {[
          { id: 'received' as const, label: t('invite.tabs.received'), count: receivedInvites.length },
          { id: 'sent' as const, label: t('invite.tabs.sent'), count: sentInvites.length },
          { id: 'search' as const, label: t('invite.tabs.search'), count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="invite-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* 消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-red-600/20 text-red-400 border border-red-600/30'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* 搜索框 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('invite.searchPlaceholder')}
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600
                           text-white rounded-lg font-medium transition-colors"
              >
                {searching ? t('invite.search.searching') : t('invite.search.button')}
              </button>
            </div>

            {/* 提示 */}
            {!matchId && (
              <div className="text-center text-yellow-500 text-sm py-2 bg-yellow-500/10 rounded-lg">
                {t('invite.search.joinRoomFirst')}
              </div>
            )}

            {/* 搜索结果 */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {searchResults.map((user) => (
                  <UserCard
                    key={user.userId}
                    user={user}
                    onInvite={() => handleSendInvite(user.userId)}
                    inviting={invitingUsers.has(user.userId)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-3">
            {loadingInvites && receivedInvites.length === 0 ? (
              <div className="text-center text-gray-400 py-8">{t('invite.loading')}</div>
            ) : receivedInvites.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📭</div>
                <div>{t('invite.empty.received')}</div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {receivedInvites.map((invite) => (
                  <InviteCard
                    key={invite.inviteId}
                    invite={invite}
                    type="received"
                    onAccept={() => handleAcceptInvite(invite)}
                    onDecline={() => handleDeclineInvite(invite)}
                    loading={respondingInvites.has(invite.inviteId)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-3">
            {loadingInvites && sentInvites.length === 0 ? (
              <div className="text-center text-gray-400 py-8">{t('invite.loading')}</div>
            ) : sentInvites.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📤</div>
                <div>{t('invite.empty.sent')}</div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sentInvites.map((invite) => (
                  <InviteCard
                    key={invite.inviteId}
                    invite={invite}
                    type="sent"
                    onCancel={() => handleCancelInvite(invite)}
                    loading={respondingInvites.has(invite.inviteId)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* 刷新按钮 */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={loadInvites}
          disabled={loadingInvites}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800
                     text-gray-300 rounded-lg text-sm font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          <span className={loadingInvites ? 'animate-spin' : ''}>🔄</span>
          <span>{t('invite.buttons.refresh')}</span>
        </button>
      </div>
    </div>
  );
}

// 邀请面板弹窗
export function InvitePanelModal({
  isOpen,
  onClose,
  ...props
}: InvitePanelProps & { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md h-[600px] max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-full">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-gray-800 hover:bg-gray-700
                       rounded-full flex items-center justify-center text-gray-400 hover:text-white
                       border border-gray-700"
          >
            ×
          </button>
          <InvitePanel {...props} />
        </div>
      </motion.div>
    </motion.div>
  );
}
