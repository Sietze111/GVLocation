import { Type } from '@sinclair/typebox';
import {
  errorResponseSchema,
  crsQuerySchema,
  formatQuerySchema,
  tileParamsSchema,
} from './map.js';

export const complexTileSchema = {
  tags: ['tiles'],
  params: tileParamsSchema,
  querystring: Type.Object({
    geojson: Type.Optional(
      Type.String({
        description:
          'URL-encoded GeoJSON geometry (Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon)',
      })
    ),
    achtergrond: Type.Optional(
      Type.Union(
        [Type.Literal('osm'), Type.Literal('luchtfoto'), Type.Literal('pdok')],
        { default: 'osm', description: 'Background tile source' }
      )
    ),
    kleur: Type.Optional(
      Type.String({
        default: 'red',
        description: 'CSS color for the overlay',
      })
    ),
    crs: crsQuerySchema,
    format: formatQuerySchema,
  }),
  response: {
    200: {
      type: 'string' as const,
    },
    400: errorResponseSchema,
    429: errorResponseSchema,
  },
};
