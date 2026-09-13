/**
 * English translation file
 */

export const en = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    submit: 'Submit',
    refresh: 'Refresh',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
    or: 'or',
    and: 'and',
    unknown: 'Unknown',
    online: 'Online',
    offline: 'Offline',
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    server: 'Server',
  },

  // Game title and brand
  brand: {
    title: 'Werewolf',
    subtitle: 'WEREWOLF ONLINE',
    tagline: '6-18 players · Real-time · Multiple roles',
    version: 'Version',
    poweredBy: 'Powered by Nakama',
  },

  // Authentication
  auth: {
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    guest: 'Guest Login',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    username: 'Username',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password',
    noAccount: 'No account?',
    hasAccount: 'Already have an account?',
    createAccount: 'Create Account',
    loginWithEmail: 'Login with Email',
    quickStart: 'Quick Start',
    guestMode: 'Guest Mode',
    guestTip: 'Guest accounts can start playing immediately',
    linkEmail: 'Link Email',
    linkEmailTip: 'Link an email to login from other devices',
    upgradeAccount: 'Upgrade Account',
    accountInfo: 'Account Info',
    guestAccount: 'Guest Account',
    emailAccount: 'Email Account',
    processing: 'Processing...',
    loginNow: 'Login Now',
    registerNow: 'Register Now',
    startGame: 'Start Game',
    saveStats: 'Want to save your stats?',
    guestNickname: 'Nickname (optional)',
    leaveEmptyRandom: 'Leave empty for random name',
    usernameChars: '2-12 characters',
    passwordChars: 'At least 6 characters',
    reenterPassword: 'Re-enter password',
    setPassword: 'Set Password',
    guestStart: 'Quick Start as Guest',
    bindEmailTitle: 'Link Email',
    bindEmailSuccess: 'Successfully linked!',
    bindEmailDesc: 'After linking your email, you can login from other devices and keep your game stats.',
    tab: {
      login: 'Login',
      register: 'Register',
      guest: 'Guest',
    },
    errors: {
      invalidEmail: 'Please enter a valid email address',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match',
      usernameTooShort: 'Username must be at least 2 characters',
      loginFailed: 'Login failed, please check your email and password',
      registerFailed: 'Registration failed, please try again later',
      emailExists: 'This email is already registered',
    },
  },

  // Lobby
  lobby: {
    enterGame: 'Enter Game Lobby',
    demoMode: 'Demo Mode',
    demoTip: 'No server required',
    yourName: 'Your Name',
    enterName: 'Enter your name...',
    nameRequired: 'Please enter a name',
    nameTooShort: 'Name must be at least 2 characters',
    connectionError: 'Connection Error',
    ensureServer: 'Please ensure the Nakama server is running, or try demo mode',
    gameRules: 'Game Rules',
    factions: {
      title: 'Factions',
      werewolf: 'Werewolf: Kill a villager each night, hide your identity',
      villager: 'Villagers: Find and vote out werewolves to protect the village',
      lovers: 'Third Party: Lovers created by Cupid win if both survive',
    },
    specialRoles: 'Special Roles',
  },

  // Room list
  roomList: {
    title: 'Room List',
    createRoom: 'Create Room',
    quickMatch: 'Quick Match',
    quickMatchDesc: 'Auto-match to a suitable room',
    findingMatch: 'Finding a match...',
    noRooms: 'No rooms available',
    noRoomsHint: 'Create a new room to start playing!',
    refresh: 'Refresh',
    filter: {
      all: 'All',
      waiting: 'Waiting',
      playing: 'Playing',
    },
    roomCard: {
      players: 'Players',
      join: 'Join',
      full: 'Full',
      private: 'Private Room',
      enterPassword: 'Enter room password',
      wrongPassword: 'Wrong password',
    },
    createModal: {
      title: 'Create Room',
      roomName: 'Room Name',
      roomNamePlaceholder: 'Enter room name...',
      maxPlayers: 'Max Players',
      private: 'Private Room',
      password: 'Password',
      passwordPlaceholder: 'Enter password...',
      customRoles: 'Custom Roles',
      roleConfig: 'Role Configuration',
      create: 'Create Room',
      presetConfig: 'Preset Config',
    },
  },

  // Game room
  game: {
    room: 'Room',
    day: 'Day {{day}}',
    night: 'Night {{night}}',
    waiting: 'Waiting',
    ready: 'Ready',
    notReady: 'Not Ready',
    readyButton: 'Ready',
    cancelReady: 'Cancel',
    startGame: 'Start Game',
    leaveRoom: 'Leave Room',
    spectating: 'Spectating',
    youAre: 'You are',
    yourRole: 'Your Role',
    alive: 'Alive',
    dead: 'Dead',
    seat: 'Seat',
  },

  // Game room specific
  gameRoom: {
    assigningRoles: 'Assigning Roles',
    execution: 'Execution',
    waitingForPlayers: 'Waiting for players...',
    selectVoteTarget: 'Select vote target',
    selectShootTarget: 'Select shoot target',
    selectSkillTarget: 'Select skill target',
    shootHint: 'Click to take down a player, or skip',
    clickToSelect: 'Click a player to select',
    select: 'Select',
    selectTarget: 'Select target',
    lastWordsHint: 'Leave your final words...',
    noSheriff: 'No sheriff this game',
  },

  // Game phases
  phase: {
    waiting: 'Waiting to Start',
    night: 'Night',
    day: 'Day',
    discussion: 'Discussion',
    voting: 'Voting',
    lastWords: 'Last Words',
    deathSkill: 'Death Skill',
    sheriff: {
      campaign: 'Sheriff Campaign',
      speech: 'Campaign Speech',
      voting: 'Sheriff Vote',
      transfer: 'Badge Transfer',
    },
  },

  // Roles
  roles: {
    villager: {
      name: 'Villager',
      description: 'Ordinary villager with no special abilities. Find werewolves through discussion and voting.',
    },
    seer: {
      name: 'Seer',
      description: 'Each night, can check one player\'s identity (good/evil).',
    },
    witch: {
      name: 'Witch',
      description: 'Has one antidote and one poison. Antidote can save the killed player, poison can kill a player.',
      antidote: 'Antidote',
      poison: 'Poison',
      noVictim: 'Peaceful Night',
      wasKilled: 'Killed tonight',
    },
    hunter: {
      name: 'Hunter',
      description: 'Can shoot a player upon death. Cannot shoot if killed by witch\'s poison.',
      shoot: 'Shoot',
      skipShoot: 'Don\'t Shoot',
      shootPrompt: 'Choose a player to shoot',
    },
    guard: {
      name: 'Guard',
      description: 'Each night can protect a player from werewolf attack. Cannot protect the same player consecutively.',
      protect: 'Protect',
      skipProtect: 'Skip',
      cantRepeat: 'Cannot protect the same player twice in a row',
    },
    idiot: {
      name: 'Idiot',
      description: 'When voted out, can reveal identity to survive once. Loses voting rights after reveal.',
      revealed: 'Revealed',
    },
    werewolf: {
      name: 'Werewolf',
      description: 'Each night, choose a player to kill with the wolf team. Hide your identity to win.',
      kill: 'Kill',
    },
    alphaWolf: {
      name: 'Alpha Wolf',
      description: 'Leader of werewolves. Can shoot a player upon death.',
    },
    cupid: {
      name: 'Cupid',
      description: 'On the first night, can link two players as lovers. If one dies, the other dies too.',
      link: 'Link Lovers',
      selectTwo: 'Select two players to become lovers',
    },
  },

  // Factions
  factions: {
    villagers: 'Village',
    werewolves: 'Werewolves',
    lovers: 'Lovers',
    neutral: 'Neutral',
  },

  // Voting
  voting: {
    voteFor: 'Vote for',
    abstain: 'Abstain',
    voted: 'Voted',
    confirmVote: 'Confirm Vote',
    changeVote: 'Change Vote',
    votesReceived: 'Votes',
    noVotes: 'No votes',
    result: {
      title: 'Vote Result',
      eliminated: 'Eliminated',
      tie: 'Tie',
      noElimination: 'No elimination',
    },
    sheriffWeight: 'Sheriff 1.5 votes',
  },

  // Voting Panel
  votingPanel: {
    title: 'Vote to Eliminate',
    deadCannotVote: 'You are dead and cannot vote',
    idiotLostVoteRight: 'You revealed as Idiot and lost voting rights',
    voteCompleted: 'You have voted',
    noVotablePlayers: 'No players to vote for',
    abstain: 'Abstain (Skip vote)',
    waitingForOthers: 'Waiting for other players to vote...',
    votedBy: 'Voted by',
    voters: 'Voters',
  },

  // Chat
  chat: {
    public: 'Public',
    wolf: 'Wolf Chat',
    dead: 'Dead Chat',
    spectator: 'Spectator',
    sendMessage: 'Send a message...',
    cantSpeak: 'Cannot speak during this phase',
    deadCantSpeak: 'Dead players cannot speak in public chat',
    system: 'System',
    quickPhrases: 'Quick Phrases',
    emoji: 'Emoji',
  },

  // Last words
  lastWords: {
    title: 'Last Words',
    speak: 'Speak',
    skip: 'Skip',
    speaking: 'Speaking',
    placeholder: 'Enter your last words...',
    limit: 'Max 500 characters',
  },

  // Sheriff
  sheriff: {
    badge: 'Sheriff Badge',
    current: 'Current Sheriff',
    currentFormat: 'Sheriff: Seat {{seat}} {{name}}',
    weight: '1.5 vote weight',
    weightShort: '1.5 votes',
    dead: 'Dead',
    seatFormat: 'Seat {{seat}} {{name}}',
    campaign: {
      title: 'Sheriff Campaign',
      description: 'Run for sheriff position',
      join: 'Join Campaign',
      quit: 'Quit Campaign',
      candidates: 'Current Candidates',
      candidatesCount: 'Current Candidates ({{count}})',
      noCandidates: 'No candidates',
    },
    speech: {
      title: 'Campaign Speech',
      progress: 'Progress: {{current}} / {{total}}',
      speaking: 'Speaking',
      speakingNow: 'Speaking now...',
    },
    voting: {
      title: 'Sheriff Vote',
      selectCandidate: 'Select your preferred candidate',
      voted: 'Voted, waiting for results...',
      waitingForOthers: 'Voted, waiting for others...',
      votes: 'votes',
    },
    transfer: {
      title: 'Badge Transfer',
      description: 'Choose your successor, or destroy the badge',
      transferring: 'Badge Transfer',
      selectingSuccessor: '{{name}} is choosing a successor...',
      selectPlayer: 'Select player to transfer',
      destroy: 'Destroy',
      confirm: 'Transfer Badge',
    },
    election: {
      result: 'Election Result',
      elected: 'Elected Sheriff',
      autoElected: 'Auto-elected',
      congratulations: 'Congratulations',
      gotPosition: 'Became Sheriff (1.5 vote weight)',
      waitingResult: 'Waiting for election result...',
      tie: 'Tie',
      noSheriff: 'No sheriff this game',
      noElection: 'No candidates',
    },
  },

  // Result
  result: {
    gameOver: 'Game Over',
    victory: 'Victory!',
    defeat: 'Defeat...',
    villagersWin: 'Village Victory',
    werewolvesWin: 'Werewolves Victory',
    loversWin: 'Lovers Victory',
    stats: {
      title: 'Game Statistics',
      totalPlayers: 'Total Players',
      survivors: 'Survivors',
      days: 'Days Played',
    },
    playAgain: 'Play Again',
    backToLobby: 'Back to Lobby',
  },

  // User stats
  stats: {
    title: 'Statistics',
    myStats: 'My Stats',
    totalGames: 'Total Games',
    wins: 'Wins',
    losses: 'Losses',
    winRate: 'Win Rate',
    level: 'Level',
    exp: 'Experience',
    noStats: 'No statistics yet',
    noGames: 'No game records',
    startPlaying: 'Start playing to see statistics',
    levelInfo: 'Level Info',
    overallStats: 'Overall Stats',
    survivalRate: 'Survival Rate',
    sheriffGames: 'Sheriff Games',
    neverElected: 'Never elected',
    maxWinStreak: 'Max Win Streak',
    firstGame: 'First Game',
    lastGame: 'Last Game',
    byFaction: 'By Faction',
    byRole: 'By Role',
    recentGames: 'Recent Games',
    games: 'games',
    winsCount: '{{wins}}W {{losses}}L',
    villagerFaction: 'Village Faction',
    werewolfFaction: 'Werewolf Faction',
    loversFaction: 'Lovers Faction',
    sheriffWinRate: '{{rate}}% Win Rate',
  },

  // Achievements
  achievements: {
    title: 'Achievements',
    unlocked: 'Unlocked',
    locked: 'Locked',
    progress: 'Progress',
    completion: 'Completion',
    xpReward: 'XP Reward',
    noAchievements: 'No achievements in this category',
    loadError: 'Failed to load achievement data',
    achievementUnlocked: 'Achievement Unlocked!',
    recentUnlock: 'Recently Unlocked',
    achievementProgress: 'Achievement Progress',
    categories: {
      beginner: 'Beginner',
      games: 'Games',
      wins: 'Victories',
      streak: 'Win Streak',
      roleMaster: 'Role Master',
      skill: 'Skills',
      sheriff: 'Sheriff',
      special: 'Special',
      survival: 'Survival',
      level: 'Level',
      social: 'Social',
    },
    rarity: {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
    },
  },

  // Level system
  level: {
    levelUp: 'Level Up!',
    maxLevel: 'MAX',
    xp: 'XP',
    xpToNext: '{{xp}} XP to next level',
    tier: 'Tier',
    tierFormat: '{{tier}} Tier',
    lvFormat: 'Lv.{{level}}',
    xpRewards: 'XP Rewards',
    rewards: {
      gameCompleted: 'Game Completed',
      gameWon: 'Victory',
      survived: 'Survived',
      sheriffElected: 'Sheriff Elected',
      firstWinOfDay: 'First Win of Day',
      winStreakBonus: 'Win Streak Bonus',
    },
    winStreak: '{{count}} Win Streak',
    currentRecord: 'Personal Best',
  },

  // Leaderboard
  leaderboard: {
    title: 'Leaderboard',
    level: 'Level',
    wins: 'Wins',
    winRate: 'Win Rate',
    winStreak: 'Win Streak',
    myRank: 'My Rank',
    noData: 'No data available',
    // Type descriptions
    descriptions: {
      level: 'Ranked by player level',
      wins: 'Ranked by total wins',
      winRate: 'Ranked by win rate (min 10 games)',
      winStreak: 'Ranked by highest win streak',
    },
    // Entry labels
    entry: {
      me: 'Me',
      winsLabel: 'Wins',
      gamesLabel: 'games',
      streakLabel: 'streak',
      winRateLabel: 'Win Rate',
      totalGamesLabel: 'Total Games',
      maxStreakLabel: 'Max Streak',
      winsGames: '{{wins}}W/{{games}} games',
      winRatePercent: '{{rate}}% WR',
    },
    // Empty state
    empty: {
      title: 'No ranking data',
      description: 'Play more games to appear on the leaderboard',
    },
    // Pagination
    pagination: {
      prev: 'Previous',
      next: 'Next',
    },
    // Compact version
    compact: {
      levelRanking: 'Level Ranking',
      viewAll: 'View All →',
    },
  },

  // Invite
  invite: {
    title: 'Invite Friends',
    searchUser: 'Search User',
    searchPlaceholder: 'Search by username...',
    send: 'Send Invite',
    sending: 'Sending...',
    sent: 'Sent',
    received: 'Received Invites',
    pending: 'Pending',
    accept: 'Accept',
    decline: 'Decline',
    retry: 'Retry Join',
    cancel: 'Cancel Invite',
    expired: 'Expired',
    expiresIn: 'Expires in {{time}}',
    // Tabs
    tabs: {
      received: 'Received',
      sent: 'Sent',
      search: 'Search User',
    },
    // Time format
    time: {
      expired: 'Expired',
      minutesSeconds: '{{minutes}}m {{seconds}}s',
      seconds: '{{seconds}}s',
      remaining: '{{time}} left',
    },
    // Players count
    players: '{{current}}/{{max}} players',
    // Notification popup
    notification: {
      title: 'Game Invite Received',
      invitesToJoin: 'invites you to join',
      joinGame: 'Join Game',
    },
    // Search
    search: {
      button: 'Search',
      searching: 'Searching...',
      minChars: 'Enter at least 2 characters',
      noResults: 'No users found',
      failed: 'Search failed',
      joinRoomFirst: 'Please join a room first before inviting friends',
    },
    // Messages
    messages: {
      inviteSent: 'Invite sent',
      sendFailed: 'Failed to send',
      joiningGame: 'Joining game...',
      acceptFailed: 'Failed to accept invite',
      declined: 'Invite declined',
      declineFailed: 'Failed to decline invite',
      cancelled: 'Invite cancelled',
      cancelFailed: 'Failed to cancel invite',
      operationFailed: 'Operation failed',
      joinFailed: 'Failed to join game',
      noRoomJoined: 'Please join a room first',
    },
    // Empty states
    empty: {
      received: 'No invites',
      sent: 'No sent invites',
    },
    // Buttons
    buttons: {
      invite: 'Invite',
      refresh: 'Refresh Invites',
    },
    // Loading state
    loading: 'Loading...',
  },

  // Replay system
  replay: {
    title: 'Game Replay',
    button: 'Replay',
    loading: 'Loading replay...',
    backToList: 'Back to List',
    defaultRoomName: 'Werewolf Replay',
    // List
    list: {
      total: '{{count}} replays',
      playerCount: '{{count}} players',
      days: '{{count}} days',
      myRole: 'My role:',
      unknown: 'Unknown',
    },
    // Win/Loss result
    result: {
      unknown: 'Unknown',
      villagerWin: 'Villagers Win',
      werewolfWin: 'Werewolves Win',
      loversWin: 'Lovers Win',
      win: 'Win',
      lose: 'Lose',
    },
    // Statistics
    stats: {
      wolfKills: 'Wolf Kills',
      votedOut: 'Voted Out',
      witchSaves: 'Witch Saves',
      skillsUsed: 'Skills Used',
    },
    // Factions
    faction: {
      werewolf: 'Werewolf Faction',
      villager: 'Villager Faction',
      neutral: 'Neutral Faction',
    },
    // Tabs
    tabs: {
      timeline: 'Event Timeline',
      players: 'Player List',
    },
    // Playback control
    playback: {
      speed: 'Speed:',
    },
    // Event descriptions
    events: {
      gameStarted: 'Game started with {{count}} players',
      nightStarted: 'Night {{day}} started',
      dayStarted: 'Day {{day}} started',
      wolfKill: 'Werewolves killed {{target}}',
      seerCheck: 'Seer checked {{target}}',
      witchSave: 'Witch saved {{target}}',
      witchPoison: 'Witch poisoned {{target}}',
      guardProtect: 'Guard protected {{target}}',
      hunterShoot: 'Hunter {{actor}} shot {{target}}',
      alphaWolfShoot: 'Alpha Wolf {{actor}} shot {{target}}',
      cupidLink: 'Cupid linked {{lover1}} and {{lover2}} as lovers',
      voteEliminated: 'Voted out: {{player}}',
      voteTie: 'Tie vote, no one eliminated',
      sheriffElected: '{{player}} elected as Sheriff',
      idiotRevealed: 'Idiot {{player}} revealed and survives',
      loverDied: 'Lover died together',
      playerDied: '{{player}} died',
      phaseChanged: 'Phase changed to: {{phase}}',
    },
    // Empty state
    empty: {
      title: 'No Game Replays',
      description: 'Replays will be saved automatically after completing a game',
    },
  },

  // Spectator mode
  spectator: {
    mode: 'Spectator Mode',
    watching: 'Watching',
    allInfo: 'Can view all player information',
    nightActions: 'Night Actions',
    joinAsSpectator: 'Join as Spectator',
  },

  // Settings
  settings: {
    title: 'Settings',
    sound: {
      title: 'Sound Settings',
      enabled: 'Sound Effects',
      volume: 'Volume',
      test: 'Test Sound',
      enable: 'Enable Sound',
      disable: 'Disable Sound',
    },
    theme: {
      title: 'Theme Settings',
      dark: 'Dark Mode',
      light: 'Light Mode',
      system: 'System',
    },
    language: {
      title: 'Language Settings',
      current: 'Current Language',
    },
  },

  // Keyboard shortcuts
  shortcuts: {
    title: 'Shortcuts',
    hint: 'Press ? for shortcuts',
    categories: {
      general: 'General',
      game: 'Game',
      chat: 'Chat',
      navigation: 'Navigation',
    },
    keys: {
      escape: 'Cancel/Close',
      enter: 'Confirm',
      space: 'Confirm',
      numbers: 'Select Player',
      r: 'Ready',
      c: 'Chat',
      v: 'Vote',
      h: 'Sheriff',
      s: 'Sound',
      t: 'Focus Input',
      tab: 'Switch Channel',
    },
  },

  // PWA
  pwa: {
    install: 'Install App',
    installPrompt: 'Install Werewolf on your device for a better experience!',
    updateAvailable: 'Update Available',
    updateNow: 'Update Now',
    offline: 'Offline Mode',
    offlineHint: 'You are currently offline, some features may be unavailable',
  },

  // Death causes
  deathCause: {
    wolf: 'Killed by werewolves',
    poison: 'Poisoned by witch',
    vote: 'Voted out',
    shoot: 'Shot',
    loverSuicide: 'Died of broken heart',
  },

  // Night actions
  nightAction: {
    werewolfTurn: 'Werewolves, open your eyes and choose a target',
    seerTurn: 'Seer, open your eyes and choose a player to check',
    witchTurn: 'Witch, open your eyes',
    guardTurn: 'Guard, open your eyes and choose a player to protect',
    cupidTurn: 'Cupid, open your eyes and choose two players to be lovers',
    waiting: 'Close your eyes and wait...',
    confirm: 'Confirm',
    skip: 'Skip',
  },

  // Day timer
  dayTimer: {
    freeDiscussion: '💬 Free Discussion',
    orderedSpeech: '🎤 Ordered Speech',
    paused: '⏸️ Paused',
    remaining: 'left',
    ended: 'Ended',
    speaking: 'Speaking',
    nextSpeaker: 'Next:',
    skip: '⏭️ Skip',
    endSpeaking: '✓ End Speech',
    remainingTime: 'Time left',
    speakingOrder: '📋 Speaking Order',
    seatFormat: 'Seat {{seat}} {{name}}',
    progressFormat: '({{current}}/{{total}})',
  },

  // Transition animation text
  transition: {
    nightFalls: 'Night Falls',
    dayBreaks: 'Day Breaks',
    nightText: 'Close Your Eyes',
    dayText: 'Dawn',
  },

  // Result modal
  resultModal: {
    villagersWin: 'Village Victory!',
    villagersWinDesc: 'Justice prevails over evil, peace is restored to the village.',
    werewolvesWin: 'Werewolves Victory!',
    werewolvesWinDesc: 'Darkness has fallen, the werewolves rule this land.',
    loversWin: 'Lovers Victory!',
    loversWinDesc: 'Love conquers all, the lovers live happily ever after.',
    gameOver: 'Game Over',
    gameOverDesc: 'The game ended in a special way.',
    you: 'You',
    werewolves: 'Werewolves',
    villagers: 'Villagers',
    viewDetails: 'View Details',
  },

  // Quick phrases
  quickPhrases: {
    title: 'Quick Phrases',
    close: 'Close ✕',
    // Categories
    categories: {
      basic: 'Basic',
      identity: 'Identity',
      action: 'Action',
      analysis: 'Analysis',
      wolf: 'Wolf Team',
      emotion: 'Emoji',
    },
    // Basic phrases
    basic: {
      pass: 'Pass',
      good_pass: 'Good pass',
      agree: 'Agree',
      disagree: 'Disagree',
      trust: 'I trust you',
      doubt: 'I doubt you',
      thinking: 'Let me think',
      confused: 'I\'m confused',
    },
    // Identity phrases
    identity: {
      im_villager: 'I\'m Villager',
      im_seer: 'I\'m Seer',
      im_witch: 'I\'m Witch',
      im_guard: 'I\'m Guard',
      im_hunter: 'I\'m Hunter',
      im_idiot: 'I\'m Idiot',
      im_good: 'I\'m good',
      checked_good: 'Checked as good',
      checked_wolf: 'Checked as wolf',
    },
    // Action phrases
    action: {
      vote_him: 'Vote him',
      follow_vote: 'Follow vote',
      abstain: 'Abstain',
      check_him: 'Check him',
      protect_him: 'Protect him',
      save_him: 'Save him',
      poison_him: 'Poison him',
      self_vote: 'Self-knife',
    },
    // Analysis phrases
    analysis: {
      he_is_wolf: 'He\'s wolf',
      he_is_good: 'He\'s good',
      fake_seer: 'Fake seer',
      wolf_pit: 'Wolf slot',
      god_pit: 'God slot',
      civil_pit: 'Villager slot',
      diving: 'Quiet player',
      logical: 'Makes sense',
    },
    // Wolf team phrases
    wolf: {
      kill_him: 'Kill him',
      self_knife: 'Self-kill',
      wait: 'Wait',
      target_seer: 'Kill seer',
      target_witch: 'Kill witch',
      target_guard: 'Kill guard',
      i_jump: 'I\'ll claim',
      you_jump: 'You claim',
    },
    // Emotion phrases
    emotion: {
      haha: 'Haha',
      gg: 'GG',
      nice: 'Nice play',
      wp: 'Well played',
      sorry: 'Sorry',
      hurry: 'Hurry up',
      relax: 'Relax',
      nervous: 'So nervous',
    },
  },

  // Night overlay
  nightOverlay: {
    werewolf: 'Werewolf!',
    goodPerson: 'Good',
    wolfCompanions: 'Your wolf companions',
    confirmKill: 'Confirm Kill',
    confirmCheck: 'Confirm Check',
    closeYourEyes: 'Close your eyes...',
    phaseInProgress: '{{phase}} in progress',
    dayNightHint: 'Day {{day}} - Night',
    phase: {
      cupid: {
        title: 'Cupid Action',
        description: 'Select two players to become lovers',
      },
      werewolf: {
        title: 'Werewolf Action',
        description: 'Select a target to kill tonight',
      },
      seer: {
        title: 'Seer Action',
        description: 'Select a player to check',
      },
      witch: {
        title: 'Witch Action',
        description: 'Choose to use antidote or poison',
      },
      guard: {
        title: 'Guard Action',
        description: 'Select a player to protect',
      },
    },
    witch: {
      selectPoisonTarget: 'Select Poison Target',
      selectPlayerToPoison: 'Choose a player to poison',
      confirmPoison: 'Confirm Poison',
      tonightKilled: 'Tonight <1>{{name}}</1> was attacked by werewolves',
      peacefulNight: 'Peaceful night, no one was killed',
      used: 'Used',
      save: 'Save {{name}}',
      noOneKilled: 'No one killed',
      poisonSomeone: 'Poison',
      dontUse: 'Don\'t use',
    },
    guard: {
      cantProtectSame: 'Cannot protect {{name}} again',
      selectHint: 'Select a player to protect (you can protect yourself)',
      confirmProtect: 'Confirm Protect',
    },
    seer: {
      checkResult: 'Check Result',
      isWerewolf: '🐺 Werewolf!',
      isGood: '✨ Good',
      rememberInfo: 'Remember this info, wait for dawn...',
    },
    cupid: {
      connectHearts: 'Connect two hearts with your arrow of love',
      selectTwoPlayers: 'Select two players to become lovers (can include yourself)',
      selectFirst: 'Select first',
      selectSecond: 'Select second',
      confirmLink: '💘 Confirm Link',
      willBeLovers: '{{name1}} and {{name2}} will become lovers, if one dies the other follows',
    },
  },
};
