import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import { TileError, ValidationError } from '../types/errors.js';

const error: FastifyPluginAsync = async (
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) => {
  fastify.addHook(
    'onError',
    async (
      request: FastifyRequest,
      _reply: FastifyReply,
      err: Error
    ) => {
      request.log.error({ err }, 'Unhandled error');
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
