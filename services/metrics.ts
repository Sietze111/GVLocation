import { MAP_CONSTANTS } from '../constants/map.js';
import {
  getOtelInstruments,
  type OtelInstruments,
} from './telemetry.js';

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

type OtelCounterKeys =
  | 'requestsTotal'
  | 'errorsTotal'
  | 'validationErrorsTotal'
  | 'cacheHitsTotal'
  | 'cacheMissesTotal'
  | 'tilesFetchedTotal'
  | 'batchItemsSuccessTotal'
  | 'batchItemsFailedTotal';

const OTEL_COUNTER: Record<string, OtelCounterKeys> = {
  requests_total: 'requestsTotal',
  errors_total: 'errorsTotal',
  validation_errors_total: 'validationErrorsTotal',
  cache_hits_total: 'cacheHitsTotal',
  cache_misses_total: 'cacheMissesTotal',
  tiles_fetched_total: 'tilesFetchedTotal',
  batch_items_success_total: 'batchItemsSuccessTotal',
  batch_items_failed_total: 'batchItemsFailedTotal',
};

const OTEL_HISTOGRAM: Record<
  string,
  'requestDurationMs' | 'tileFetchDurationMs'
> = {
  request_duration_ms: 'requestDurationMs',
  tile_fetch_duration_ms: 'tileFetchDurationMs',
};

export const metrics = {
  increment(name: string) {
    if (name in state.counters) state.counters[name] += 1;
    const inst = OTEL_COUNTER[name];
    const otel = inst ? getOtelInstruments() : undefined;
    if (otel) otel[inst].add(1);
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
    const inst = OTEL_HISTOGRAM[name];
    const otel = inst ? getOtelInstruments() : undefined;
    if (otel) otel[inst].record(value);
  },

  setCacheStats(hits: number, misses: number) {
    const prevHits = state.counters.cache_hits_total;
    const prevMisses = state.counters.cache_misses_total;

    // Deltas into the OTel counters (true monotonic "total" semantics).
    const hitDelta = Math.max(0, hits - prevHits);
    const missDelta = Math.max(0, misses - prevMisses);
    const otel = getOtelInstruments();
    if (otel) {
      if (hitDelta > 0) otel.cacheHitsTotal.add(hitDelta);
      if (missDelta > 0) otel.cacheMissesTotal.add(missDelta);
    }

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
