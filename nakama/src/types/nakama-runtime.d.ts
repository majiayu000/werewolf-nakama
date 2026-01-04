// Nakama Runtime TypeScript Definitions
// Based on Nakama 3.21.1 server runtime

declare namespace nkruntime {
  export interface Context {
    env: { [key: string]: string };
    executionMode: string;
    node: string;
    version: string;
    headers: { [key: string]: string[] };
    queryParams: { [key: string]: string[] };
    userId: string;
    username: string;
    vars: { [key: string]: string };
    sessionExpiry: number;
    clientIp: string;
    clientPort: string;
    lang: string;
  }

  export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }

  export interface Nakama {
    // Match functions
    matchCreate(moduleName: string, params?: { [key: string]: any }): string;
    matchGet(id: string): Match | null;
    matchList(limit: number, authoritative?: boolean, label?: string, minSize?: number, maxSize?: number, query?: string): Match[];
    matchSignal(id: string, data: string): string;

    // Storage functions
    storageRead(reads: StorageReadRequest[]): StorageObject[];
    storageWrite(writes: StorageWriteRequest[]): StorageWriteAck[];
    storageDelete(deletes: StorageDeleteRequest[]): void;
    storageList(userId: string, collection: string, limit?: number, cursor?: string): StorageObjectList;

    // Account functions
    accountGetId(userId: string): Account | null;
    accountsGetId(userIds: string[]): Account[];
    accountUpdateId(userId: string, username?: string | null, displayName?: string | null, timezone?: string | null, location?: string | null, langTag?: string | null, avatarUrl?: string | null, metadata?: { [key: string]: any } | null): void;

    // Notification functions
    notificationSend(userId: string, subject: string, content: { [key: string]: any }, code: number, senderId?: string | null, persistent?: boolean): void;
    notificationsSend(notifications: NotificationRequest[]): void;

    // Wallet functions
    walletUpdate(userId: string, changeset: { [key: string]: number }, metadata?: { [key: string]: any } | null, updateLedger?: boolean): WalletUpdateResult;
    walletLedgerList(userId: string, limit?: number, cursor?: string): WalletLedgerList;
    walletLedgerUpdate(itemId: string, metadata: { [key: string]: any }): WalletLedgerItem;

    // Leaderboard functions
    leaderboardCreate(id: string, authoritative?: boolean, sortOrder?: string, operator?: string, resetSchedule?: string | null, metadata?: { [key: string]: any } | null): void;
    leaderboardDelete(id: string): void;
    leaderboardRecordWrite(id: string, ownerId: string, username?: string | null, score?: number, subscore?: number, metadata?: { [key: string]: any } | null, operator?: string | null): LeaderboardRecord;
    leaderboardRecordDelete(id: string, ownerId: string): void;
    leaderboardRecordsList(id: string, ownerIds?: string[] | null, limit?: number, cursor?: string | null, expiry?: number | null): LeaderboardRecordList;

    // Tournament functions
    tournamentCreate(id: string, authoritative?: boolean, sortOrder?: string, operator?: string, duration?: number, resetSchedule?: string | null, metadata?: { [key: string]: any } | null, title?: string | null, description?: string | null, category?: number, startTime?: number | null, endTime?: number | null, maxSize?: number, maxNumScore?: number, joinRequired?: boolean): void;
    tournamentDelete(id: string): void;
    tournamentJoin(id: string, userId: string, username: string): void;
    tournamentRecordWrite(id: string, ownerId: string, username?: string | null, score?: number, subscore?: number, metadata?: { [key: string]: any } | null, operator?: string | null): LeaderboardRecord;

    // Group functions
    groupCreate(userId: string, name: string, creatorId?: string | null, langTag?: string | null, description?: string | null, avatarUrl?: string | null, open?: boolean, metadata?: { [key: string]: any } | null, maxCount?: number): Group;
    groupDelete(id: string): void;
    groupUpdate(id: string, userId?: string | null, name?: string | null, creatorId?: string | null, langTag?: string | null, description?: string | null, avatarUrl?: string | null, open?: boolean | null, metadata?: { [key: string]: any } | null, maxCount?: number | null): void;
    groupUsersList(id: string, limit?: number, state?: number | null, cursor?: string): GroupUserList;
    groupUserJoin(id: string, userId: string, username: string): void;
    groupUserLeave(id: string, userId: string): void;
    groupUsersKick(id: string, userIds: string[], callerId?: string | null): void;
    groupUsersPromote(id: string, userIds: string[], callerId?: string | null): void;
    groupUsersDemote(id: string, userIds: string[], callerId?: string | null): void;
    groupsList(name?: string | null, langTag?: string | null, members?: number | null, open?: boolean | null, limit?: number, cursor?: string): GroupList;
    userGroupsList(userId: string, limit?: number, state?: number | null, cursor?: string): UserGroupList;

    // Friend functions
    friendsList(userId: string, limit?: number, state?: number | null, cursor?: string): FriendList;
    friendsAdd(userId: string, username: string, ids: string[], usernames: string[]): void;
    friendsDelete(userId: string, ids: string[], usernames: string[]): void;
    friendsBlock(userId: string, ids: string[], usernames: string[]): void;

    // Utility functions
    uuidv4(): string;
    cronPrev(expression: string, timestamp: number): number;
    cronNext(expression: string, timestamp: number): number;
    sqlExec(query: string, args?: any[]): SqlExecResult;
    sqlQuery(query: string, args?: any[]): SqlQueryResult;
    httpRequest(url: string, method: string, headers?: { [key: string]: string }, body?: string, timeout?: number): HttpResponse;
    base64Encode(input: ArrayBuffer | string, padding?: boolean): string;
    base64Decode(input: string, padding?: boolean): ArrayBuffer;
    base64UrlEncode(input: ArrayBuffer | string, padding?: boolean): string;
    base64UrlDecode(input: string, padding?: boolean): ArrayBuffer;
    base16Encode(input: ArrayBuffer | string): string;
    base16Decode(input: string): ArrayBuffer;
    jwtGenerate(algorithm: string, signingKey: string, claims: { [key: string]: any }): string;
    md5Hash(input: string): string;
    sha256Hash(input: string): string;
    hmacSha256Hash(input: string, key: string): string;
    bcryptHash(input: string): string;
    bcryptCompare(hash: string, plaintext: string): boolean;
    aes128Encrypt(input: string, key: string): string;
    aes128Decrypt(input: string, key: string): string;
    aes256Encrypt(input: string, key: string): string;
    aes256Decrypt(input: string, key: string): string;
    jsonEncode(value: any): string;
    jsonDecode(value: string): any;
    binaryToString(input: ArrayBuffer): string;
    stringToBinary(input: string): ArrayBuffer;
  }

  export interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
    tickRate: number;
    handlerName: string;
  }

  export interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status?: string;
    persistence?: boolean;
    reason?: number;
  }

  export interface MatchMessage {
    sender: Presence;
    opCode: number;
    data: ArrayBuffer;
    reliable: boolean;
    receiveTimeMs: number;
  }

  export interface MatchState {
    [key: string]: any;
  }

  export interface MatchDispatcher {
    broadcastMessage(opCode: number, data?: ArrayBuffer | string | null, presences?: Presence[] | null, sender?: Presence | null, reliable?: boolean): void;
    broadcastMessageDeferred(opCode: number, data?: ArrayBuffer | string | null, presences?: Presence[] | null, sender?: Presence | null, reliable?: boolean): void;
    matchKick(presences: Presence[]): void;
    matchLabelUpdate(label: string): void;
  }

  export type MatchHandler = {
    matchInit: (ctx: Context, logger: Logger, nk: Nakama, params: { [key: string]: string }) => { state: MatchState; tickRate: number; label: string };
    matchJoinAttempt: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presence: Presence, metadata: { [key: string]: any }) => { state: MatchState; accept: boolean; rejectMessage?: string };
    matchJoin: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presences: Presence[]) => { state: MatchState } | null;
    matchLeave: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, presences: Presence[]) => { state: MatchState } | null;
    matchLoop: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, messages: MatchMessage[]) => { state: MatchState } | null;
    matchTerminate: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, graceSeconds: number) => { state: MatchState } | null;
    matchSignal: (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: MatchState, data: string) => { state: MatchState; data?: string } | null;
  };

  // Storage types
  export interface StorageObject {
    key: string;
    collection: string;
    userId: string;
    value: { [key: string]: any };
    version: string;
    permissionRead: number;
    permissionWrite: number;
    createTime: number;
    updateTime: number;
  }

  export interface StorageReadRequest {
    key: string;
    collection: string;
    userId: string;
  }

  export interface StorageWriteRequest {
    key: string;
    collection: string;
    userId: string;
    value: { [key: string]: any };
    permissionRead?: number;
    permissionWrite?: number;
    version?: string;
  }

  export interface StorageWriteAck {
    key: string;
    collection: string;
    userId: string;
    version: string;
  }

  export interface StorageDeleteRequest {
    key: string;
    collection: string;
    userId: string;
    version?: string;
  }

  export interface StorageObjectList {
    objects: StorageObject[];
    cursor?: string;
  }

  // Account types
  export interface Account {
    user: User;
    wallet: string;
    email: string;
    devices: AccountDevice[];
    customId: string;
    verifyTime: number;
    disableTime: number;
  }

  export interface User {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    langTag: string;
    location: string;
    timezone: string;
    metadata: { [key: string]: any };
    facebookId: string;
    googleId: string;
    gamecenterId: string;
    steamId: string;
    online: boolean;
    edgeCount: number;
    createTime: number;
    updateTime: number;
  }

  export interface AccountDevice {
    id: string;
    vars: { [key: string]: string };
  }

  // Notification types
  export interface NotificationRequest {
    userId: string;
    subject: string;
    content: { [key: string]: any };
    code: number;
    senderId?: string;
    persistent?: boolean;
  }

  // Wallet types
  export interface WalletUpdateResult {
    updated: { [key: string]: number };
    previous: { [key: string]: number };
  }

  export interface WalletLedgerList {
    items: WalletLedgerItem[];
    cursor?: string;
  }

  export interface WalletLedgerItem {
    id: string;
    userId: string;
    changeset: { [key: string]: number };
    metadata: { [key: string]: any };
    createTime: number;
    updateTime: number;
  }

  // Leaderboard types
  export interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    metadata: { [key: string]: any };
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
    maxNumScore: number;
  }

  export interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor?: string;
    prevCursor?: string;
  }

  // Group types
  export interface Group {
    id: string;
    creatorId: string;
    name: string;
    description: string;
    langTag: string;
    metadata: { [key: string]: any };
    avatarUrl: string;
    open: boolean;
    edgeCount: number;
    maxCount: number;
    createTime: number;
    updateTime: number;
  }

  export interface GroupUserList {
    groupUsers: GroupUser[];
    cursor?: string;
  }

  export interface GroupUser {
    user: User;
    state: number;
  }

  export interface GroupList {
    groups: Group[];
    cursor?: string;
  }

  export interface UserGroupList {
    userGroups: UserGroup[];
    cursor?: string;
  }

  export interface UserGroup {
    group: Group;
    state: number;
  }

  // Friend types
  export interface FriendList {
    friends: Friend[];
    cursor?: string;
  }

  export interface Friend {
    user: User;
    state: number;
    updateTime: number;
  }

  // SQL types
  export interface SqlExecResult {
    rowsAffected: number;
  }

  export interface SqlQueryResult {
    rows: { [key: string]: any }[];
  }

  // HTTP types
  export interface HttpResponse {
    code: number;
    headers: { [key: string]: string[] };
    body: string;
  }
}

// RPC Handler type
type RpcFn = (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) => string | void;

// Global function to initialize the module
declare function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: {
    registerRpc: (id: string, fn: RpcFn) => void;
    registerMatch: (name: string, handlers: nkruntime.MatchHandler) => void;
    registerBeforeRt: (id: string, fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, envelope: any) => any) => void;
    registerAfterRt: (id: string, fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, output: any, input: any) => void) => void;
    registerMatchmakerMatched: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: any[]) => string | void) => void;
    registerTournamentEnd: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, tournament: any, end: number, reset: number) => void) => void;
    registerTournamentReset: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, tournament: any, end: number, reset: number) => void) => void;
    registerLeaderboardReset: (fn: (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, leaderboard: any, reset: number) => void) => void;
  }
): void;
