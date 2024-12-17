import {
  FastifyError,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { TileError, ValidationError } from '../types/errors';

const error: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) => {
  fastify.addHook(
    'onError',
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      error: FastifyError
    ) => {
      // Log the error
      console.error('Error:', error);

      // Send a generic error response
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  );
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isTileError = (error: unknown): error is TileError => {
  return error instanceof TileError;
};

export default error;
