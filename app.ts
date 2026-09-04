import Fastify from 'fastify';
import AutoLoad from '@fastify/autoload';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import RateLimit from '@fastify/rate-limit';
import Cors from '@fastify/cors';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import path from 'path';
import { fileURLToPath } from 'url';
import error from './utils/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

export function build() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    },
    bodyLimit: 10 * 1024 * 1024,
    connectionTimeout: 30000,
    keepAliveTimeout: 30000,
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.register(Cors, {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST'],
  });

  const rateLimitEnabled =
    process.env.RATE_LIMIT_ENABLED !== 'false';
  if (rateLimitEnabled) {
    server.register(RateLimit, {
      max: Number(process.env.RATE_LIMIT_MAX) || 1000,
      timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      keyGenerator: (req) => {
        return (
          (req.headers['x-api-key'] as string) ||
          req.ip ||
          req.socket.remoteAddress ||
          'unknown'
        );
      },
    });
  }

  if (!isProduction) {
    server.register(Swagger);
    server.register(SwaggerUI);
  }

  server.register(error);
  server.register(AutoLoad, {
    dir: `${__dirname}/routes`,
  });

  return server;
}
