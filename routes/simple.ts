import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// constants
import { MAP_CONSTANTS } from '../constants/map';

// types
import { tileSchema } from '../types/map';

// services
import { responseService } from '../services/responseService';
import { tileService } from '../services/tileService';

// utils
import { createMarkerOverlay } from '../utils/overlay';
import { validateRdCoords, validateZ } from '../utils/validateRD';

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

        const overlayedImageBuffer = await createMarkerOverlay(
          tileBuffer,
          pixelX,
          pixelY,
          MAP_CONSTANTS.MARKER_RADIUS,
          MAP_CONSTANTS.ATTRIBUTION
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
