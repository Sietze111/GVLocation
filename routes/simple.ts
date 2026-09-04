import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { MAP_CONSTANTS } from '../constants/map.js';
import { tileSchema } from '../types/map.js';
import { responseService } from '../services/responseService.js';
import { tileService } from '../services/tileService.js';
import { imageService } from '../services/imageService.js';
import { validateRdCoords, validateZ } from '../utils/validateRD.js';

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/simple/:z/:x/:y',
    { schema: tileSchema },
    async (request, reply) => {
      try {
        const { z, x, y } = request.params;

        validateZ(z);
        const { x: parsedX, y: parsedY } = validateRdCoords(x, y);

        const {
          tileBuffer,
          pixelCoords: { x: pixelX, y: pixelY },
        } = await tileService.calculateTileData(parsedX, parsedY, z);

        const overlayedImageBuffer = await imageService.createMarkerOverlay(
          tileBuffer,
          pixelX,
          pixelY,
          MAP_CONSTANTS.MARKER_RADIUS,
          MAP_CONSTANTS.OSM_ATTRIBUTION
        );

        return responseService.sendImage(overlayedImageBuffer, reply);
      } catch (error) {
        request.log.error(error);
        return responseService.handleError(error, reply);
      }
    }
  );
};

export default plugin;
