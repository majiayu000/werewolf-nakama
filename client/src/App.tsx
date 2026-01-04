import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { GameRoom } from './components/GameRoom';
import { Lobby } from './components/Lobby';
import { RoomList } from './components/RoomList';
import { useNakama } from './hooks/useNakama';
import { ThemeProvider } from './hooks/useTheme';
import { PWAInstallPrompt, PWAUpdateNotification, OfflineIndicator } from './hooks/usePWA';
import { Role, GamePhase, Player, PlayerStatus, type RoomSettings } from './types/werewolf';

type Screen = 'lobby' | 'room-list' | 'game';

// 演示模式 mock 数据
const DEMO_PLAYERS: Player[] = [
  { id: '1', name: '张三', seatNumber: 1, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
  { id: '2', name: '李四', seatNumber: 2, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
  { id: '3', name: '王五', seatNumber: 3, isAlive: false, isReady: true, status: PlayerStatus.DEAD },
  { id: '4', name: '赵六', seatNumber: 4, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
  { id: '5', name: '钱七', seatNumber: 5, isAlive: true, isReady: false, status: PlayerStatus.ALIVE },
  { id: '6', name: '孙八', seatNumber: 6, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
  { id: '7', name: '周九', seatNumber: 7, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
  { id: '8', name: '吴十', seatNumber: 8, isAlive: false, isReady: true, status: PlayerStatus.DEAD },
  { id: 'demo-player', name: '你', seatNumber: 9, isAlive: true, isReady: true, status: PlayerStatus.ALIVE },
];

function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const {
    isConnected,
    playerName,
    setPlayerName,
    setPlayers,
    setPlayerId,
    playerId,
    setMyRole,
    setGameState,
  } = useGameStore();

  // Dismiss PWA install prompt permanently for this session
  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    // Remember dismissal for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if install prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  const {
    authenticate,
    authenticateWithEmail,
    registerWithEmail,
    linkEmail,
    logout,
    createMatch,
    joinMatch,
    leaveMatch,
    listMatches,
    findMatch,
    sendReady,
    sendVote,
    sendSkill,
    sendChat,
    joinSheriffCampaign,
    quitSheriffCampaign,
    sendSheriffVote,
    sendSheriffTransfer,
    sendLastWords,
    sendLastWordsSkip,
    getUserStats,
    getAchievements,
    getLeaderboard,
    isConnecting,
    error,
    isAuthenticated,
    authMethod,
    userEmail,
  } = useNakama();

  // 进入演示模式
  const enterDemoMode = () => {
    setPlayerId('demo-player');
    setPlayers(DEMO_PLAYERS);
    setMyRole(Role.SEER); // 演示模式下扮演预言家
    setGameState({ phase: GamePhase.NIGHT, dayCount: 1 });
    setScreen('game');
  };

  // 进入游戏大厅
  const handleEnterLobby = async () => {
    if (!isConnected) {
      await authenticate(playerName);
    }
    setScreen('room-list');
  };

  // 加入房间（支持密码）
  const handleJoinRoom = async (matchId: string, password?: string) => {
    await joinMatch(matchId, password);
    setScreen('game');
  };

  // 创建房间（支持密码）
  const handleCreateRoom = async (settings: RoomSettings) => {
    const matchId = await createMatch({
      roomName: settings.roomName,
      maxPlayers: settings.maxPlayers,
      roles: settings.roles,
      password: settings.password,  // 传递密码
      discussionTime: settings.discussionTime,
      votingTime: settings.votingTime,
      nightActionTime: settings.nightActionTime,
      lastWordsTime: settings.lastWordsTime,
      allowSheriff: settings.allowSheriff,
      allowLastWords: settings.allowLastWords,
    });
    return matchId;
  };

  // 快速匹配
  const handleQuickMatch = async () => {
    const matchId = await findMatch();
    await joinMatch(matchId);
    setScreen('game');
  };

  // 离开游戏
  const handleLeaveGame = async () => {
    await leaveMatch();
    setScreen('room-list');
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        {/* PWA Components */}
        <OfflineIndicator />
        <PWAUpdateNotification />
        {showInstallPrompt && screen === 'lobby' && (
          <PWAInstallPrompt onDismiss={handleDismissInstall} />
        )}

        {/* 大厅首页 */}
        {screen === 'lobby' && (
          <Lobby
            playerName={playerName}
            onNameChange={setPlayerName}
            onEnterLobby={handleEnterLobby}
            onDemoMode={enterDemoMode}
            isConnecting={isConnecting}
            isConnected={isConnected}
            connectionError={error}
            onGetUserStats={getUserStats}
            onGetAchievements={getAchievements}
            isAuthenticated={isAuthenticated}
            authMethod={authMethod}
            userEmail={userEmail}
            onLogin={authenticateWithEmail}
            onRegister={registerWithEmail}
            onGuestLogin={authenticate}
            onLinkEmail={linkEmail}
            onLogout={logout}
            onGetLeaderboard={getLeaderboard}
            currentUserId={playerId}
          />
        )}

        {/* 房间列表 */}
        {screen === 'room-list' && (
          <RoomList
            playerName={playerName}
            onBack={() => setScreen('lobby')}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            onQuickMatch={handleQuickMatch}
            listRooms={listMatches}
          />
        )}

        {/* 游戏房间 */}
        {screen === 'game' && (
          <GameRoom
            onLeave={handleLeaveGame}
            onReady={sendReady}
            onVote={sendVote}
            onSkill={sendSkill}
            onSendMessage={sendChat}
            onJoinSheriffCampaign={joinSheriffCampaign}
            onQuitSheriffCampaign={quitSheriffCampaign}
            onSheriffVote={sendSheriffVote}
            onSheriffTransfer={sendSheriffTransfer}
            onLastWordsSpeak={sendLastWords}
            onLastWordsSkip={sendLastWordsSkip}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
