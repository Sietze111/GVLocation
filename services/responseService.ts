import { FastifyReply } from 'fastify';
import { isTileError, isValidationError } from '../utils/error.js';

export const responseService = {
  handleError(error: unknown, reply: FastifyReply) {
    if (reply.sent) return;

    if (isValidationError(error)) {
      return reply.code(400).send({ error: error.message });
    }

    if (isTileError(error)) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    return reply.code(500).send({ error: 'Internal server error' });
  },

  sendImage(buffer: Buffer, reply: FastifyReply, cacheControl?: string) {
    return reply
      .type('image/png')
      .header('Cache-Control', cacheControl || 'public, max-age=86400')
      .send(buffer);
  },
};
