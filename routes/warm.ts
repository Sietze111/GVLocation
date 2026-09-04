import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  MAP_CONSTANTS,
  TILE_URL_MAPPING,
  TileKey,
} from '../constants/map.js';
import { tileService } from '../services/tileService.js';
import { coordinateService } from '../services/coordinateService.js';
import { tileCache } from '../services/tileCache.js';
import {
  errorResponseSchema,
} from '../types/map.js';
import { parseCrs } from '../utils/validateRD.js';
import type { Crs } from '../utils/validateRD.js';

const warmItemSchema = Type.Object({
  z: Type.Number({ minimum: 8, maximum: 19 }),
  x: Type.String(),
  y: Type.String(),
  crs: Type.Optional(
    Type.Union([Type.Literal('rd'), Type.Literal('wgs84')], {
      default: 'rd',
    })
  ),
  achtergrond: Type.Optional(
    Type.Union(
      [Type.Literal('osm'), Type.Literal('luchtfoto'), Type.Literal('pdok')],
      { default: 'osm' }
    )
  ),
});

interface WarmItem {
  z: number;
  x: string;
  y: string;
  crs?: string;
  achtergrond?: string;
}

const warmSingle = async (item: WarmItem): Promise<number> => {
  const crs: Crs = parseCrs(item.crs);
  const wgs84 = coordinateService.toWgs84(
    {
      x: Number(item.x.replace(',', '.')),
      y: Number(item.y.replace(',', '.')),
    },
    crs
  );
  const coords = { longitude: wgs84.longitude, latitude: wgs84.latitude };
  const tileCoords = tileService.calculateTileCoordinates(coords, item.z);
  const baseUrl =
    TILE_URL_MAPPING[(item.achtergrond ?? 'osm') as TileKey];

  let added = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const url = `${baseUrl}/${item.z}/${tileCoords.x + dx}/${tileCoords.y + dy}.png`;
      if (!tileCache.get(url)) {
        await tileService.fetchSingleTile(url);
        added++;
      }
    }
  }
  return added;
};

const runWithConcurrency = async <T>(
  items: T[],
  fn: (item: T, index: number) => Promise<unknown>,
  concurrency: number
): Promise<void> => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
};

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.post(
    '/tiles/warm',
    {
      schema: {
        tags: ['tiles'],
        summary: 'Pre-fetch tiles into the cache',
        description: `Pre-fetches the underlying map tiles for a list of locations so that a subsequent report run hits a warm cache (much lower latency, near-zero upstream traffic).

### Pre-warm for a 10,000-tree report (split into 10 calls of 1000)
\`\`\`json
{
  "items": [
    { "z": 18, "x": "153895,01042669", "y": "473352,618162258" },
    { "z": 18, "x": "154000,5",        "y": "473400,2" }
  ]
}
\`\`\`

After warming, \`POST /tiles/batch\` with the same items will report \`cacheHit: true\` and \`sourceTileCount: 0\` for every result.`,
        body: Type.Object({
          items: Type.Array(warmItemSchema, {
            minItems: 1,
            maxItems: MAP_CONSTANTS.WARM_MAX_ITEMS,
            description:
              'Coordinates to pre-fetch into the tile cache.',
          }),
        }),
        response: {
          200: Type.Object({
            warmed: Type.Number(),
            cacheSize: Type.Number(),
          }),
          400: errorResponseSchema,
          502: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { items } = request.body;
      let warmed = 0;
      try {
        await runWithConcurrency(
          items,
          async (item) => {
            warmed += await warmSingle(item);
          },
          MAP_CONSTANTS.BATCH_CONCURRENCY
        );
      } catch (error) {
        request.log.error(error);
        return reply
          .code(502)
          .send({
            error: {
              code: 'WARM_FAILED',
              message: 'Failed to warm some tiles from upstream providers',
            },
          });
      }

      return {
        warmed,
        cacheSize: tileCache.getStats().size,
      };
    }
  );
};

export default plugin;
