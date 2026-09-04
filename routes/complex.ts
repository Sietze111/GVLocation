import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  MAP_CONSTANTS,
  TILE_URL_MAPPING,
  TileKey,
} from '../constants/map.js';
import { imageService } from '../services/imageService.js';
import { overlayService } from '../services/overlayService.js';
import { responseService } from '../services/responseService.js';
import { tileCoordinateService } from '../services/tileCoordinateService.js';
import { tileService } from '../services/tileService.js';
import { complexTileSchema } from '../types/complexMap.js';
import { ValidationError } from '../types/errors.js';
import {
  validateCoordinates,
  validateZ,
  validateColor,
  parseCrs,
  resolveFormat,
} from '../utils/validateRD.js';
import { overlayConfigService } from '../services/overlayConfigService.js';

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/tiles/overlay/:z/:x/:y',
    { schema: complexTileSchema },
    async (request, reply) => {
      try {
        const { z, x, y } = request.params;
        const {
          geojson: geojsonString,
          achtergrond,
          kleur = MAP_CONSTANTS.DEFAULT_COLOR,
          crs = 'rd',
          format,
        } = request.query;

        const crsType = parseCrs(crs);
        const outputFormat = resolveFormat(
          format,
          request.headers.accept
        );
        const { x: parsedX, y: parsedY } = validateCoordinates(
          x,
          y,
          crsType
        );
        validateZ(z);
        validateColor(kleur);

        let parsedGeoJSON:
          | { type: string; coordinates: unknown }
          | undefined;
        if (geojsonString) {
          try {
            parsedGeoJSON = JSON.parse(geojsonString) as {
              type: string;
              coordinates: unknown;
            };
          } catch {
            throw new ValidationError(
              'Invalid GeoJSON: could not parse JSON'
            );
          }
          if (!parsedGeoJSON.type || !parsedGeoJSON.coordinates) {
            throw new ValidationError(
              'Invalid GeoJSON: must have "type" and "coordinates" fields'
            );
          }
        }

        const tileBaseUrl =
          TILE_URL_MAPPING[
            (achtergrond ?? MAP_CONSTANTS.DEFAULT_TILE_KEY) as TileKey
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
          parsedGeoJSON,
          crsType
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
            parsedGeoJSON,
            kleur,
            bbox,
            pixelCoords,
            outputFormat
          ),
        ]);

        const compositeImageBuffer = await imageService.createCompositeImage(
          tiles,
          overlayedImageBuffer,
          outputFormat
        );

        if (adjustedZ !== z) {
          reply.header('X-Adjusted-Zoom', adjustedZ);
        }

        const attribution = overlayConfigService.getAttribution(achtergrond);

        return responseService.sendImage(
          compositeImageBuffer,
          reply,
          request,
          outputFormat,
          attribution
        );
      } catch (error) {
        request.log.error(error);
        return responseService.handleError(error, reply);
      }
    }
  );
};

export default plugin;
