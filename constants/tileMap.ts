export type TileKey = keyof typeof TILE_URL_MAPPING;

export const TILE_CONSTANTS = {
  // Tile configuration
  TILE_SIZE: 256,
  MIN_ZOOM: 9,

  // Marker settings
  MARKER_RADIUS: 5,
  MARKER_OFFSET_X: 128,
  MARKER_OFFSET_Y: 128,

  // Attribution settings
  PDOK_ATTRIBUTION: '© PDOK',
  OSM_ATTRIBUTION: '© OpenStreetMap',
  ATTRIBUTION_X_PDOK: 210,
  ATTRIBUTION_X_OSM: 170,
  ATTRIBUTION_Y: 240,

  // Default values
  DEFAULT_COLOR: 'red',
  DEFAULT_TILE_KEY: 'osm' as TileKey,
} as const;

export const TILE_URL_MAPPING = {
  osm: 'https://tile.openstreetmap.org',
  luchtfoto:
    'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857',
  pdok: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857',
} as const;
