/**
 * Werewolf Game Metrics Module
 *
 * Collects and reports performance metrics for monitoring.
 * Supports Prometheus-compatible metric formats.
 */

import { logger, LogCategory, startTimer } from './logger';

// Metric types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

// Metric labels
export interface MetricLabels {
  [key: string]: string | number;
}

// Metric data point
export interface MetricPoint {
  name: string;
  type: MetricType;
  value: number;
  labels: MetricLabels;
  timestamp: number;
}

// Histogram bucket
interface HistogramBucket {
  le: number;  // less than or equal
  count: number;
}

// Histogram data
interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

// Summary quantile
interface SummaryQuantile {
  quantile: number;
  value: number;
}

// Summary data
interface SummaryData {
  quantiles: SummaryQuantile[];
  sum: number;
  count: number;
}

// Default histogram buckets (in milliseconds)
const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

// Metrics storage
class MetricsStore {
  private counters: Map<string, { value: number; labels: MetricLabels }[]> = new Map();
  private gauges: Map<string, { value: number; labels: MetricLabels }[]> = new Map();
  private histograms: Map<string, { data: HistogramData; labels: MetricLabels; buckets: number[] }[]> = new Map();
  private summaries: Map<string, { values: number[]; labels: MetricLabels; maxAge: number; lastRotate: number }[]> = new Map();

