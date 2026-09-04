# GVLocation - Location Image Generation API

Generates 256x256 map tiles from Dutch RD (Rijksdriehoek) or WGS84 (lon/lat) coordinates, with an optional GeoJSON overlay. Built for high-volume batch processing (e.g. thousands of tree locations per report).

All image endpoints live under the `/tiles` namespace and support three output formats: **PNG** (lossless, default), **WebP** (lossy, ~75% smaller) and **AVIF** (lossy, ~85% smaller).

## Choosing an Endpoint

| Need | Endpoint |
| ---- | -------- |
| One location, just a marker | `GET /tiles/marker/:z/:x/:y` |
| One location with a GeoJSON outline/area | `GET /tiles/overlay/:z/:x/:y` |
| Many locations at once (reports) | `POST /tiles/batch` |
| Pre-fetch tiles into the cache | `POST /tiles/warm` |
| Server / cache health | `GET /health` |
| Prometheus metrics | `GET /metrics` |

Use **marker** when you only need to show *where* something is. Use **overlay** when you also want to draw the geometry of that something (its plot, road line, well area). Use **batch** for anything above a handful of locations — it renders concurrently and reuses the shared tile cache, cutting external traffic drastically.

## Quick Start

```bash
npm install
npm start        # Production (tsx)
npm run dev      # Development with auto-reload
```

Swagger UI is available in non-production at `http://localhost:3000/documentation`.

## Environment Variables

| Variable               | Default          | Description                               |
| ---------------------- | ---------------- | ----------------------------------------- |
| `PORT`                 | `3000`           | Server port                               |
| `NODE_ENV`             | `development`    | Set to `production` to disable Swagger UI |
| `LOG_LEVEL`            | `info` / `debug` | Fastify log level                         |
| `RATE_LIMIT_ENABLED`   | `true`           | Set to `false` to disable rate limiting   |
| `RATE_LIMIT_MAX`       | `1000`           | Max requests per time window per key      |
| `RATE_LIMIT_WINDOW_MS` | `60000`          | Rate limit window (ms)                    |
| `CORS_ORIGIN`          | `true`           | CORS origin (see CORS section)            |
| `OTEL_ENABLED`         | `true`           | Set to `false` to disable OpenTelemetry   |
| `OTEL_SERVICE_NAME`    | `gvlocation`     | OTel service/resource name                |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | —         | OTLP collector base URL (e.g. `http://collector:4318`) |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | — | Optional per-signal OTLP overrides |
| `OTEL_METRIC_EXPORT_INTERVAL_MS` | `60000` | How often metrics are pushed (ms)  |

## Common Concepts

### Coordinate Systems (`crs`)

The `x` and `y` path/body values are interpreted according to the `crs` query parameter.

| `crs`    | `x`               | `y`            | Valid ranges                    |
| -------- | ----------------- | -------------- | ------------------------------- |
| `rd`     | RD Easting (X)    | RD Northing (Y)| X 0–300000, Y 300000–650000     |
| `wgs84`  | Longitude (lon)   | Latitude (lat) | X (lon) -180–180, Y (lat) -90–90 |

- `crs` defaults to `rd`.
- Both comma and dot decimals are accepted (`153895,01042669` == `153895.01042669`).
- **WGS84 note**: when you pass `crs=wgs84`, the *path* coordinates are lon/lat, but any GeoJSON `coordinates` are still interpreted in their normal order (lon, lat).

### Output Formats (`format`)

| `format` | MIME type   | Use when                                          |
| -------- | ----------- | ------------------------------------------------- |
| `png`    | `image/png` | Need lossless / exact pixels (default)            |
| `webp`   | `image/webp`| Minimize bandwidth/storage (~75% smaller)         |
| `avif`   | `image/avif`| Minimize bandwidth/storage most (~85% smaller)    |

- `format` defaults to `png`.
- WebP/AVIF are visually near-identical for map tiles but dramatically smaller — recommended for high-volume report generation to cut egress and storage cost.
- When a `format` query param is present it always wins; otherwise the `Accept` request header is honored (e.g. `Accept: image/webp`, `Accept: image/avif`). Responses are marked `Vary: Accept` so CDNs cache each format separately.

