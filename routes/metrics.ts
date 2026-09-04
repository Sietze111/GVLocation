import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { metrics } from '../services/metrics.js';

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/metrics',
    {
      schema: {
        tags: ['system'],
        summary: 'Prometheus metrics',
        description:
          'Prometheus-formatted metrics (traffic, cache, tile fetches, latency).',
        response: {
          200: { type: 'string' as const },
        },
      },
    },
    async (_request, reply) => {
      return reply
        .type('text/plain; version=0.0.4; charset=utf-8')
        .header('Cache-Control', 'no-store')
        .send(metrics.export());
    }
  );
};

export default plugin;