  // Get or create a metric key
  private getKey(name: string, labels: MetricLabels): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(k => `${k}="${labels[k]}"`)
      .join(',');
    return `${name}{${sortedLabels}}`;
  }

  // Counter operations
  incrementCounter(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const existing = this.counters.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entry = existing.find(e => this.getKey(name, e.labels) === labelKey);

    if (entry) {
      entry.value += value;
    } else {
      existing.push({ value, labels });
      this.counters.set(name, existing);
    }
  }

  getCounter(name: string, labels: MetricLabels = {}): number {
    const existing = this.counters.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entry = existing.find(e => this.getKey(name, e.labels) === labelKey);
    return entry?.value || 0;
  }

  // Gauge operations
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const existing = this.gauges.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entryIndex = existing.findIndex(e => this.getKey(name, e.labels) === labelKey);

    if (entryIndex >= 0) {
      existing[entryIndex].value = value;
    } else {
      existing.push({ value, labels });
      this.gauges.set(name, existing);
    }
  }

  incrementGauge(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const current = this.getGauge(name, labels);
    this.setGauge(name, current + value, labels);
  }

  decrementGauge(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const current = this.getGauge(name, labels);
    this.setGauge(name, current - value, labels);
  }

  getGauge(name: string, labels: MetricLabels = {}): number {
    const existing = this.gauges.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entry = existing.find(e => this.getKey(name, e.labels) === labelKey);
    return entry?.value || 0;
  }

  // Histogram operations
  observeHistogram(name: string, value: number, labels: MetricLabels = {}, buckets: number[] = DEFAULT_BUCKETS): void {
    const existing = this.histograms.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entryIndex = existing.findIndex(e => this.getKey(name, e.labels) === labelKey);

    if (entryIndex >= 0) {
      const entry = existing[entryIndex];
      entry.data.sum += value;
      entry.data.count += 1;
      for (const bucket of entry.data.buckets) {
        if (value <= bucket.le) {
          bucket.count += 1;
        }
      }
    } else {
      const histogramBuckets: HistogramBucket[] = buckets.map(le => ({
        le,
        count: value <= le ? 1 : 0
      }));
      histogramBuckets.push({ le: Infinity, count: 1 });

      existing.push({
        data: { buckets: histogramBuckets, sum: value, count: 1 },
        labels,
        buckets
      });
      this.histograms.set(name, existing);
    }
  }

  getHistogram(name: string, labels: MetricLabels = {}): HistogramData | null {
    const existing = this.histograms.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entry = existing.find(e => this.getKey(name, e.labels) === labelKey);
    return entry?.data || null;
  }

  // Summary operations (simplified - stores last N values)
  observeSummary(name: string, value: number, labels: MetricLabels = {}, maxAge: number = 60000): void {
    const existing = this.summaries.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entryIndex = existing.findIndex(e => this.getKey(name, e.labels) === labelKey);
    const now = Date.now();

    if (entryIndex >= 0) {
      const entry = existing[entryIndex];
      // Rotate if too old
      if (now - entry.lastRotate > entry.maxAge) {
        entry.values = [];
        entry.lastRotate = now;
      }
      entry.values.push(value);
      // Keep max 1000 values
      if (entry.values.length > 1000) {
        entry.values = entry.values.slice(-1000);
      }
    } else {
      existing.push({
        values: [value],
        labels,
        maxAge,
        lastRotate: now
      });
      this.summaries.set(name, existing);
    }
  }

  getSummary(name: string, labels: MetricLabels = {}): SummaryData | null {
    const existing = this.summaries.get(name) || [];
    const labelKey = this.getKey(name, labels);
    const entry = existing.find(e => this.getKey(name, e.labels) === labelKey);

    if (!entry || entry.values.length === 0) {
      return null;
    }

    const sorted = [...entry.values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    const getQuantile = (q: number): number => {
      const index = Math.floor(q * (count - 1));
      return sorted[index];
    };

    return {
      quantiles: [
        { quantile: 0.5, value: getQuantile(0.5) },
        { quantile: 0.9, value: getQuantile(0.9) },
        { quantile: 0.99, value: getQuantile(0.99) }
      ],
      sum,
      count
    };
  }

  // Export all metrics
  exportAll(): MetricPoint[] {
    const points: MetricPoint[] = [];
    const now = Date.now();

    // Export counters
    for (const [name, entries] of this.counters) {
      for (const entry of entries) {
        points.push({
          name,
          type: MetricType.COUNTER,
          value: entry.value,
          labels: entry.labels,
          timestamp: now
        });
      }
    }

    // Export gauges
    for (const [name, entries] of this.gauges) {
      for (const entry of entries) {
        points.push({
          name,
          type: MetricType.GAUGE,
          value: entry.value,
          labels: entry.labels,
          timestamp: now
        });
      }
    }

    return points;
  }

  // Export in Prometheus format
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    for (const [name, entries] of this.counters) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      for (const entry of entries) {
        const labels = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${name}{${labels}} ${entry.value}`);
      }
    }

    // Export gauges
    for (const [name, entries] of this.gauges) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      for (const entry of entries) {
        const labels = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${name}{${labels}} ${entry.value}`);
      }
    }

    // Export histograms
    for (const [name, entries] of this.histograms) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      for (const entry of entries) {
        const labels = Object.entries(entry.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelPrefix = labels ? `${labels},` : '';

        for (const bucket of entry.data.buckets) {
          const le = bucket.le === Infinity ? '+Inf' : bucket.le.toString();
          lines.push(`${name}_bucket{${labelPrefix}le="${le}"} ${bucket.count}`);
        }
        lines.push(`${name}_sum{${labels}} ${entry.data.sum}`);
        lines.push(`${name}_count{${labels}} ${entry.data.count}`);
      }
    }

    return lines.join('\n');
  }

  // Reset all metrics
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

