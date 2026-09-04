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
import { tileCache } from '../services/tileCache.js';
import { batchSchema } from '../types/batch.js';
import { ValidationError } from '../types/errors.js';
import {
  validateRdCoords,
  validateZ,
  validateColor,
} from '../utils/validateRD.js';

interface BatchItem {
  z: number;
  x: string;
  y: string;
  geojson?: string;
  achtergrond?: string;
  kleur?: string;
}

async function processSingleItem(item: BatchItem, index: number) {
  const { z, x, y, geojson: geojsonString, achtergrond, kleur } = item;
  const color = kleur || MAP_CONSTANTS.DEFAULT_COLOR;

  validateZ(z);
  const { x: parsedX, y: parsedY } = validateRdCoords(x, y);
  validateColor(color);

  let parsedGeoJSON: { type: string; coordinates: unknown } | undefined;
  if (geojsonString) {
    try {
      parsedGeoJSON = JSON.parse(geojsonString) as {
        type: string;
        coordinates: unknown;
      };
    } catch {
      throw new ValidationError('Invalid GeoJSON: could not parse JSON');
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

  const { z: adjustedZ, tileX, tileY, bbox, pixelCoords } =
    await tileCoordinateService.calculateTileData(
      parsedX,
      parsedY,
      z,
      parsedGeoJSON
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
      achtergrond,
      color,
      bbox,
      pixelCoords
    ),
  ]);

  const compositeImageBuffer = await imageService.createCompositeImage(
    tiles,
    overlayedImageBuffer
  );

  return {
    index,
    image: compositeImageBuffer.toString('base64'),
    adjustedZoom: adjustedZ !== z ? adjustedZ : undefined,
  };
}

function processInBatches<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<any>,
  concurrency: number
): Promise<any[]> {
  const results: any[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        results[i] = { success: true, ...(await fn(items[i], i)) };
      } catch (error) {
        results[i] = {
          success: false,
          index: i,
          error:
            error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  return Promise.all(workers).then(() => results);
}

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.post(
    '/batch',
    { schema: batchSchema },
    async (request, reply) => {
      const { items } = request.body;
      const cacheBefore = tileCache.getStats();

      const rawResults = await processInBatches(
        items,
        processSingleItem,
        MAP_CONSTANTS.BATCH_CONCURRENCY
      );

      const results = rawResults.map((r: any) =>
        r.success
          ? { index: r.index, image: r.image, adjustedZoom: r.adjustedZoom }
          : { index: r.index, image: '', adjustedZoom: undefined, error: r.error }
      );

      const successCount = rawResults.filter((r: any) => r.success).length;
      const cacheAfter = tileCache.getStats();

      return reply.send({
        results,
        stats: {
          total: items.length,
          success: successCount,
          failed: items.length - successCount,
          cacheStats: {
            size: cacheAfter.size,
            hitRate: cacheAfter.hitRate,
          },
        },
      });
    }
  );
};

export default plugin;