### Caching & Conditional Requests

Every image response includes:

- **`ETag`** — a content hash (sha1 of the tile bytes). Send it back via `If-None-Match`; if the tile is unchanged the server replies **`304 Not Modified`** with no body.
- **`Cache-Control: public, max-age=86400`** — the tile is immutable for a given (z, x, y), safe to cache for a day.
- **`Vary: Accept`** — so caches distinguish PNG vs WebP vs AVIF responses.

This makes repeated fetches of the same tile cheap for both your app and our upstream providers.

### Instrumentation

- **`Cache-Control: public, max-age=86400`** — images are immutable for a given (z, x, y), safe for downstream caching.
- **`ETag` + `304`** — conditional requests return `304 Not Modified` when the tile is unchanged.
- **`Vary: Accept`** — caches store PNG/WebP/AVIF versions separately.
- **`X-Adjusted-Zoom`** — returned by the overlay endpoint when the zoom was reduced to fit the geometry inside the tile.
- **`X-Attribution`** — map data requires attribution (OSM/PDOK). The API returns it in the `X-Attribution` response header (and an `attribution` field per batch result) so your UI can render it, instead of baking text into the image pixels.

### OpenTelemetry

GVLocation ships with an **OpenTelemetry SDK** so it feeds the same Grafana stack as your other apps (OTel Collector → Tempo/Prometheus → Grafana):

- **Traces** — HTTP server spans (via `FastifyInstrumentation`) and upstream tile-fetch client spans (via `HttpInstrumentation`) are exported as OTLP, giving you a trace for every `/tiles/*` request including how long each OSM/PDOK fetch took.
- **Metrics** — all business metrics (requests, errors, cache hits/misses, tiles fetched, batch outcomes, request/tile latency) are exported as OTLP metrics under the `gvlocation_` prefix — the same names exposed on the `/metrics` Prometheus endpoint, so both consumers report identical values.

To enable it, point the SDK at your collector:

```bash
# Linux/App Service
OTEL_ENABLED=true
OTEL_SERVICE_NAME=gvlocation
OTEL_EXPORTER_OTLP_ENDPOINT=http://<collector-host>:4318
```

The exporter honours the standard `OTEL_EXPORTER_OTLP_*` environment variables (base endpoint or per-signal traces/metrics endpoints, protocol). Metrics are pushed every `OTEL_METRIC_EXPORT_INTERVAL_MS` (default 60 s). If no collector is reachable, the app keeps serving and logs a single non-fatal startup warning — set `OTEL_ENABLED=false` to skip telemetry entirely.

---

## Endpoints

### `GET /health`

Server status, uptime and tile-cache statistics. Use as the Azure health check (on `/health`).

**Response:**

```json
{
  "status": "ok",
  "uptime": 482,
  "zoom": { "min": 8, "max": 19 },
  "cache": { "size": 120, "hitRate": 44 }
}
```

---

### `GET /metrics`

Prometheus-formatted metrics for monitoring and autoscaling. The output follows the OpenMetrics text format and can be scraped directly.

**Metrics exposed** (prefixed `gvlocation_`):

| Metric | Type | Meaning |
| ------ | ---- | ------- |
| `requests_total` | counter | Total HTTP requests |
| `errors_total` | counter | Total 5xx errors |
| `validation_errors_total` | counter | Total 400 validation errors |
| `cache_hits_total` / `cache_misses_total` | counter | Tile cache hits / misses |
| `tiles_fetched_total` | counter | External OSM/PDOK fetches |
| `batch_items_success_total` / `batch_items_failed_total` | counter | Batch item outcomes |
| `request_duration_ms` | histogram | Request latency (bucketed) |
| `tile_fetch_duration_ms` | histogram | Upstream tile fetch latency |

**Response:** `200` `text/plain`

---

### `POST /tiles/warm`

Pre-fetches the underlying map tiles for a list of locations so that a subsequent report run hits a warm cache (much lower latency, near-zero upstream traffic). Useful right before generating a large report.

**Request body:**

