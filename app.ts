import AutoLoad from '@fastify/autoload';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import error from './utils/error';

export function build() {
  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);

  const server = Fastify({ logger: true });

  server.register(Swagger);
  server.register(SwaggerUI);
  server.register(error);
  server.register(AutoLoad, {
    dir: `${__dirname}/routes`,
  });

  return server;
}
