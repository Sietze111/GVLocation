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
  summary: 'Single location marker',
  description: `Renders a 256x256 map tile with a red location marker.

### RD coordinates, default PNG
\`\`\`
GET /tiles/marker/18/153895,01042669/473352,618162258
\`\`\`

### RD coordinates, WebP
\`\`\`
GET /tiles/marker/18/153895.01042669/473352.618162258?format=webp
\`\`\`

### WGS84 (lon/lat), default PNG
\`\`\`
GET /tiles/marker/18/5.37112/52.2482?crs=wgs84
\`\`\`

### WGS84, AVIF
\`\`\`
GET /tiles/marker/18/5.37112/52.2482?crs=wgs84&format=avif
\`\`\`

For many locations at once, use \`POST /tiles/batch\` instead.

**Attribution:** the map data requires attribution, returned in the \`X-Attribution\` response header (\`© OpenStreetMap\`), so you can render it in your own UI. It is intentionally not baked into the image pixels.`,
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
