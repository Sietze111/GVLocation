import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { MAP_CONSTANTS } from '../constants/map.js';

const render = (): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GVLocation API</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; line-height: 1.55; }
    h1 { margin-bottom: 4px; }
    code { background: rgba(127,127,127,.15); padding: 1px 5px; border-radius: 4px; font-size: .9em; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(127,127,127,.25); vertical-align: top; }
    th { font-size: .85em; text-transform: uppercase; letter-spacing: .04em; }
    a { color: #0b6bcb; }
    .card { padding: 3px 0; }
    ul { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>GVLocation API</h1>
  <p>Generates 256x256 map tiles from Dutch RD or WGS84 coordinates, with optional GeoJSON overlays.</p>
  <p><a href="/documentation"><b>Interactive docs (Swagger UI)</b></a> · <a href="/health">Health</a> · <a href="/metrics">Metrics</a></p>

  <h2>Endpoints</h2>
  <table>
    <tr><th>Endpoint</th><th>Purpose</th></tr>
    <tr><td><code>GET /tiles/marker/:z/:x/:y</code></td><td>Single location with a red marker</td></tr>
    <tr><td><code>GET /tiles/overlay/:z/:x/:y</code></td><td>Single location with a GeoJSON overlay</td></tr>
    <tr><td><code>POST /tiles/batch</code></td><td>Up to 100 locations in one request (Base64 JSON). Each result reports its own <code>cacheHit</code> and <code>sourceTileCount</code>.</td></tr>
    <tr><td><code>POST /tiles/warm</code></td><td>Pre-fetch tiles into the cache (up to ${MAP_CONSTANTS.WARM_MAX_ITEMS} items) so report runs are fast.</td></tr>
    <tr><td><code>GET /health</code></td><td>Server and cache status</td></tr>
    <tr><td><code>GET /metrics</code></td><td>Prometheus metrics (traffic, cache, tile fetches, latency)</td></tr>
  </table>

  <h2>Observability</h2>
  <p>In addition to the Prometheus <code>/metrics</code> endpoint, the service exports <b>OpenTelemetry</b> traces and metrics (OTLP) to feed your existing Grafana stack. Point it at your collector with <code>OTEL_EXPORTER_OTLP_ENDPOINT</code>; see the README for the full <code>OTEL_*</code> options.</p>

  <h2>Quick examples</h2>
  <div class="card"><code>GET /tiles/marker/18/153895,01042669/473352,618162258</code></div>
  <div class="card"><code>GET /tiles/marker/18/5.37112/52.2482?crs=wgs84&amp;format=webp</code></div>
  <div class="card"><code>GET /tiles/overlay/17/154000,5/473400,2?geojson=%7B...%7D&amp;achtergrond=luchtfoto</code></div>
  <div class="card"><code>POST /tiles/batch</code> — body: <code>{ "crs":"rd", "format":"webp", "achtergrond":"topografie", "items":[ { "z":18, "x":"153895,01042669", "y":"473352,618162258" } ] }</code></div>
  <div class="card"><code>POST /tiles/warm</code> — body: <code>{ "items":[ { "z":18, "x":"153895,01042669", "y":"473352,618162258" } ] }</code></div>

  <h2>Notes</h2>
  <ul>
    <li>Output formats: <code>png</code> (default), <code>webp</code>, <code>avif</code>. A <code>format</code> query param wins; otherwise the <code>Accept</code> header (e.g. <code>Accept: image/webp</code>) is honored.</li>
    <li>Coordinate systems: <code>crs=rd</code> (default) or <code>crs=wgs84</code></li>
    <li>Zoom range: ${MAP_CONSTANTS.MIN_ZOOM}–${MAP_CONSTANTS.MAX_ZOOM}</li>
    <li>Every image response is cached and served with an <code>ETag</code> and <code>Cache-Control</code>; conditional requests return <code>304 Not Modified</code>. Responses vary on <code>Accept</code>.</li>
    <li>Rate limiting keys on <code>X-Api-Key</code> (or client IP). Limit the batch/warm window or raise <code>RATE_LIMIT_MAX</code> in production for large jobs.</li>
    <li>Errors use a consistent envelope: <code>{ "error": { "code": "...", "message": "..." } }</code> (e.g. 400 <code>BAD_REQUEST</code>, 404 <code>NOT_FOUND</code>, 429 <code>RATE_LIMITED</code>, 500 <code>INTERNAL_ERROR</code>).</li>
  </ul>
</body>
</html>`;

const plugin: FastifyPluginAsyncTypebox = async function (fastify, _opts) {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['system'],
        summary: 'API landing page',
        description: 'HTML index listing endpoints, examples and notes.',
        response: {
          200: { type: 'string' as const },
        },
      },
    },
    async (_request, reply) => {
      return reply.type('text/html; charset=utf-8').send(render());
    }
  );
};

export default plugin;