```json
{
  "items": [
    { "z": 18, "x": "153895,01042669", "y": "473352,618162258" }
  ]
}
```

- Accepts the same item shape as `/tiles/batch` (up to `WARM_MAX_ITEMS` = 1000 per call).
- Concurrency is limited, so a 10,000-item list = 10 calls of 1000.
- Warm only fetches and caches the *map tiles*; geometry/markers are not rendered (that happens on the actual batch).

**Response:**

```json
{
  "warmed": 8,
  "cacheSize": 9
}
```

- `warmed` — number of cache entries added.
- `cacheSize` — total tiles now in the cache.

**Responses:** `200` · `400` invalid body.

### `GET /tiles/marker/:z/:x/:y`

Renders a **single red location marker** at the given coordinate. The lightest endpoint — no geometry parsing, ideal for "where is it" pins.

**Path params:** `z` (zoom, 8–19), `x`, `y` (coordinate, see `crs`).

**Query params:**

| Query    | Default | Description                                      |
| -------- | ------- | ------------------------------------------------ |
| `crs`    | `rd`    | `rd` or `wgs84` for interpreting `x`/`y`          |
| `format` | `png`   | `png`, `webp`, or `avif`                         |

**Responses:** `200` binary image · `400` invalid params · `500` server error.

#### Examples

RD coordinates, PNG (default format):
```
GET /tiles/marker/18/153895,01042669/473352,618162258
```

RD coordinates, WebP:
```
GET /tiles/marker/18/153895.01042669/473352.618162258?format=webp
```

WGS84 (lon/lat), default PNG:
```
GET /tiles/marker/18/5.37112/52.2482?crs=wgs84
```

WGS84, AVIF:
```
GET /tiles/marker/18/5.37112/52.2482?crs=wgs84&format=avif
```

**When to use:** showing a single location on a map without drawing any geometry. For many locations, use `/tiles/batch` instead.

---

### `GET /tiles/overlay/:z/:x/:y`

Renders a coordinate **plus a GeoJSON geometry** drawn over the map (point, line, or area). The geometry is auto-fit: if it does not fit at the requested zoom, the zoom is reduced and reported via the `X-Adjusted-Zoom` header.

**Path params:** `z` (zoom, 8–19), `x`, `y` (coordinate, see `crs`).

**Query params:**

| Query        | Default | Description                                                                              |
| ------------ | ------- | ---------------------------------------------------------------------------------------- |
| `geojson`    | —       | URL-encoded GeoJSON geometry (Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon) |
| `achtergrond`| `osm`   | `osm` (OpenStreetMap) or `luchtfoto`/`pdok` (PDOK aerial imagery)                        |
| `kleur`      | `red`   | CSS color for the overlay (any valid CSS color)                                          |
| `crs`        | `rd`    | `rd` or `wgs84` for interpreting `x`/`y`                                                  |
| `format`     | `png`   | `png`, `webp`, or `avif`                                                                 |

**Responses:** `200` binary image (plus `X-Adjusted-Zoom` when applicable) · `400` invalid params/GeoJSON/color · `500` server error.

#### Examples

Simple point marker with a colored dot, default OSM background:
```
GET /tiles/overlay/16/153895.01042669/473352.618162258?geojson=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B153895.01042669%2C473352.618162258%5D%7D
```

Area (polygon) of a parcel in blue, on PDOK aerial imagery:
```
GET /tiles/overlay/17/154000,5/473400,2?geojson=%7B%22type%22%3A%22Polygon%22%2C%22coordinates%22%3A%5B%5B%5B153895%2C473352%5D%2C%5B153900%2C473352%5D%2C%5B153900%2C473357%5D%2C%5B153895%2C473357%5D%2C%5B153895%2C473352%5D%5D%5D%7D&kleur=blue&achtergrond=luchtfoto
```

Line (road/canal) in green, WGS84 coordinates, WebP output:
```
GET /tiles/overlay/15/5.37112/52.2482?crs=wgs84&format=webp&kleur=green&geojson=%7B%22type%22%3A%22LineString%22%2C%22coordinates%22%3A%5B%5B5.37%2C52.24%5D%2C%5B5.38%2C52.25%5D%2C%5B5.39%2C52.26%5D%5D%7D
```

