/**
 * Werewolf Game Logger Module
 *
 * Provides structured logging with different levels and contexts.
 * Outputs JSON format for easy parsing and analysis.
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log level names for output
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

// Log context categories
export enum LogCategory {
  SYSTEM = 'system',
  MATCH = 'match',
  PLAYER = 'player',
  GAME = 'game',
  SKILL = 'skill',
  VOTE = 'vote',
  CHAT = 'chat',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  NETWORK = 'network'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: string;
  category: LogCategory;
  message: string;
  matchId?: string;
  playerId?: string;
  playerName?: string;
  data?: Record<string, unknown>;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  includeStack: boolean;
  prettyPrint: boolean;
  enableConsole: boolean;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  includeStack: false,
  prettyPrint: false,
  enableConsole: true
};

// Global configuration
let config: LoggerConfig = { ...DEFAULT_CONFIG };

// Configure the logger
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

// Get current timestamp in ISO format
function getTimestamp(): string {
  return new Date().toISOString();
}

// Format log entry to JSON
function formatLogEntry(entry: LogEntry): string {
  if (config.prettyPrint) {
    return JSON.stringify(entry, null, 2);
  }
  return JSON.stringify(entry);
}

// Core logging function
function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  context?: {
    matchId?: string;
    playerId?: string;
    playerName?: string;
    data?: Record<string, unknown>;
    duration?: number;
    error?: Error;
  }
): void {
  // Check minimum level
  if (level < config.minLevel) {
    return;
  }

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: LOG_LEVEL_NAMES[level],
    category,
    message
  };

  // Add optional context
  if (context?.matchId) entry.matchId = context.matchId;
  if (context?.playerId) entry.playerId = context.playerId;
  if (context?.playerName) entry.playerName = context.playerName;
  if (context?.data) entry.data = context.data;
  if (context?.duration !== undefined) entry.duration = context.duration;

  // Add error information
  if (context?.error) {
    entry.error = {
      name: context.error.name,
      message: context.error.message
    };
    if (config.includeStack && context.error.stack) {
      entry.error.stack = context.error.stack;
    }
  }

  // Output log
  if (config.enableConsole) {
    const formatted = formatLogEntry(entry);
    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

// Convenience logging functions
export const logger = {
  debug: (category: LogCategory, message: string, context?: Parameters<typeof log>[3]) =>
    log(LogLevel.DEBUG, category, message, context),

  info: (category: LogCategory, message: string, context?: Parameters<typeof log>[3]) =>
    log(LogLevel.INFO, category, message, context),

  warn: (category: LogCategory, message: string, context?: Parameters<typeof log>[3]) =>
    log(LogLevel.WARN, category, message, context),

  error: (category: LogCategory, message: string, context?: Parameters<typeof log>[3]) =>
    log(LogLevel.ERROR, category, message, context),

  fatal: (category: LogCategory, message: string, context?: Parameters<typeof log>[3]) =>
    log(LogLevel.FATAL, category, message, context)
};

// Create a scoped logger for a specific match
export interface ScopedLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, data?: Record<string, unknown>) => void;
}

export function createMatchLogger(matchId: string, category: LogCategory = LogCategory.MATCH): ScopedLogger {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(category, message, { matchId, data }),

    info: (message: string, data?: Record<string, unknown>) =>
      logger.info(category, message, { matchId, data }),

    warn: (message: string, data?: Record<string, unknown>) =>
      logger.warn(category, message, { matchId, data }),

    error: (message: string, error?: Error, data?: Record<string, unknown>) =>
      logger.error(category, message, { matchId, error, data })
  };
}

// Create a scoped logger for a specific player
export function createPlayerLogger(matchId: string, playerId: string, playerName: string): ScopedLogger {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(LogCategory.PLAYER, message, { matchId, playerId, playerName, data }),

    info: (message: string, data?: Record<string, unknown>) =>
      logger.info(LogCategory.PLAYER, message, { matchId, playerId, playerName, data }),

    warn: (message: string, data?: Record<string, unknown>) =>
      logger.warn(LogCategory.PLAYER, message, { matchId, playerId, playerName, data }),

    error: (message: string, error?: Error, data?: Record<string, unknown>) =>
      logger.error(LogCategory.PLAYER, message, { matchId, playerId, playerName, error, data })
  };
}

// Performance timing helper
export interface Timer {
  stop: () => number;
  elapsed: () => number;
}

export function startTimer(): Timer {
  const start = Date.now();
  return {
    stop: () => Date.now() - start,
    elapsed: () => Date.now() - start
  };
}

// Log with timing
export function logWithTiming(
  category: LogCategory,
  message: string,
  fn: () => void,
  context?: { matchId?: string; data?: Record<string, unknown> }
): void {
  const timer = startTimer();
  try {
    fn();
    const duration = timer.stop();
    logger.info(category, message, { ...context, duration });
  } catch (error) {
    const duration = timer.stop();
    logger.error(category, `${message} (failed)`, {
      ...context,
      duration,
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
  }
}

// Async log with timing
export async function logWithTimingAsync<T>(
  category: LogCategory,
  message: string,
  fn: () => Promise<T>,
  context?: { matchId?: string; data?: Record<string, unknown> }
): Promise<T> {
  const timer = startTimer();
  try {
    const result = await fn();
    const duration = timer.stop();
    logger.info(category, message, { ...context, duration });
    return result;
  } catch (error) {
    const duration = timer.stop();
    logger.error(category, `${message} (failed)`, {
      ...context,
      duration,
      error: error instanceof Error ? error : new Error(String(error))
    });
    throw error;
  }
}

// Batch logger for high-frequency events
export class BatchLogger {
  private buffer: LogEntry[] = [];
  private flushInterval: number;
  private maxBufferSize: number;

  constructor(flushInterval: number = 5000, maxBufferSize: number = 100) {
    this.flushInterval = flushInterval;
    this.maxBufferSize = maxBufferSize;
  }

  add(entry: Omit<LogEntry, 'timestamp'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      timestamp: getTimestamp()
    };
    this.buffer.push(fullEntry);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  flush(): LogEntry[] {
    const entries = [...this.buffer];
    this.buffer = [];

    if (entries.length > 0 && config.enableConsole) {
      console.log(JSON.stringify({
        type: 'batch_log',
        count: entries.length,
        entries
      }));
    }

    return entries;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}
