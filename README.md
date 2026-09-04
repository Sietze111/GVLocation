# GVLocation - Location Image Generation API

Generates 256x256 PNG map tiles from Dutch RD (Rijksdriehoek) coordinates with optional GeoJSON overlays. Built for high-volume batch processing.

## Quick Start

```bash
npm install
npm start        # Production (tsx)
npm run dev      # Development with auto-reload
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Set to `production` to disable Swagger UI |
| `LOG_LEVEL` | `info` / `debug` | Fastify log level |
| `RATE_LIMIT_ENABLED` | `true` | Set to `false` to disable rate limiting |
| `RATE_LIMIT_MAX` | `1000` | Max requests per time window per key |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `CORS_ORIGIN` | `true` | CORS origin |

## Endpoints

### `GET /health`

Returns server status, uptime, and cache statistics.

### `GET /simple/:z/:x/:y`

Single coordinate tile with red marker.

| Param | Type | Description |
|-------|------|-------------|
| `z` | number | Zoom level (8-19) |
| `x` | string | RD X coordinate (0-300000) |
| `y` | string | RD Y coordinate (300000-650000) |

Supports comma and dot decimal separators (e.g. `153895,01042669` or `153895.01042669`).

### `GET /:z/:x/:y`

Single coordinate tile with GeoJSON overlay.

| Query | Type | Description |
|-------|------|-------------|
| `geojson` | string | GeoJSON geometry (Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon) |
| `achtergrond` | string | `osm` (default) or `luchtfoto`/`pdok` (PDOK aerial) |
| `kleur` | string | CSS color (default: `red`) |

Returns `X-Adjusted-Zoom` header when zoom was reduced to fit geometry.

### `POST /batch`

Process multiple coordinates in a single request. Designed for bulk report generation.

**Request body:**
```json
{
  "items": [
    {
      "z": 18,
      "x": "153895,01042669",
      "y": "473352,618162258"
    },
    {
      "z": 18,
      "x": "154000,5",
      "y": "473400,2",
      "geojson": "{\"type\":\"Point\",\"coordinates\":[5.371,52.248]}",
      "kleur": "blue",
      "achtergrond": "luchtfoto"
    }
  ]
}
```

- `items`: Array of 1-100 tile requests. Each item has the same params as the single endpoints.
- All items are processed concurrently (10 workers) with shared tile cache.
- Failed items return an error message without failing the whole batch.

**Response:**
```json
{
  "results": [
    { "index": 0, "image": "<base64 PNG>", "adjustedZoom": null },
    { "index": 1, "image": "<base64 PNG>", "adjustedZoom": 16 }
  ],
  "stats": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "cacheStats": { "size": 18, "hitRate": 44 }
  }
}
```

## Performance

### Tile Cache

Map tiles are immutable for a given z/x/y. The built-in LRU cache holds up to 2,000 tiles with a 24-hour TTL. For a batch of 10,000 coordinates, many will share tiles, reducing external HTTP calls dramatically.

### Connection Reuse

HTTP keep-alive is enabled with persistent connections (50 max sockets) to the tile servers, eliminating TCP/TLS handshake overhead on repeated requests.

### Batch Processing

The `/batch` endpoint processes up to 100 items per request with 10 concurrent workers. For 10,000 trees, split into 100 requests of 100 items each.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid coordinates, zoom, GeoJSON, or color |
| 429 | Rate limit exceeded |
| 500 | Server error or tile fetch failure |

## Azure Deployment

This API is designed for Azure App Service deployment:

- **Runtime**: Node.js 20+ on Linux
- **Plan**: At least B2 (4 vCPU, 8 GB RAM) for concurrent image processing
- **Scale out**: 2+ instances for high availability; the tile cache is per-instance
- **Environment variables**: Configure `PORT`, `NODE_ENV=production`, `RATE_LIMIT_MAX` in App Settings
- **Health check path**: `/health`
- **OSM tile usage policy**: The API sends a `User-Agent: GVLocation/1.0` header as required by OpenStreetMap. Ensure your deployment identifies itself properly.

### Example Azure CLI deployment

```bash
az webapp create --name gvlocation --resource-group myRG --plan myPlan --runtime "NODE:20LTS"
az webapp config appsettings set --name gvlocation --resource-group myRG \
  --settings NODE_ENV=production PORT=8080 RATE_LIMIT_MAX=5000
az webapp deployment source config-local-git --name gvlocation --resource-group myRG
```

## License

MIT
