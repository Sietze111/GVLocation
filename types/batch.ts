import { Type } from '@sinclair/typebox';

export const batchItemSchema = Type.Object(
  {
    z: Type.Number({
      minimum: 8,
      maximum: 19,
      description: 'Zoom level (8-19)',
    }),
    x: Type.String({
      description:
        'Coordinate (RD easting or WGS84 longitude, depending on crs). Comma/dot decimals allowed.',
    }),
    y: Type.String({
      description:
        'Coordinate (RD northing or WGS84 latitude, depending on crs). Comma/dot decimals allowed.',
    }),
    crs: Type.Optional(
      Type.Union(
        [Type.Literal('rd'), Type.Literal('wgs84')],
        {
          default: 'rd',
          description: 'Coordinate system for x/y',
        }
      )
    ),
    format: Type.Optional(
      Type.Union(
        [Type.Literal('png'), Type.Literal('webp'), Type.Literal('avif')],
        {
          default: 'png',
          description: 'Output image format',
        }
      )
    ),
    geojson: Type.Optional(
      Type.String({
        description:
          'URL-encoded GeoJSON geometry (Point, LineString, Polygon, etc.)',
      })
    ),
    kleur: Type.Optional(
      Type.String({
        default: 'red',
        description: 'CSS color for the overlay',
      })
    ),
    achtergrond: Type.Optional(
      Type.Union(
        [Type.Literal('osm'), Type.Literal('luchtfoto'), Type.Literal('pdok')],
        {
          default: 'osm',
          description: 'Background tile source',
        }
      )
    ),
  },
  { description: 'A single tile render request' }
);

export const errorResponseSchema = Type.Object(
  {
    error: Type.Object({
      code: Type.String(),
      message: Type.String(),
    }),
  },
  { description: 'Standard error envelope' }
);

export const batchSchema = {
  body: Type.Object(
    {
      items: Type.Array(batchItemSchema, {
        minItems: 1,
        maxItems: 100,
        description: 'Up to 100 render requests, processed concurrently.',
      }),
    },
    { description: 'Batch render request body' }
  ),
  response: {
    200: Type.Object(
      {
        results: Type.Array(
          Type.Object({
            index: Type.Number({
              description: 'Position in the request items array',
            }),
            image: Type.String({
              description: 'Base64-encoded image data',
            }),
            format: Type.Optional(
              Type.String({ description: 'Actual output format' })
            ),
            cacheHit: Type.Optional(
              Type.Boolean({
                description:
                  'True if at least one underlying map tile came from cache',
              })
            ),
            sourceTileCount: Type.Optional(
              Type.Number({
                description:
                  'Number of map tiles fetched fresh from the upstream provider',
              })
            ),
            adjustedZoom: Type.Optional(
              Type.Number({
                description: 'Zoom used if reduced to fit the geometry',
              })
            ),
            error: Type.Optional(
              Type.String({
                description: 'Present if this item failed',
              })
            ),
          }),
          { description: 'Per-item render results, in request order' }
        ),
        stats: Type.Object({
          total: Type.Number(),
          success: Type.Number(),
          failed: Type.Number(),
          cacheStats: Type.Object({
            size: Type.Number(),
            hitRate: Type.Number(),
          }),
        }),
      },
      { description: 'Batch render response' }
    ),
    400: errorResponseSchema,
    429: errorResponseSchema,
  },
};
