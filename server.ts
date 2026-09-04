import { startTelemetry } from './services/telemetry.js';

// Initialise OpenTelemetry before the Fastify app and axios are loaded so the
// HTTP/Fastify instrumentation can hook them, and business metrics are wired
// to OTLP from the first request.
const telemetry = startTelemetry();

const { build } = await import('./app.js');

const PORT = Number(process.env.PORT) || 3000;
const server = build();

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
for (const signal of signals) {
  process.on(signal, async () => {
    server.log.info({ signal }, 'Received signal, shutting down gracefully');
    await server.close();
    await telemetry.shutdown();
    process.exit(0);
  });
}

start();
