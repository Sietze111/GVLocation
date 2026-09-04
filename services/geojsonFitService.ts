import tilebelt from '@mapbox/tilebelt';
import { MAP_CONSTANTS } from '../constants/map.js';
import { geojsonFitsOnTile } from './geojsonService.js';

interface ParsedGeoJSON {
  type: string;
  coordinates: unknown;
}

export const checkGeoJSONFit = (
  lon: number,
  lat: number,
  z: number,
  geojson: ParsedGeoJSON
): number => {
  let tilesFitGeojson = false;
  const { type, coordinates } = geojson;

  while (!tilesFitGeojson && z >= MAP_CONSTANTS.MIN_ZOOM) {
    const [tileX, tileY] = tilebelt.pointToTile(lon, lat, z) as [
      number,
      number
    ];
    const tileBbox = tilebelt.tileToBBOX([tileX, tileY, z]) as [
      number,
      number,
      number,
      number
    ];

    const pixelX = Math.round(
      ((lon - tileBbox[0]) / (tileBbox[2] - tileBbox[0])) *
        MAP_CONSTANTS.TILE_SIZE -
        MAP_CONSTANTS.MARKER_OFFSET_X
    );
    const pixelY = Math.round(
      ((tileBbox[3] - lat) / (tileBbox[3] - tileBbox[1])) *
        MAP_CONSTANTS.TILE_SIZE -
        MAP_CONSTANTS.MARKER_OFFSET_Y
    );

    const pixelWidth = (tileBbox[2] - tileBbox[0]) / MAP_CONSTANTS.TILE_SIZE;
    const pixelHeight = (tileBbox[3] - tileBbox[1]) / MAP_CONSTANTS.TILE_SIZE;

    const offsetXDegrees = pixelX * pixelWidth;
    const offsetYDegrees = pixelY * pixelHeight;
    const bboxWithOffset: [number, number, number, number] = [
      tileBbox[0] + offsetXDegrees,
      tileBbox[1] - offsetYDegrees,
      tileBbox[2] + offsetXDegrees,
      tileBbox[3] - offsetYDegrees,
    ];

    tilesFitGeojson = geojsonFitsOnTile(
      coordinates as Parameters<typeof geojsonFitsOnTile>[0],
      bboxWithOffset,
      type
    );

    if (!tilesFitGeojson) {
      z--;
    }
  }

  return z;
};
