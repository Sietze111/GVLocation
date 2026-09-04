import { build } from './app.js';

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
    process.exit(0);
  });
}

start();
