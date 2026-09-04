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
import { sendError } from './utils/errorEnvelope.js';
import { metrics } from './services/metrics.js';
import { tileCache } from './services/tileCache.js';

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
      errorResponseBuilder: (req, context) => {
        return {
          statusCode: context.statusCode,
          error: {
            code: 'RATE_LIMITED',
            message:
              'Rate limit exceeded. Retry after the window resets.',
          },
        };
      },
    });
  }

  server.setErrorHandler((error, request, reply) => {
    if (reply.sent) return;

    request.log.error(error);

    const statusCode =
      (error as any).statusCode ||
      (error as any).status ||
      (error as any).status || 500;

    if (statusCode === 429) {
      metrics.increment('errors_total');
      return sendError(
        reply,
        429,
        'RATE_LIMITED',
        'Rate limit exceeded. Please retry later.'
      );
    }

    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return sendError(
        reply,
        statusCode,
        'BAD_REQUEST',
        (error as Error).message || 'Bad request'
      );
    }

    return sendError(reply, 500, 'INTERNAL_ERROR', 'Internal server error');
  });

  server.addHook('onResponse', async (request, reply) => {
    metrics.increment('requests_total');
    metrics.observe('request_duration_ms', reply.elapsedTime);
    const stats = tileCache.getStats();
    metrics.setCacheStats(stats.hits, stats.misses);
  });

  if (!isProduction) {
    server.register(Swagger, {
      openapi: {
        info: {
          title: 'GVLocation API',
          description:
            'Generates 256x256 map tiles from Dutch RD or WGS84 coordinates with optional GeoJSON overlays. Marker, overlay, and batch endpoints.',
          version: '1.0.0',
        },
        tags: [
          { name: 'tiles', description: 'Image tile generation' },
          { name: 'system', description: 'Health, metrics and info' },
        ],
      },
    });
    server.register(SwaggerUI, {
      routePrefix: '/documentation',
    });
  }

  server.register(error);
  server.register(AutoLoad, {
    dir: `${__dirname}/routes`,
  });

  return server;
}
