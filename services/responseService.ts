import { FastifyReply } from 'fastify';
import { isTileError, isValidationError } from '../utils/error';

export const responseService = {
  handleError(error: unknown, reply: FastifyReply) {
    if (isValidationError(error)) {
      return reply.code(400).send({ error: error.message });
    }

    if (isTileError(error)) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    return reply.code(500).send({ error: 'Internal server error' });
  },

  sendImage(buffer: Buffer, reply: FastifyReply) {
    return reply.type('image/png').send(buffer);
  },
};