// Predefined metric names
export const MetricNames = {
  // Match metrics
  MATCHES_CREATED: 'werewolf_matches_created_total',
  MATCHES_ACTIVE: 'werewolf_matches_active',
  MATCHES_COMPLETED: 'werewolf_matches_completed_total',
  MATCHES_DURATION: 'werewolf_match_duration_seconds',

  // Player metrics
  PLAYERS_CONNECTED: 'werewolf_players_connected',
  PLAYERS_JOINED: 'werewolf_players_joined_total',
  PLAYERS_LEFT: 'werewolf_players_left_total',
  PLAYERS_RECONNECTED: 'werewolf_players_reconnected_total',

  // Game metrics
  GAMES_WON_BY_FACTION: 'werewolf_games_won_by_faction_total',
  GAME_ROUNDS: 'werewolf_game_rounds_total',
  NIGHT_PHASE_DURATION: 'werewolf_night_phase_duration_ms',
  DAY_PHASE_DURATION: 'werewolf_day_phase_duration_ms',

  // Skill metrics
  SKILLS_USED: 'werewolf_skills_used_total',
  SKILL_DURATION: 'werewolf_skill_processing_duration_ms',

  // Vote metrics
  VOTES_CAST: 'werewolf_votes_cast_total',
  VOTES_ABSTAINED: 'werewolf_votes_abstained_total',
  VOTING_DURATION: 'werewolf_voting_duration_ms',

  // Message metrics
  MESSAGES_RECEIVED: 'werewolf_messages_received_total',
  MESSAGES_SENT: 'werewolf_messages_sent_total',
  MESSAGE_PROCESSING_DURATION: 'werewolf_message_processing_duration_ms',

  // Error metrics
  ERRORS_TOTAL: 'werewolf_errors_total',
  ANTI_CHEAT_VIOLATIONS: 'werewolf_anticheat_violations_total',

  // Performance metrics
  LOOP_TICK_DURATION: 'werewolf_loop_tick_duration_ms',
  BROADCAST_DURATION: 'werewolf_broadcast_duration_ms'
} as const;

// Metrics API
export const metrics = {
  // Counter operations
  incrementCounter: (name: string, value?: number, labels?: MetricLabels) =>
    metricsStore.incrementCounter(name, value, labels),

  getCounter: (name: string, labels?: MetricLabels) =>
    metricsStore.getCounter(name, labels),

  // Gauge operations
  setGauge: (name: string, value: number, labels?: MetricLabels) =>
    metricsStore.setGauge(name, value, labels),

  incrementGauge: (name: string, value?: number, labels?: MetricLabels) =>
    metricsStore.incrementGauge(name, value, labels),

  decrementGauge: (name: string, value?: number, labels?: MetricLabels) =>
    metricsStore.decrementGauge(name, value, labels),

  getGauge: (name: string, labels?: MetricLabels) =>
    metricsStore.getGauge(name, labels),

  // Histogram operations
  observeHistogram: (name: string, value: number, labels?: MetricLabels, buckets?: number[]) =>
    metricsStore.observeHistogram(name, value, labels, buckets),

  getHistogram: (name: string, labels?: MetricLabels) =>
    metricsStore.getHistogram(name, labels),

  // Summary operations
  observeSummary: (name: string, value: number, labels?: MetricLabels) =>
    metricsStore.observeSummary(name, value, labels),

  getSummary: (name: string, labels?: MetricLabels) =>
    metricsStore.getSummary(name, labels),

  // Export
  exportAll: () => metricsStore.exportAll(),
  exportPrometheus: () => metricsStore.exportPrometheus(),

  // Reset
  reset: () => metricsStore.reset()
};

// Helper to time a function and record metric
export function timeFunction<T>(
  metricName: string,
  labels: MetricLabels,
  fn: () => T
): T {
  const timer = startTimer();
  try {
    return fn();
  } finally {
    const duration = timer.stop();
    metrics.observeHistogram(metricName, duration, labels);
  }
}

// Helper to time an async function
export async function timeFunctionAsync<T>(
  metricName: string,
  labels: MetricLabels,
  fn: () => Promise<T>
): Promise<T> {
  const timer = startTimer();
  try {
    return await fn();
  } finally {
    const duration = timer.stop();
    metrics.observeHistogram(metricName, duration, labels);
  }
}

// Match-scoped metrics helper
export interface MatchMetrics {
  matchCreated: () => void;
  matchCompleted: (faction: string, duration: number) => void;
  playerJoined: () => void;
  playerLeft: () => void;
  playerReconnected: () => void;
  skillUsed: (role: string) => void;
  voteCast: (abstained: boolean) => void;
  messageReceived: (opCode: number) => void;
  messageSent: (opCode: number) => void;
  error: (type: string) => void;
  antiCheatViolation: (reason: string) => void;
  loopTick: (duration: number) => void;
  nightPhase: (duration: number) => void;
  dayPhase: (duration: number) => void;
}

