# GVLocation - Location Image Generation API

This API generates location-based map images with optional GeoJSON overlays and markers. It accepts Dutch RD (Rijksdriehoek) coordinates and returns 256x256 PNG map tiles.

## Quick Start

```bash
npm install
npm start        # Production-like (tsx)
npm run dev      # Development with auto-reload
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Set to `production` to disable Swagger UI |
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Fastify log level |
| `RATE_LIMIT_MAX` | `100` | Max requests per time window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds |
| `CORS_ORIGIN` | `true` | CORS origin configuration |

## Endpoints

### Health Check (`GET /health`)

Returns server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "zoom": { "min": 8, "max": 19 }
}
```

### Simple Location Marker (`GET /simple/:z/:x/:y`)

Generates a map tile with a red marker at the specified coordinates.

**Path Parameters:**
- `z` (number, required) - Zoom level (8-19). Example: `18`
- `x` (string, required) - X coordinate in RD format (0-300000). Supports dot and comma decimal separators. Example: `153895,01042669`
- `y` (string, required) - Y coordinate in RD format (300000-650000). Supports dot and comma decimal separators. Example: `473352,618162258`

**Response:** `image/png` (256x256 PNG with red marker)

**Example:**
```
/simple/18/153895,01042669/473352,618162258
```

### Complex Location Visualization (`GET /:z/:x/:y`)

Generates a map tile with support for GeoJSON overlays and custom styling.

**Path Parameters:** Same as Simple endpoint.

**Query Parameters:**
- `geojson` (string, optional) - GeoJSON geometry string. Supported types: Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon.
- `achtergrond` (string, optional) - Background map type. Options: `osm` (default), `luchtfoto`, `pdok` (both PDOK aerial photography).
- `kleur` (string, optional) - CSS color for the GeoJSON overlay. Default: `red`. Must be a valid CSS color.

**Response:** `image/png` (256x256 PNG with overlays)

**Headers:**
- `X-Adjusted-Zoom` - Present when the zoom level was automatically reduced to fit the GeoJSON geometry.

**Examples:**

Polygon overlay:
```
/18/153895,01042669/473352,618162258?geojson={"type":"Polygon","coordinates":[[[5.37112,52.2482],[5.37100,52.2482],[5.37093,52.2482],[5.37100,52.2481],[5.37112,52.2482]]]}
```

Point with custom color and aerial background:
```
/18/153895,01042669/473352,618162258?geojson={"type":"Point","coordinates":[5.37112,52.2482]}&kleur=blue&achtergrond=luchtfoto
```

Geometry larger than tile (auto-zoom adjustment):
```
/19/154770,468190803/474184,251336475?geojson={"type":"Polygon","coordinates":[...]}
```

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid coordinates, zoom level, GeoJSON, or color value |
| 429 | Rate limit exceeded |
| 500 | Server-side processing error or tile fetch failure |

Error format:
```json
{ "error": "Description of the error" }
```

## Rate Limiting

By default, the API allows 100 requests per minute per IP. Configure via environment variables `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

## License

MIT
