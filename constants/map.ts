export type TileKey = keyof typeof TILE_URL_MAPPING;

export type OutputFormat = 'png' | 'webp' | 'avif';

const FORMATS = ['png', 'webp', 'avif'] as const;

export const MAP_CONSTANTS = {
  TILE_SIZE: 256,

  MIN_ZOOM: 8,
  MAX_ZOOM: 19,

  RD_X_MIN: 0,
  RD_X_MAX: 300000,
  RD_Y_MIN: 300000,
  RD_Y_MAX: 650000,

  MARKER_RADIUS: 5,
  MARKER_OFFSET_X: 128,
  MARKER_OFFSET_Y: 128,

  POINT_RADIUS: 4,

  PDOK_ATTRIBUTION: '\u00a9 PDOK',
  OSM_ATTRIBUTION: '\u00a9 OpenStreetMap',
  ATTRIBUTION_X_PDOK: 210,
  ATTRIBUTION_X_OSM: 170,
  ATTRIBUTION_Y: 240,

  DEFAULT_COLOR: 'red',
  DEFAULT_TILE_KEY: 'osm' as TileKey,
  DEFAULT_FORMAT: 'png' as OutputFormat,

  OUTPUT_FORMATS: FORMATS,

  TILE_FETCH_TIMEOUT_MS: 10000,
  TILE_FETCH_RETRIES: 2,
  CACHE_MAX_SIZE: 2000,
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  CACHE_CONTROL: 'public, max-age=86400',
  CACHE_CONTROL_NO_STORE: 'no-store',

  BATCH_MAX_ITEMS: 100,
  BATCH_CONCURRENCY: 10,
  WARM_MAX_ITEMS: 1000,

  USER_AGENT: 'GVLocation/1.0 (location-image-api)',
  METRICS_PREFIX: 'gvlocation',
} as const;

export const TILE_URL_MAPPING = {
  osm: 'https://tile.openstreetmap.org',
  luchtfoto:
    'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857',
  pdok: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857',
} as const;
