import { Type } from '@sinclair/typebox';

export interface Coordinates {
  x: number;
  y: number;
}

export interface WGS84Coordinates {
  longitude: number;
  latitude: number;
}

export interface TileCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface PixelCoordinates {
  x: number;
  y: number;
}

export const errorResponseSchema = Type.Object(
  {
    error: Type.Object({
      code: Type.String(),
      message: Type.String(),
    }),
  },
  { description: 'Standard error envelope' }
);

export const tileParamsSchema = Type.Object({
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
});

export const crsQuerySchema = Type.Optional(
  Type.Union(
    [Type.Literal('rd'), Type.Literal('wgs84')],
    { default: 'rd', description: 'Coordinate system for x/y' }
  )
);

export const formatQuerySchema = Type.Optional(
  Type.Union(
    [Type.Literal('png'), Type.Literal('webp'), Type.Literal('avif')],
    { default: 'png', description: 'Output image format' }
  )
);

export const tileSchema = {
  tags: ['tiles'],
  params: tileParamsSchema,
  querystring: Type.Object({
    crs: crsQuerySchema,
    format: formatQuerySchema,
  }),
  response: {
    200: Type.String(),
    400: errorResponseSchema,
    429: errorResponseSchema,
  },
};
