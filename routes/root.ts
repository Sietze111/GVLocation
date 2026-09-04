import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { MAP_CONSTANTS } from '../constants/map.js';
import { tileCache } from '../services/tileCache.js';

const startTime = Date.now();

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Server health check',
        description: `Returns server status, uptime and cache statistics. Use as the Azure health probe endpoint.`,
        response: {
          200: Type.Object({
            status: Type.String(),
            uptime: Type.Number(),
            zoom: Type.Object({
              min: Type.Number(),
              max: Type.Number(),
            }),
            cache: Type.Object({
              size: Type.Number(),
              hitRate: Type.Number(),
            }),
          }),
        },
      },
    },
    () => {
      const stats = tileCache.getStats();
      return {
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        zoom: {
          min: MAP_CONSTANTS.MIN_ZOOM,
          max: MAP_CONSTANTS.MAX_ZOOM,
        },
        cache: {
          size: stats.size,
          hitRate: stats.hitRate,
        },
      };
    }
  );
};

export default plugin;
