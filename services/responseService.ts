import { FastifyReply } from 'fastify';
import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import { isTileError, isValidationError } from '../utils/error.js';

const MIME_TYPES: Record<OutputFormat, string> = {
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

// Cache-Control differs per format: consumers must vary on Accept.
const CACHE_CONTROL_BY_FORMAT: Record<OutputFormat, string> = {
  png: 'public, max-age=86400',
  webp: 'public, max-age=86400',
  avif: 'public, max-age=86400',
};

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

  sendImage(
    buffer: Buffer,
    reply: FastifyReply,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT
  ) {
    return reply
      .type(MIME_TYPES[format])
      .header('Cache-Control', CACHE_CONTROL_BY_FORMAT[format])
      .send(buffer);
  },
};
