/**
 * 中文翻译文件
 */

export const zh = {
  // 通用
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    back: '返回',
    next: '下一步',
    skip: '跳过',
    submit: '提交',
    refresh: '刷新',
    search: '搜索',
    filter: '筛选',
    all: '全部',
    none: '无',
    yes: '是',
    no: '否',
    or: '或',
    and: '和',
    unknown: '未知',
    online: '在线',
    offline: '离线',
    connecting: '连接中',
    connected: '已连接',
    disconnected: '未连接',
    server: '服务器',
  },

  // 游戏标题和品牌
  brand: {
    title: '狼人杀',
    subtitle: 'WEREWOLF ONLINE',
    tagline: '6-18人 · 实时对战 · 多种角色',
    version: '版本',
    poweredBy: 'Powered by Nakama',
  },

  // 认证相关
  auth: {
    login: '登录',
    register: '注册',
    logout: '退出登录',
    guest: '游客登录',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    username: '用户名',
    rememberMe: '记住我',
    forgotPassword: '忘记密码',
    noAccount: '没有账号？',
    hasAccount: '已有账号？',
    createAccount: '创建账号',
    loginWithEmail: '邮箱登录',
    quickStart: '快速开始',
    guestMode: '游客模式',
    guestTip: '游客账户可以立即开始游戏',
    linkEmail: '绑定邮箱',
    linkEmailTip: '绑定邮箱后可以在其他设备登录',
    upgradeAccount: '升级账户',
    accountInfo: '账户信息',
    guestAccount: '游客账户',
    emailAccount: '邮箱账户',
    processing: '处理中...',
    loginNow: '立即登录',
    registerNow: '立即注册',
    startGame: '开始游戏',
    saveStats: '想要保存战绩？',
    guestNickname: '游戏昵称（可选）',
    leaveEmptyRandom: '留空将随机生成',
    usernameChars: '2-12个字符',
    passwordChars: '至少6个字符',
    reenterPassword: '再次输入密码',
    setPassword: '设置密码',
    guestStart: '游客快速开始',
    bindEmailTitle: '绑定邮箱',
    bindEmailSuccess: '绑定成功！',
    bindEmailDesc: '绑定邮箱后，您可以在其他设备上登录并保留游戏战绩。',
    tab: {
      login: '登录',
      register: '注册',
      guest: '游客',
    },
    errors: {
      invalidEmail: '请输入有效的邮箱地址',
      passwordTooShort: '密码至少需要6个字符',
      passwordMismatch: '两次输入的密码不一致',
      usernameTooShort: '用户名至少需要2个字符',
      loginFailed: '登录失败，请检查邮箱和密码',
      registerFailed: '注册失败，请稍后重试',
      emailExists: '该邮箱已被注册',
    },
  },

  // 大厅
  lobby: {
    enterGame: '进入游戏大厅',
    demoMode: '演示模式',
    demoTip: '无需服务器',
    yourName: '你的名字',
    enterName: '输入玩家名...',
    nameRequired: '请输入玩家名',
    nameTooShort: '玩家名至少需要2个字符',
    connectionError: '连接错误',
    ensureServer: '请确保 Nakama 服务器已启动，或使用演示模式体验游戏',
    gameRules: '游戏规则',
    factions: {
      title: '阵营介绍',
      werewolf: '狼人阵营：每晚杀死一名村民，隐藏身份争取胜利',
      villager: '好人阵营：通过投票找出狼人，保护村庄',
      lovers: '第三方：丘比特创造的情侣，只要双方存活即可获胜',
    },
    specialRoles: '特殊角色',
  },

  // 房间列表
  roomList: {
    title: '房间列表',
    createRoom: '创建房间',
    quickMatch: '快速匹配',
    quickMatchDesc: '自动匹配适合的房间',
    findingMatch: '正在寻找匹配...',
    noRooms: '暂无可用房间',
    noRoomsHint: '创建一个新房间开始游戏吧！',
    refresh: '刷新',
    filter: {
      all: '全部',
      waiting: '等待中',
      playing: '游戏中',
    },
    roomCard: {
      players: '玩家',
      join: '加入',
      full: '已满',
      private: '私密房间',
      enterPassword: '请输入房间密码',
      wrongPassword: '密码错误',
    },
    createModal: {
      title: '创建房间',
      roomName: '房间名称',
      roomNamePlaceholder: '输入房间名...',
      maxPlayers: '最大人数',
      private: '私密房间',
      password: '房间密码',
      passwordPlaceholder: '输入密码...',
      customRoles: '自定义角色',
      roleConfig: '角色配置',
      create: '创建房间',
      presetConfig: '预设配置',
    },
  },

  // 游戏房间
  game: {
    room: '房间',
    day: '第{{day}}天',
    night: '第{{night}}夜',
    waiting: '等待中',
    ready: '已准备',
    notReady: '未准备',
    readyButton: '准备',
    cancelReady: '取消准备',
    startGame: '开始游戏',
    leaveRoom: '离开房间',
    spectating: '观战中',
    youAre: '你是',
    yourRole: '你的角色',
    alive: '存活',
    dead: '已死亡',
    seat: '座位',
  },

  // 游戏房间具体
  gameRoom: {
    assigningRoles: '分配角色',
    execution: '处决',
    waitingForPlayers: '等待玩家加入...',
    selectVoteTarget: '选择投票目标',
    selectShootTarget: '选择开枪目标',
    selectSkillTarget: '选择技能目标',
    shootHint: '点击玩家带走一人，或放弃开枪',
    clickToSelect: '点击玩家头像进行选择',
    select: '选择',
    selectTarget: '选择目标',
    lastWordsHint: '留下你的遗言吧...',
    noSheriff: '本局没有警长',
  },

  // 游戏阶段
  phase: {
    waiting: '等待开始',
    night: '夜晚',
    day: '白天',
    discussion: '自由讨论',
    voting: '投票阶段',
    lastWords: '遗言阶段',
    deathSkill: '死亡技能',
    sheriff: {
      campaign: '警长竞选',
      speech: '竞选发言',
      voting: '警长投票',
      transfer: '警徽移交',
    },
  },

  // 角色
  roles: {
    villager: {
      name: '村民',
      description: '普通村民，没有特殊能力。通过讨论和投票找出狼人。',
    },
    seer: {
      name: '预言家',
      description: '每晚可以查验一名玩家的身份（好人/狼人）。',
    },
    witch: {
      name: '女巫',
      description: '拥有一瓶解药和一瓶毒药。解药可以救活当晚被杀的玩家，毒药可以毒死一名玩家。',
      antidote: '解药',
      poison: '毒药',
      noVictim: '平安夜',
      wasKilled: '今晚被杀',
    },
    hunter: {
      name: '猎人',
      description: '死亡时可以开枪带走一名玩家。被女巫毒死时不能开枪。',
      shoot: '开枪',
      skipShoot: '放弃开枪',
      shootPrompt: '选择要带走的玩家',
    },
    guard: {
      name: '守卫',
      description: '每晚可以守护一名玩家，使其免受狼人袭击。不能连续两晚守护同一人。',
      protect: '守护',
      skipProtect: '不守护',
      cantRepeat: '不能连续守护同一人',
    },
    idiot: {
      name: '白痴',
      description: '被投票出局时可以翻牌亮明身份免死一次。翻牌后失去投票权。',
      revealed: '已翻牌',
    },
    werewolf: {
      name: '狼人',
      description: '每晚与狼队一起选择击杀一名玩家。隐藏身份，争取胜利。',
      kill: '击杀',
    },
    alphaWolf: {
      name: '狼王',
      description: '狼人中的领袖。死亡时可以开枪带走一名玩家。',
    },
    cupid: {
      name: '丘比特',
      description: '第一晚可以连接两名玩家成为情侣。情侣中任何一方死亡，另一方也会殉情。',
      link: '连接情侣',
      selectTwo: '选择两名玩家成为情侣',
    },
  },

  // 阵营
  factions: {
    villagers: '好人阵营',
    werewolves: '狼人阵营',
    lovers: '情侣',
    neutral: '中立阵营',
  },

  // 投票
  voting: {
    voteFor: '投票给',
    abstain: '弃权',
    voted: '已投票',
    confirmVote: '确认投票',
    changeVote: '修改投票',
    votesReceived: '得票',
    noVotes: '无票',
    result: {
      title: '投票结果',
      eliminated: '被投票出局',
      tie: '平票',
      noElimination: '无人出局',
    },
    sheriffWeight: '警长 1.5 票',
  },

  // 投票面板
  votingPanel: {
    title: '投票处决',
    deadCannotVote: '你已死亡，无法投票',
    idiotLostVoteRight: '你已翻牌亮出白痴身份，失去投票权',
    voteCompleted: '你已完成投票',
    noVotablePlayers: '没有可投票的玩家',
    abstain: '弃权 (不投票)',
    waitingForOthers: '等待其他玩家投票...',
    votedBy: '投票者',
    voters: '投票者',
  },

  // 聊天
  chat: {
    public: '公共频道',
    wolf: '狼人密语',
    dead: '观战频道',
    spectator: '观战者',
    sendMessage: '发送消息...',
    cantSpeak: '当前阶段无法发言',
    deadCantSpeak: '死亡玩家无法在公共频道发言',
    system: '系统',
    quickPhrases: '快捷短语',
    emoji: '表情',
  },

  // 遗言
  lastWords: {
    title: '遗言时间',
    speak: '发表遗言',
    skip: '放弃发言',
    speaking: '正在发言',
    placeholder: '输入你的遗言...',
    limit: '最多500字',
  },

  // 警长
  sheriff: {
    badge: '警徽',
    current: '当前警长',
    currentFormat: '当前警长：{{seat}}号 {{name}}',
    weight: '1.5票权重',
    weightShort: '1.5票',
    dead: '已死亡',
    seatFormat: '{{seat}}号 {{name}}',
    campaign: {
      title: '警长竞选',
      description: '报名参加竞选成为警长',
      join: '参与竞选',
      quit: '退出竞选',
      candidates: '当前候选人',
      candidatesCount: '当前候选人 ({{count}})',
      noCandidates: '暂无候选人',
    },
    speech: {
      title: '竞选发言',
      progress: '发言进度：{{current}} / {{total}}',
      speaking: '发言中',
      speakingNow: '正在发言...',
    },
    voting: {
      title: '警长投票',
      selectCandidate: '选择你支持的候选人',
      voted: '已投票，等待结果...',
      waitingForOthers: '已投票，等待其他玩家...',
      votes: '票',
    },
    transfer: {
      title: '警徽移交',
      description: '选择你的继任者，或撕毁警徽',
      transferring: '警徽移交中',
      selectingSuccessor: '{{name}} 正在选择继任者...',
      selectPlayer: '选择移交对象',
      destroy: '撕毁',
      confirm: '移交警徽',
    },
    election: {
      result: '选举结果',
      elected: '当选警长',
      autoElected: '自动当选',
      congratulations: '恭喜当选',
      gotPosition: '获得警长职位（1.5票权重）',
      waitingResult: '等待选举结果...',
      tie: '平票',
      noSheriff: '本局没有警长',
      noElection: '无人竞选',
    },
  },

  // 结果
  result: {
    gameOver: '游戏结束',
    victory: '胜利！',
    defeat: '失败...',
    villagersWin: '好人阵营胜利',
    werewolvesWin: '狼人阵营胜利',
    loversWin: '情侣获胜',
    stats: {
      title: '游戏统计',
      totalPlayers: '总玩家',
      survivors: '幸存者',
      days: '游戏天数',
    },
    playAgain: '再来一局',
    backToLobby: '返回大厅',
  },

  // 用户统计
  stats: {
    title: '战绩统计',
    myStats: '我的战绩',
    totalGames: '总场次',
    wins: '胜利',
    losses: '失败',
    winRate: '胜率',
    level: '等级',
    exp: '经验值',
    noStats: '暂无战绩',
    noGames: '暂无游戏记录',
    startPlaying: '开始游戏后将显示统计数据',
    levelInfo: '等级信息',
    overallStats: '总体统计',
    survivalRate: '存活率',
    sheriffGames: '警长场次',
    neverElected: '未当选过',
    maxWinStreak: '最高连胜',
    firstGame: '首次游戏',
    lastGame: '最近游戏',
    byFaction: '阵营统计',
    byRole: '角色统计',
    recentGames: '最近游戏',
    games: '场',
    winsCount: '{{wins}}胜 {{losses}}负',
    villagerFaction: '好人阵营',
    werewolfFaction: '狼人阵营',
    loversFaction: '情侣阵营',
    sheriffWinRate: '胜率 {{rate}}%',
  },

  // 成就
  achievements: {
    title: '成就系统',
    unlocked: '已解锁',
    locked: '未解锁',
    progress: '进度',
    completion: '完成度',
    xpReward: '经验奖励',
    noAchievements: '暂无此类成就',
    loadError: '无法加载成就数据',
    achievementUnlocked: '成就解锁!',
    recentUnlock: '最近解锁',
    achievementProgress: '成就进度',
    categories: {
      beginner: '新手成就',
      games: '场次成就',
      wins: '胜利成就',
      streak: '连胜成就',
      roleMaster: '角色大师',
      skill: '技能成就',
      sheriff: '警长成就',
      special: '特殊成就',
      survival: '存活成就',
      level: '等级成就',
      social: '社交成就',
    },
    rarity: {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    },
  },

  // 等级系统
  level: {
    levelUp: '升级!',
    maxLevel: '满级',
    xp: '经验值',
    xpToNext: '距离下一级还需 {{xp}} XP',
    tier: '段位',
    tierFormat: '{{tier}}段位',
    lvFormat: 'Lv.{{level}}',
    xpRewards: '经验值获取方式',
    rewards: {
      gameCompleted: '完成游戏',
      gameWon: '获胜',
      survived: '存活',
      sheriffElected: '当选警长',
      firstWinOfDay: '首胜奖励',
      winStreakBonus: '连胜奖励',
    },
    winStreak: '{{count}} 连胜',
    currentRecord: '历史最高',
  },

  // 排行榜
  leaderboard: {
    title: '排行榜',
    level: '等级榜',
    wins: '胜场榜',
    winRate: '胜率榜',
    winStreak: '连胜榜',
    myRank: '我的排名',
    noData: '暂无数据',
    // 类型描述
    descriptions: {
      level: '按玩家等级排名',
      wins: '按总胜场数排名',
      winRate: '按胜率排名（至少10场）',
      winStreak: '按最高连胜记录排名',
    },
    // 排行榜条目
    entry: {
      me: '我',
      winsLabel: '胜场',
      gamesLabel: '场',
      streakLabel: '连胜',
      winRateLabel: '胜率',
      totalGamesLabel: '总场次',
      maxStreakLabel: '最高连胜',
      winsGames: '{{wins}}胜/{{games}}场',
      winRatePercent: '胜率{{rate}}%',
    },
    // 空状态
    empty: {
      title: '暂无排行数据',
      description: '完成更多游戏后即可上榜',
    },
    // 分页
    pagination: {
      prev: '上一页',
      next: '下一页',
    },
    // 紧凑版
    compact: {
      levelRanking: '等级排行',
      viewAll: '查看全部 →',
    },
  },

  // 邀请
  invite: {
    title: '邀请好友',
    searchUser: '搜索用户',
    searchPlaceholder: '输入用户名搜索...',
    send: '发送邀请',
    sending: '发送中...',
    sent: '已发送',
    received: '收到的邀请',
    pending: '待处理',
    accept: '接受',
    decline: '拒绝',
    cancel: '取消邀请',
    expired: '已过期',
    expiresIn: '{{time}}后过期',
    // 标签页
    tabs: {
      received: '收到的邀请',
      sent: '已发送',
      search: '搜索用户',
    },
    // 时间格式
    time: {
      expired: '已过期',
      minutesSeconds: '{{minutes}}分{{seconds}}秒',
      seconds: '{{seconds}}秒',
      remaining: '剩余 {{time}}',
    },
    // 玩家数
    players: '{{current}}/{{max}} 人',
    // 通知弹窗
    notification: {
      title: '收到游戏邀请',
      invitesToJoin: '邀请你加入游戏',
      joinGame: '加入游戏',
    },
    // 搜索
    search: {
      button: '搜索',
      searching: '搜索中...',
      minChars: '请输入至少2个字符',
      noResults: '未找到用户',
      failed: '搜索失败',
      joinRoomFirst: '请先加入一个房间后再邀请好友',
    },
    // 消息提示
    messages: {
      inviteSent: '邀请已发送',
      sendFailed: '发送失败',
      joiningGame: '正在加入游戏...',
      acceptFailed: '接受邀请失败',
      declined: '已拒绝邀请',
      declineFailed: '拒绝邀请失败',
      cancelled: '已取消邀请',
      cancelFailed: '取消邀请失败',
      operationFailed: '操作失败',
      joinFailed: '加入游戏失败',
      noRoomJoined: '请先加入一个房间',
    },
    // 空状态
    empty: {
      received: '暂无邀请',
      sent: '暂无发送的邀请',
    },
    // 按钮
    buttons: {
      invite: '邀请',
      refresh: '刷新邀请列表',
    },
    // 加载状态
    loading: '加载中...',
  },

  // 回放系统
  replay: {
    title: '游戏回放',
    button: '回放',
    loading: '加载回放...',
    backToList: '返回列表',
    defaultRoomName: '狼人杀回放',
    // 列表
    list: {
      total: '共 {{count}} 条回放',
      playerCount: '{{count}}人局',
      days: '{{count}}天',
      myRole: '我的角色:',
      unknown: '未知',
    },
    // 胜负结果
    result: {
      unknown: '未知',
      villagerWin: '好人胜利',
      werewolfWin: '狼人胜利',
      loversWin: '情侣胜利',
      win: '胜利',
      lose: '失败',
    },
    // 统计
    stats: {
      wolfKills: '狼人击杀',
      votedOut: '投票出局',
      witchSaves: '女巫救人',
      skillsUsed: '技能使用',
    },
    // 阵营
    faction: {
      werewolf: '狼人阵营',
      villager: '好人阵营',
      neutral: '中立阵营',
    },
    // 标签页
    tabs: {
      timeline: '事件时间线',
      players: '玩家列表',
    },
    // 播放控制
    playback: {
      speed: '倍速:',
    },
    // 事件描述
    events: {
      gameStarted: '游戏开始，{{count}} 名玩家',
      nightStarted: '第 {{day}} 夜开始',
      dayStarted: '第 {{day}} 天开始',
      wolfKill: '狼人击杀了 {{target}}',
      seerCheck: '预言家查验了 {{target}}',
      witchSave: '女巫救了 {{target}}',
      witchPoison: '女巫毒了 {{target}}',
      guardProtect: '守卫守护了 {{target}}',
      hunterShoot: '猎人 {{actor}} 开枪带走了 {{target}}',
      alphaWolfShoot: '狼王 {{actor}} 开枪带走了 {{target}}',
      cupidLink: '丘比特将 {{lover1}} 和 {{lover2}} 连为情侣',
      voteEliminated: '投票出局: {{player}}',
      voteTie: '平票，无人出局',
      sheriffElected: '{{player}} 当选警长',
      idiotRevealed: '白痴 {{player}} 翻牌免死',
      loverDied: '情侣殉情',
      playerDied: '{{player}} 死亡',
      phaseChanged: '阶段切换: {{phase}}',
    },
    // 空状态
    empty: {
      title: '暂无游戏回放',
      description: '完成一局游戏后将自动保存回放',
    },
  },

  // 观战模式
  spectator: {
    mode: '观战模式',
    watching: '正在观战',
    allInfo: '可查看所有玩家信息',
    nightActions: '夜晚行动',
    joinAsSpectator: '以观战者身份加入',
  },

  // 设置
  settings: {
    title: '设置',
    sound: {
      title: '音效设置',
      enabled: '音效开关',
      volume: '音量',
      test: '测试音效',
      enable: '开启音效',
      disable: '关闭音效',
    },
    theme: {
      title: '主题设置',
      dark: '暗黑模式',
      light: '光明模式',
      system: '跟随系统',
    },
    language: {
      title: '语言设置',
      current: '当前语言',
    },
  },

  // 键盘快捷键
  shortcuts: {
    title: '快捷键',
    hint: '按 ? 查看快捷键',
    categories: {
      general: '通用',
      game: '游戏',
      chat: '聊天',
      navigation: '导航',
    },
    keys: {
      escape: '取消/关闭',
      enter: '确认',
      space: '确认',
      numbers: '选择玩家',
      r: '准备',
      c: '聊天',
      v: '投票',
      h: '警长',
      s: '音效',
      t: '聚焦输入框',
      tab: '切换频道',
    },
  },

  // PWA
  pwa: {
    install: '安装应用',
    installPrompt: '安装狼人杀到您的设备，获得更好的游戏体验！',
    updateAvailable: '新版本可用',
    updateNow: '立即更新',
    offline: '离线模式',
    offlineHint: '当前处于离线状态，部分功能可能不可用',
  },

  // 死亡原因
  deathCause: {
    wolf: '被狼人杀死',
    poison: '被女巫毒死',
    vote: '被投票出局',
    shoot: '被枪杀',
    loverSuicide: '殉情而死',
  },

  // 夜晚行动
  nightAction: {
    werewolfTurn: '狼人请睁眼，选择今晚的目标',
    seerTurn: '预言家请睁眼，选择要查验的玩家',
    witchTurn: '女巫请睁眼',
    guardTurn: '守卫请睁眼，选择要守护的玩家',
    cupidTurn: '丘比特请睁眼，选择两名玩家成为情侣',
    waiting: '闭眼等待...',
    confirm: '确认',
    skip: '跳过',
  },

  // 发言计时器
  dayTimer: {
    freeDiscussion: '💬 自由发言',
    orderedSpeech: '🎤 顺序发言',
    paused: '⏸️ 已暂停',
    remaining: '剩余',
    ended: '结束',
    speaking: '正在发言',
    nextSpeaker: '下一个:',
    skip: '⏭️ 跳过',
    endSpeaking: '✓ 结束发言',
    remainingTime: '剩余时间',
    speakingOrder: '📋 发言顺序',
    seatFormat: '{{seat}}号 {{name}}',
    progressFormat: '({{current}}/{{total}})',
  },

  // 过渡动画文本
  transition: {
    nightFalls: '天黑请闭眼',
    dayBreaks: '天亮了',
    nightText: '天黑请闭眼',
    dayText: '天亮了',
  },

  // 结果弹窗
  resultModal: {
    villagersWin: '好人阵营胜利!',
    villagersWinDesc: '正义终将战胜邪恶，村庄恢复了和平。',
    werewolvesWin: '狼人阵营胜利!',
    werewolvesWinDesc: '黑夜笼罩了村庄，狼人统治了这片土地。',
    loversWin: '情侣胜利!',
    loversWinDesc: '爱情战胜了一切，情侣们永远幸福地生活在一起。',
    gameOver: '游戏结束',
    gameOverDesc: '游戏以特殊方式结束。',
    you: '你',
    werewolves: '狼人',
    villagers: '好人',
    viewDetails: '查看详情',
  },

  // 快捷短语
  quickPhrases: {
    title: '快捷短语',
    close: '关闭 ✕',
    // 分类
    categories: {
      basic: '基础',
      identity: '身份',
      action: '行动',
      analysis: '分析',
      wolf: '狼队',
      emotion: '表情',
    },
    // 基础短语
    basic: {
      pass: '过',
      good_pass: '好人过',
      agree: '同意',
      disagree: '反对',
      trust: '我信你',
      doubt: '我怀疑你',
      thinking: '让我想想',
      confused: '我很迷',
    },
    // 身份短语
    identity: {
      im_villager: '我是村民',
      im_seer: '我是预言家',
      im_witch: '我是女巫',
      im_guard: '我是守卫',
      im_hunter: '我是猎人',
      im_idiot: '我是白痴',
      im_good: '我是好人',
      checked_good: '我验了是好人',
      checked_wolf: '我验了是狼',
    },
    // 行动短语
    action: {
      vote_him: '投他',
      follow_vote: '跟票',
      abstain: '弃票',
      check_him: '查一下他',
      protect_him: '守他',
      save_him: '救他',
      poison_him: '毒他',
      self_vote: '自刀',
    },
    // 分析短语
    analysis: {
      he_is_wolf: '他是狼',
      he_is_good: '他是好人',
      fake_seer: '假预言家',
      wolf_pit: '狼坑',
      god_pit: '神坑',
      civil_pit: '民坑',
      diving: '潜水',
      logical: '逻辑对',
    },
    // 狼队短语
    wolf: {
      kill_him: '刀他',
      self_knife: '自刀',
      wait: '等一下',
      target_seer: '刀预言家',
      target_witch: '刀女巫',
      target_guard: '刀守卫',
      i_jump: '我来跳',
      you_jump: '你来跳',
    },
    // 表情短语
    emotion: {
      haha: '哈哈哈',
      gg: 'GG',
      nice: '打得好',
      wp: '玩得漂亮',
      sorry: '不好意思',
      hurry: '快点',
      relax: '别急',
      nervous: '好紧张',
    },
  },

  // 夜晚遮罩
  nightOverlay: {
    werewolf: '狼人!',
    goodPerson: '好人',
    wolfCompanions: '你的狼人同伴',
    confirmKill: '确认击杀',
    confirmCheck: '确认查验',
    closeYourEyes: '请闭上眼睛...',
    phaseInProgress: '{{phase}}进行中',
    dayNightHint: '第 {{day}} 天 · 夜晚',
    phase: {
      cupid: {
        title: '丘比特行动',
        description: '请选择两名玩家成为情侣',
      },
      werewolf: {
        title: '狼人行动',
        description: '请选择今晚要击杀的目标',
      },
      seer: {
        title: '预言家行动',
        description: '请选择要查验的玩家',
      },
      witch: {
        title: '女巫行动',
        description: '请选择使用解药或毒药',
      },
      guard: {
        title: '守卫行动',
        description: '请选择要守护的玩家',
      },
    },
    witch: {
      selectPoisonTarget: '选择毒药目标',
      selectPlayerToPoison: '选择要毒杀的玩家',
      confirmPoison: '确认毒杀',
      tonightKilled: '今晚 {{name}} 被狼人袭击',
      peacefulNight: '今晚是平安夜，无人被杀',
      used: '已使用',
      save: '救 {{name}}',
      noOneKilled: '无人被杀',
      poisonSomeone: '毒人',
      dontUse: '不使用',
    },
    guard: {
      cantProtectSame: '不能连续守护 {{name}}',
      selectHint: '选择要守护的玩家（可以守护自己）',
      confirmProtect: '确认守护',
    },
    seer: {
      checkResult: '查验结果',
      isWerewolf: '🐺 狼人!',
      isGood: '✨ 好人',
      rememberInfo: '请记住这个信息，等待天亮...',
    },
    cupid: {
      connectHearts: '用你的爱之箭连接两颗心',
      selectTwoPlayers: '选择两名玩家成为情侣（可以包括自己）',
      selectFirst: '选择第一人',
      selectSecond: '选择第二人',
      confirmLink: '💘 确认连线',
      willBeLovers: '{{name1}} 和 {{name2}} 将成为情侣，一方死亡另一方也会殉情',
    },
  },
};
