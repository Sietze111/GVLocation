import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { MAP_CONSTANTS } from '../constants/map.js';
import { tileSchema } from '../types/map.js';
import { responseService } from '../services/responseService.js';
import { tileService } from '../services/tileService.js';
import { imageService } from '../services/imageService.js';
import {
  validateCoordinates,
  validateZ,
  parseCrs,
  resolveFormat,
} from '../utils/validateRD.js';

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/tiles/marker/:z/:x/:y',
    { schema: tileSchema },
    async (request, reply) => {
      try {
        const { z, x, y } = request.params;
        const { crs, format } = request.query;
        const crsType = parseCrs(crs);
        const outputFormat = resolveFormat(
          format,
          request.headers.accept
        );

        validateZ(z);
        const { x: parsedX, y: parsedY } = validateCoordinates(
          x,
          y,
          crsType
        );

        const {
          tileBuffer,
          pixelCoords: { x: pixelX, y: pixelY },
        } = await tileService.calculateTileData(parsedX, parsedY, z, crsType);

        const overlayedImageBuffer = await imageService.createMarkerOverlay(
          tileBuffer,
          pixelX,
          pixelY,
          5,
          outputFormat
        );

        return responseService.sendImage(
          overlayedImageBuffer,
          reply,
          request,
          outputFormat,
          MAP_CONSTANTS.OSM_ATTRIBUTION
        );
      } catch (error) {
        request.log.error(error);
        return responseService.handleError(error, reply);
      }
    }
  );
};

export default plugin;