**When to use:** you need the shape of the thing displayed — a plot boundary, a road segment, a survey area. Without `geojson` this endpoint behaves like `marker`.

---

### `POST /tiles/batch`

Renders **up to 100 locations in one request**, processed concurrently (10 workers) with a shared tile cache. The response contains each image as a **Base64 string** embedded in JSON (the single endpoints return raw binary; the batch must return JSON).

**Request body:**

```json
{
  "items": [
    {
      "z": 18,
      "x": "153895,01042669",
      "y": "473352,618162258"
    }
  ]
}
```

Each item accepts the union of the marker/overlay params:

| Field          | Default | Description                                          |
| -------------- | ------- | ---------------------------------------------------- |
| `z` (required) | —       | Zoom level (8–19)                                    |
| `x` (required) | —       | Coordinate (see `crs`)                               |
| `y` (required) | —       | Coordinate (see `crs`)                               |
| `crs`          | `rd`    | `rd` or `wgs84`                                      |
| `format`       | `png`   | `png`, `webp`, or `avif`                             |
| `geojson`      | —       | GeoJSON geometry string                              |
| `kleur`        | `red`   | CSS color                                            |
| `achtergrond`  | `osm`   | `osm` or `luchtfoto`/`pdok`                          |

**Response:**

```json
{
  "results": [
    { "index": 0, "image": "<base64 PNG>", "format": "png", "attribution": "© OpenStreetMap", "cacheHit": false, "sourceTileCount": 4, "adjustedZoom": null },
    { "index": 1, "image": "<base64 WebP>", "format": "webp", "attribution": "© PDOK", "cacheHit": true, "sourceTileCount": 0, "adjustedZoom": 16 },
    { "index": 2, "image": "", "error": "Invalid color" }
  ],
  "stats": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "cacheStats": { "size": 18, "hitRate": 44 }
  }
}
```

- `results[index]` keeps the same order as the request.
- `attribution` — the attribution text for the background map data, render it in your UI (e.g. under the image).
- `cacheHit` — whether every source tile for this item came from the cache (no upstream request).
- `sourceTileCount` — how many external map tiles were fetched for this item (0 = fully served from cache).
- A failed item does **not** fail the whole batch — it returns `error` and an empty `image`.
- Decode with `Buffer.from(image, 'base64')` (Node) or `atob()` / a `data:` URI (browser).

> **Recommendation:** for a 10,000-tree report, first `POST /tiles/warm` with the full list, then run the batch. You'll see `cacheHit: true` and `sourceTileCount: 0` on nearly every item, cutting upstream OSM/PDOK traffic to almost nothing for repeated reports.

#### Examples

Ten simple markers, default RD/PNG:
```json
{
  "items": [
    { "z": 18, "x": "153895,01042669", "y": "473352,618162258" },
    { "z": 18, "x": "154000,5",        "y": "473400,2" },
    { "z": 18, "x": "154100,5",        "y": "473500,2" },
    { "z": 18, "x": "154200,5",        "y": "473600,2" },
    { "z": 18, "x": "154300,5",        "y": "473700,2" },
    { "z": 18, "x": "154400,5",        "y": "473800,2" },
    { "z": 18, "x": "154500,5",        "y": "473900,2" },
    { "z": 18, "x": "154600,5",        "y": "474000,2" },
    { "z": 18, "x": "154700,5",        "y": "474100,2" },
    { "z": 18, "x": "154800,5",        "y": "474200,2" }
  ]
}
```

Many WGS84 locations as WebP (for a report, this cuts ~75% bandwidth):
```json
{
  "items": [
    { "z": 17, "x": "5.45", "y": "52.15", "crs": "wgs84", "format": "webp" },
    { "z": 17, "x": "5.46", "y": "52.15", "crs": "wgs84", "format": "webp" },
    { "z": 17, "x": "5.47", "y": "52.15", "crs": "wgs84", "format": "webp" }
  ]
}
```

