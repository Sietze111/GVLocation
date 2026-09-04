import { FastifyReply } from 'fastify';
import { TileError } from '../types/errors.js';
import { metrics } from '../services/metrics.js';

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export const toEnvelope = (code: string, message: string): ErrorEnvelope => ({
  error: { code, message },
});

export const sendError = (
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string
): FastifyReply => {
  if (statusCode >= 500) metrics.increment('errors_total');
  return reply.code(statusCode).send(toEnvelope(code, message));
};

export const errorFromUnknown = (error: unknown): ErrorEnvelope => {
  if (error instanceof TileError) {
    return toEnvelope(error.code, error.message);
  }
  return toEnvelope('INTERNAL_ERROR', 'Internal server error');
};
