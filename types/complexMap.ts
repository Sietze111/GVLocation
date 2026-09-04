import { Type } from '@sinclair/typebox';
import {
  errorResponseSchema,
  crsQuerySchema,
  formatQuerySchema,
  tileParamsSchema,
} from './map.js';

export const complexTileSchema = {
  tags: ['tiles'],
  summary: 'Location with GeoJSON overlay',
  description: `Renders a 256x256 map tile with a GeoJSON geometry drawn over it. Supported geometry types: **Point**, **MultiPoint**, **LineString**, **MultiLineString**, **Polygon**, **MultiPolygon**. The geometry is auto-fit: if it doesn't fit at the requested zoom, the zoom is reduced (see the \`X-Adjusted-Zoom\` response header).

**Attribution:** the underlying map data requires attribution. It is returned in the \`X-Attribution\` response header (e.g. \`© OpenStreetMap\` for \`achtergrond=osm\`, \`© PDOK\` for \`achtergrond=luchtfoto|pdok\`) so you can render it in your own UI. It is intentionally not baked into the image pixels.

> **Note:** the \`geojson\` \`coordinates\` are always in **WGS84 (lon/lat)**, regardless of the \`crs\` of the \`x\`/\`y\` path coordinates. Use small, local geometries so they render at the requested zoom.

### Simple point marker (blue dot on OSM). The RD point (153895, 473352) is WGS84 5.371023, 52.248213.
\`\`\`
GET /tiles/overlay/18/153895,01042669/473352,618162258?kleur=blue&geojson=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B5.371023%2C52.248213%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{ "type": "Point", "coordinates": [5.371023, 52.248213] }
\`\`\`

### Polygon (≈40m × 40m parcel boundary) in blue on PDOK aerial imagery
\`\`\`
GET /tiles/overlay/17/153895,01042669/473352,618162258?kleur=blue&achtergrond=luchtfoto&geojson=%7B%22type%22%3A%22Polygon%22%2C%22coordinates%22%3A%5B%5B%5B5.371023%2C52.248213%5D%2C%5B5.371243%2C52.248214%5D%2C%5B5.371243%2C52.248330%5D%2C%5B5.371023%2C52.248330%5D%2C%5B5.371023%2C52.248213%5D%5D%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{
  "type": "Polygon",
  "coordinates": [
    [
      [5.371023, 52.248213],
      [5.371243, 52.248214],
      [5.371243, 52.248330],
      [5.371023, 52.248330],
      [5.371023, 52.248213]
    ]
  ]
}
\`\`\`

### LineString (short road/canal) in green, WGS84 center, WebP output
\`\`\`
GET /tiles/overlay/15/5.371023/52.248213?crs=wgs84&format=webp&kleur=green&geojson=%7B%22type%22%3A%22LineString%22%2C%22coordinates%22%3A%5B%5B5.3708%2C52.2481%5D%2C%5B5.3712%2C52.2482%5D%2C%5B5.3716%2C52.2483%5D%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{
  "type": "LineString",
  "coordinates": [
    [5.3708, 52.2481],
    [5.3712, 52.2482],
    [5.3716, 52.2483]
  ]
}
\`\`\`

Without \`geojson\` this endpoint behaves like \`GET /tiles/marker\`.`,
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
