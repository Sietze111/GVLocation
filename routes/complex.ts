import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  TILE_CONSTANTS,
  TILE_URL_MAPPING,
  TileKey,
} from '../constants/tileMap';
import { imageService } from '../services/imageService';
import { overlayService } from '../services/overlayService';
import { responseService } from '../services/responseService';
import { tileCoordinateService } from '../services/tileCoordinateService';
import { tileService } from '../services/tileService';
import { complexTileSchema } from '../types/complexMap';
import { validateRdCoords, validateZ } from '../utils/validateRD';

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/:z/:x/:y',
    { schema: complexTileSchema },
    async (request, reply) => {
      try {
        const { z, x, y } = request.params;
        const {
          geojson,
          achtergrond,
          kleur = TILE_CONSTANTS.DEFAULT_COLOR,
        } = request.query;

        // Validate and parse coordinates
        const { x: parsedX, y: parsedY } = validateRdCoords(x, y);
        validateZ(z);

        const tileBaseUrl =
          TILE_URL_MAPPING[
            (achtergrond ?? TILE_CONSTANTS.DEFAULT_TILE_KEY) as TileKey
          ];

        const {
          z: adjustedZ,
          tileX,
          tileY,
          bbox,
          pixelCoords,
        } = await tileCoordinateService.calculateTileData(
          parsedX,
          parsedY,
          z,
          geojson
        );

        const [tiles, overlayedImageBuffer] = await Promise.all([
          tileService.fetchTiles(
            tileBaseUrl,
            adjustedZ,
            tileX,
            tileY,
            pixelCoords.x,
            pixelCoords.y
          ),
          overlayService.createOverlay(
            geojson,
            achtergrond,
            kleur,
            bbox,
            pixelCoords
          ),
        ]);

        const compositeImageBuffer = await imageService.createCompositeImage(
          tiles,
          overlayedImageBuffer
        );

        return responseService.sendImage(compositeImageBuffer, reply);
      } catch (error) {
        return responseService.handleError(error, reply);
      }
    }
  );
};

export default plugin;
