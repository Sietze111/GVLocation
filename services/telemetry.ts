import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  type Counter,
  type Histogram,
  metrics as apiMetrics,
} from '@opentelemetry/api';
import { MAP_CONSTANTS } from '../constants/map.js';

/**
 * OpenTelemetry integration: emits OTLP traces (HTTP server + tile-fetch
 * client) and metrics so GVLocation feeds the same Grafana stack as the
 * other apps.
 *
 * Configuration comes from the standard OTEL_* environment variables:
 *   OTEL_ENABLED                        (default "true")
 *   OTEL_SERVICE_NAME                   (default "gvlocation")
 *   OTEL_EXPORTER_OTLP_ENDPOINT         (base endpoint, e.g. http://collector:4318)
 *   OTEL_EXPORTER_OTLP_TRACES_ENDPOINT  (optional per-signal override)
 *   OTEL_EXPORTER_OTLP_METRICS_ENDPOINT (optional per-signal override)
 *   OTEL_EXPORTER_OTLP_PROTOCOL         (default "http/protobuf")
 *   OTEL_METRIC_EXPORT_INTERVAL_MS      (default 60000)
 */

const GLOBAL_TELEMETRY_KEY = '__gvlocation_telemetry__';
const GLOBAL_INSTRUMENTS_KEY = '__gvlocation_otel_instruments__';

export interface OtelInstruments {
  requestsTotal: Counter;
  errorsTotal: Counter;
  validationErrorsTotal: Counter;
  cacheHitsTotal: Counter;
  cacheMissesTotal: Counter;
  tilesFetchedTotal: Counter;
  batchItemsSuccessTotal: Counter;
  batchItemsFailedTotal: Counter;
  requestDurationMs: Histogram;
  tileFetchDurationMs: Histogram;
}

/**
 * Resolve the OTel instruments from globalThis so the shared object survives
 * any module double-evaluation (same singleton strategy as metrics/tileCache).
 */
export function getOtelInstruments(): OtelInstruments | undefined {
  return (globalThis as any)[GLOBAL_INSTRUMENTS_KEY] as
    | OtelInstruments
    | undefined;
}

const isEnabled = (): boolean => process.env.OTEL_ENABLED !== 'false';

const serviceName = process.env.OTEL_SERVICE_NAME || 'gvlocation';

const initInstruments = (): void => {
  const meter = apiMetrics.getMeter(
    MAP_CONSTANTS.METRICS_PREFIX,
    '1.0.0'
  );

  const instruments: OtelInstruments = {
    requestsTotal: meter.createCounter('gvlocation_requests_total', {
      description: 'Total HTTP requests received.',
    }),
    errorsTotal: meter.createCounter('gvlocation_errors_total', {
      description: 'Total HTTP 5xx errors.',
    }),
    validationErrorsTotal: meter.createCounter(
      'gvlocation_validation_errors_total',
      { description: 'Total HTTP 400 validation errors.' }
    ),
    cacheHitsTotal: meter.createCounter('gvlocation_cache_hits_total', {
      description: 'Total tile cache hits.',
    }),
    cacheMissesTotal: meter.createCounter('gvlocation_cache_misses_total', {
      description: 'Total tile cache misses.',
    }),
    tilesFetchedTotal: meter.createCounter('gvlocation_tiles_fetched_total', {
      description: 'Total external map tiles fetched from upstream providers.',
    }),
    batchItemsSuccessTotal: meter.createCounter(
      'gvlocation_batch_items_success_total',
      { description: 'Total batch items successfully rendered.' }
    ),
    batchItemsFailedTotal: meter.createCounter(
      'gvlocation_batch_items_failed_total',
      { description: 'Total batch items that failed.' }
    ),
    requestDurationMs: meter.createHistogram('gvlocation_request_duration_ms', {
      description: 'HTTP request duration in milliseconds.',
      unit: 'ms',
    }),
    tileFetchDurationMs: meter.createHistogram(
      'gvlocation_tile_fetch_duration_ms',
      {
        description: 'External tile fetch duration in milliseconds.',
        unit: 'ms',
      }
    ),
  };

  (globalThis as any)[GLOBAL_INSTRUMENTS_KEY] = instruments;
};

export interface Telemetry {
  shutdown: () => Promise<void>;
}

/**
 * Start the OpenTelemetry SDK. Must be called once, before the Fastify app
 * and axios are loaded, so the HTTP/Fastify instrumentation can hook them.
 * Idempotent and safe to call even without a collector reachable.
 */
export function startTelemetry(): Telemetry {
  const existing = (globalThis as any)[GLOBAL_TELEMETRY_KEY] as
    | Telemetry
    | undefined;
  if (existing) return existing;

  let sdk: NodeSDK | null = null;

  if (isEnabled()) {
    const resource = defaultResource().merge(
      resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
      })
    );

    try {
      sdk = new NodeSDK({
        resource,
        traceExporter: new OTLPTraceExporter(),
        metricReaders: [
          new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter(),
            exportIntervalMillis:
              Number(process.env.OTEL_METRIC_EXPORT_INTERVAL_MS) || 60000,
          }),
        ],
        instrumentations: [
          new HttpInstrumentation({
            ignoreIncomingRequestHook: (request) => {
              const url = (request as any).url || '';
              return url === '/metrics' || url === '/documentation';
            },
          }),
          new FastifyInstrumentation(),
        ],
      });
      sdk.start();
    } catch (err) {
      // SDK start failing is non-fatal: the app should still serve traffic.
      console.error(
        '[telemetry] failed to start OpenTelemetry SDK',
        err
      );
      sdk = null;
    }

    if (sdk) initInstruments();
  }

  const instance: Telemetry = {
    shutdown: async () => {
      if (sdk) await sdk.shutdown();
    },
  };
  (globalThis as any)[GLOBAL_TELEMETRY_KEY] = instance;

  process.on('beforeExit', () => {
    instance.shutdown();
  });

  return instance;
}
