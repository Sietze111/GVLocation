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

### Simple point marker (blue dot on OSM)
\`\`\`
GET /tiles/overlay/18/153895,01042669/473352,618162258?kleur=blue&geojson=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B153895.01042669%2C473352.618162258%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{ "type": "Point", "coordinates": [153895.01042669, 473352.618162258] }
\`\`\`

### Polygon (parcel boundary) in blue on PDOK aerial imagery
\`\`\`
GET /tiles/overlay/17/154000,5/473400,2?kleur=blue&achtergrond=luchtfoto&geojson=%7B%22type%22%3A%22Polygon%22%2C%22coordinates%22%3A%5B%5B%5B153895%2C473352%5D%2C%5B153900%2C473352%5D%2C%5B153900%2C473357%5D%2C%5B153895%2C473357%5D%2C%5B153895%2C473352%5D%5D%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{
  "type": "Polygon",
  "coordinates": [
    [
      [153895, 473352],
      [153900, 473352],
      [153900, 473357],
      [153895, 473357],
      [153895, 473352]
    ]
  ]
}
\`\`\`

### LineString (road/canal) in green, WGS84 coordinates, WebP output
\`\`\`
GET /tiles/overlay/15/5.37112/52.2482?crs=wgs84&format=webp&kleur=green&geojson=%7B%22type%22%3A%22LineString%22%2C%22coordinates%22%3A%5B%5B5.37%2C52.24%5D%2C%5B5.38%2C52.25%5D%2C%5B5.39%2C52.26%5D%5D%7D
\`\`\`

**Raw GeoJSON:**
\`\`\`json
{
  "type": "LineString",
  "coordinates": [
    [5.37, 52.24],
    [5.38, 52.25],
    [5.39, 52.26]
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
