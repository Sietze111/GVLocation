import { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'crypto';
import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import { isTileError, isValidationError } from '../utils/error.js';
import { sendError } from '../utils/errorEnvelope.js';
import { metrics } from './metrics.js';

const MIME_TYPES: Record<OutputFormat, string> = {
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const etagFromBuffer = (buffer: Buffer): string => {
  const hash = createHash('sha1').update(buffer).digest('base64');
  return `"${hash}"`;
};

export const responseService = {
  handleError(error: unknown, reply: FastifyReply) {
    if (reply.sent) return;

    if (isValidationError(error)) {
      metrics.increment('validation_errors_total');
      return sendError(
        reply,
        400,
        error.code,
        error.message
      );
    }

    if (isTileError(error)) {
      return sendError(reply, error.statusCode, error.code, error.message);
    }

    return sendError(reply, 500, 'INTERNAL_ERROR', 'Internal server error');
  },

  sendImage(
    buffer: Buffer,
    reply: FastifyReply,
    request: FastifyRequest,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT
  ) {
    const etag = etagFromBuffer(buffer);
    const ifNoneMatch = request.headers['if-none-match'];

    if (ifNoneMatch && ifNoneMatch === etag) {
      return reply
        .code(304)
        .header('ETag', etag)
        .header('Cache-Control', MAP_CONSTANTS.CACHE_CONTROL)
        .header('Vary', 'Accept')
        .send();
    }

    return reply
      .type(MIME_TYPES[format])
      .header('ETag', etag)
      .header('Cache-Control', MAP_CONSTANTS.CACHE_CONTROL)
      .header('Vary', 'Accept')
      .send(buffer);
  },
};