export function createMatchMetrics(matchId: string): MatchMetrics {
  const labels = { match_id: matchId };

  return {
    matchCreated: () => {
      metrics.incrementCounter(MetricNames.MATCHES_CREATED);
      metrics.incrementGauge(MetricNames.MATCHES_ACTIVE);
      logger.debug(LogCategory.PERFORMANCE, 'Match created', { matchId });
    },

    matchCompleted: (faction: string, duration: number) => {
      metrics.incrementCounter(MetricNames.MATCHES_COMPLETED);
      metrics.decrementGauge(MetricNames.MATCHES_ACTIVE);
      metrics.incrementCounter(MetricNames.GAMES_WON_BY_FACTION, 1, { faction });
      metrics.observeHistogram(MetricNames.MATCHES_DURATION, duration / 1000);
      logger.debug(LogCategory.PERFORMANCE, 'Match completed', {
        matchId,
        data: { faction, duration }
      });
    },

    playerJoined: () => {
      metrics.incrementCounter(MetricNames.PLAYERS_JOINED, 1, labels);
      metrics.incrementGauge(MetricNames.PLAYERS_CONNECTED);
    },

    playerLeft: () => {
      metrics.incrementCounter(MetricNames.PLAYERS_LEFT, 1, labels);
      metrics.decrementGauge(MetricNames.PLAYERS_CONNECTED);
    },

    playerReconnected: () => {
      metrics.incrementCounter(MetricNames.PLAYERS_RECONNECTED, 1, labels);
    },

    skillUsed: (role: string) => {
      metrics.incrementCounter(MetricNames.SKILLS_USED, 1, { ...labels, role });
    },

    voteCast: (abstained: boolean) => {
      if (abstained) {
        metrics.incrementCounter(MetricNames.VOTES_ABSTAINED, 1, labels);
      } else {
        metrics.incrementCounter(MetricNames.VOTES_CAST, 1, labels);
      }
    },

    messageReceived: (opCode: number) => {
      metrics.incrementCounter(MetricNames.MESSAGES_RECEIVED, 1, { ...labels, op_code: opCode.toString() });
    },

    messageSent: (opCode: number) => {
      metrics.incrementCounter(MetricNames.MESSAGES_SENT, 1, { ...labels, op_code: opCode.toString() });
    },

    error: (type: string) => {
      metrics.incrementCounter(MetricNames.ERRORS_TOTAL, 1, { ...labels, type });
    },

    antiCheatViolation: (reason: string) => {
      metrics.incrementCounter(MetricNames.ANTI_CHEAT_VIOLATIONS, 1, { ...labels, reason });
    },

    loopTick: (duration: number) => {
      metrics.observeHistogram(MetricNames.LOOP_TICK_DURATION, duration, labels);
    },

    nightPhase: (duration: number) => {
      metrics.observeHistogram(MetricNames.NIGHT_PHASE_DURATION, duration, labels);
    },

    dayPhase: (duration: number) => {
      metrics.observeHistogram(MetricNames.DAY_PHASE_DURATION, duration, labels);
    }
  };
}

// System-wide metrics summary
export function getMetricsSummary(): Record<string, unknown> {
  return {
    matches: {
      active: metrics.getGauge(MetricNames.MATCHES_ACTIVE),
      created: metrics.getCounter(MetricNames.MATCHES_CREATED),
      completed: metrics.getCounter(MetricNames.MATCHES_COMPLETED)
    },
    players: {
      connected: metrics.getGauge(MetricNames.PLAYERS_CONNECTED),
      joined: metrics.getCounter(MetricNames.PLAYERS_JOINED),
      left: metrics.getCounter(MetricNames.PLAYERS_LEFT)
    },
    errors: {
      total: metrics.getCounter(MetricNames.ERRORS_TOTAL),
      antiCheat: metrics.getCounter(MetricNames.ANTI_CHEAT_VIOLATIONS)
    },
    messages: {
      received: metrics.getCounter(MetricNames.MESSAGES_RECEIVED),
      sent: metrics.getCounter(MetricNames.MESSAGES_SENT)
    }
  };
}