Mixed — a parcel overlay plus a plain marker:
```json
{
  "items": [
    {
      "z": 17,
      "x": "154000,5",
      "y": "473400,2",
      "geojson": "{\"type\":\"Polygon\",\"coordinates\":[[[153895,473352],[153900,473352],[153900,473357],[153895,473357],[153895,473352]]]}",
      "kleur": "blue",
      "achtergrond": "luchtfoto"
    },
    { "z": 18, "x": "153895,01042669", "y": "473352,618162258", "format": "avif" }
  ]
}
```

**When to use:** any bulk generation — your 10,000-tree report is 100 requests of 100 items each. The shared tile cache means nearby locations reuse the same underlying tiles, so external OSM/PDOK traffic stays low.

---

## Performance

### Tile Cache

Map tiles are immutable for a given z/x/y. The built-in LRU cache holds up to 2,000 tiles with a 24-hour TTL. For a batch of 10,000 coordinates, many will share tiles, reducing external HTTP calls dramatically.

### Tile Fetch Retry

Each external tile fetch is retried up to 2 extra times with exponential backoff (200 ms, then 400 ms), so transient upstream failures don't fail a report.

### Connection Reuse

HTTP keep-alive is enabled with persistent connections (50 max sockets) to the tile servers, eliminating TCP/TLS handshake overhead on repeated requests.

### Batch Processing

`POST /tiles/batch` processes up to 100 items per request with 10 concurrent workers. For 10,000 items, split into 100 requests of 100 items each.

### Recommended client strategy

1. Request WebP or AVIF (`format`) to cut payload ~75–85%.
2. Before a big run, `POST /tiles/warm` the full location list so the cache is hot.
3. Split reports into 100-item `/tiles/batch` calls, 10 workers each.
4. Track `sourceTileCount`/`cacheHit` per item to confirm upstream traffic is minimized.
5. Reuse the base64 result directly: store it, embed as a `data:` URI, or decode to a file.

## Error Responses

Errors use a consistent JSON envelope:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid zoom level"
  }
}
```

| HTTP Status | `code`          | Meaning                                    |
| ----------- | --------------- | ------------------------------------------ |
| 400         | `BAD_REQUEST`   | Invalid coordinates, zoom, GeoJSON, or color |
| 404         | `NOT_FOUND`     | Route not found / unknown format           |
| 429         | `RATE_LIMITED`  | Rate limit exceeded                        |
| 500         | `INTERNAL_ERROR`| Server error or tile fetch failure         |

Batch items that fail return the error per-item; the overall request still returns `200` with a `failed` count in `stats`.

## Rate Limiting

Enabled by default (1,000 requests / 60 s per key). The key is the `X-Api-Key` header when present, otherwise the client IP. Exceeding the limit returns `429` with the `RATE_LIMITED` envelope above. Disable with `RATE_LIMIT_ENABLED=false` or tune via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`.

> **For large reports:** a 10,000-item job is 100 `/tiles/batch` calls (100 items each). At the default 1,000/60s this fits comfortably in a minute, but raise `RATE_LIMIT_MAX` (e.g. to 5000) in production if you also have other traffic.

## CORS

By default CORS reflects the calling origin (`origin: true`), which works for any browser caller. Set `CORS_ORIGIN` to a specific origin (e.g. `https://app.example.com`) to restrict it. Browser callers to `/tiles/batch` will issue a preflight; this is handled automatically.

## Azure Deployment

This API is designed for Azure App Service deployment:

- **Runtime**: Node.js 20+ on Linux
- **Plan**: At least B2 (4 vCPU, 8 GB RAM) for concurrent image processing
- **Scale out**: 2+ instances for high availability; the tile cache is per-instance
- **Environment variables**: Configure `PORT`, `NODE_ENV=production`, `RATE_LIMIT_MAX`, and the `OTEL_*` settings in App Settings
- **Health check path**: `/health`
- **Monitoring**: scrape `/metrics` (Prometheus) **or** enable OpenTelemetry (`OTEL_EXPORTER_OTLP_ENDPOINT` pointing at your collector) to observe cache hit-rate, upstream traffic and latency; the `tiles_fetched_total` metric is a direct measure of external OSM/PDOK egress.
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
