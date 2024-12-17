import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

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
};

export default plugin;
