import { MAP_CONSTANTS } from '../constants/map.js';

const PREFIX = MAP_CONSTANTS.METRICS_PREFIX;

/**
 * Metrics state is stored on globalThis so that even if this module is
 * evaluated more than once (e.g. by the runtime's module loader), all
 * instances share the same state.
 */
const globalKey = '__gvlocation_metrics_state__';

const HistogramBuckets = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000];

interface MetricsState {
  counters: Record<string, number>;
  histograms: Record<string, { observations: number[] }>;
}

const createState = (): MetricsState => ({
  counters: {
    requests_total: 0,
    errors_total: 0,
    validation_errors_total: 0,
    cache_hits_total: 0,
    cache_misses_total: 0,
    tiles_fetched_total: 0,
    batch_items_success_total: 0,
    batch_items_failed_total: 0,
  },
  histograms: {
    request_duration_ms: { observations: [] },
    tile_fetch_duration_ms: { observations: [] },
  },
});

const state: MetricsState =
  ((globalThis as any)[globalKey] as MetricsState) || // eslint-disable-line
  ((globalThis as any)[globalKey] = createState()); // eslint-disable-line

const COUNTER_HELP: Record<string, string> = {
  requests_total: 'Total HTTP requests received.',
  errors_total: 'Total HTTP 5xx errors.',
  validation_errors_total: 'Total HTTP 400 validation errors.',
  cache_hits_total: 'Total tile cache hits.',
  cache_misses_total: 'Total tile cache misses.',
  tiles_fetched_total:
    'Total external map tiles fetched from upstream providers.',
  batch_items_success_total: 'Total batch items successfully rendered.',
  batch_items_failed_total: 'Total batch items that failed.',
};

const HISTOGRAM_HELP: Record<string, string> = {
  request_duration_ms: 'HTTP request duration in milliseconds.',
  tile_fetch_duration_ms: 'External tile fetch duration in milliseconds.',
};

export const metrics = {
  increment(name: string) {
    if (name in state.counters) state.counters[name] += 1;
  },

  observe(name: string, value: number) {
    if (name in state.histograms) {
      state.histograms[name].observations.push(value);
      // keep memory bounded
      if (state.histograms[name].observations.length > 10000) {
        state.histograms[name].observations =
          state.histograms[name].observations.slice(-5000);
      }
    }
  },

  setCacheStats(hits: number, misses: number) {
    state.counters.cache_hits_total = hits;
    state.counters.cache_misses_total = misses;
  },

  export(): string {
    const lines: string[] = [];

    for (const [name, value] of Object.entries(state.counters)) {
      lines.push(`# HELP ${PREFIX}_${name} ${COUNTER_HELP[name] || ''}`);
      lines.push(`# TYPE ${PREFIX}_${name} counter`);
      lines.push(`${PREFIX}_${name} ${value}`);
    }

    for (const [name, h] of Object.entries(state.histograms)) {
      const sorted = [...h.observations].sort((a, b) => a - b);
      lines.push(`# HELP ${PREFIX}_${name} ${HISTOGRAM_HELP[name] || ''}`);
      lines.push(`# TYPE ${PREFIX}_${name} histogram`);
      let idx = 0;
      for (const b of HistogramBuckets) {
        while (idx < sorted.length && sorted[idx] <= b) idx++;
        lines.push(`${PREFIX}_${name}_bucket{le="${b}"} ${idx}`);
      }
      const sum = sorted.reduce((a, b2) => a + b2, 0);
      lines.push(
        `${PREFIX}_${name}_bucket{le="+Inf"} ${sorted.length}`
      );
      lines.push(`${PREFIX}_${name}_sum ${sum}`);
      lines.push(`${PREFIX}_${name}_count ${sorted.length}`);
    }

    return lines.join('\n');
  },
};
