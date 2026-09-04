import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { MAP_CONSTANTS } from '../constants/map.js';

const startTime = Date.now();

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          name: Type.String({ default: 'world' }),
        }),
        response: {
          200: Type.Object({
            hello: Type.String(),
          }),
        },
      },
    },
    (req) => {
      const { name } = req.query;
      return { hello: name };
    }
  );

  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.String(),
            uptime: Type.Number(),
            zoom: Type.Object({
              min: Type.Number(),
              max: Type.Number(),
            }),
          }),
        },
      },
    },
    () => {
      return {
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        zoom: {
          min: MAP_CONSTANTS.MIN_ZOOM,
          max: MAP_CONSTANTS.MAX_ZOOM,
        },
      };
    }
  );
};

export default plugin;
