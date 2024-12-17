import tilebelt from '@mapbox/tilebelt';
import { TILE_CONSTANTS } from '../constants/tileMap';
import { geojsonFitsOnTile } from './geojsonService';

export const checkGeoJSONFit = async (
  lon: number,
  lat: number,
  z: number,
  geojson: string
): Promise<number> => {
  let tilesFitGeojson = false;

  while (!tilesFitGeojson && z >= TILE_CONSTANTS.MIN_ZOOM) {
    let [tileX, tileY] = tilebelt.pointToTile(lon, lat, z) as [number, number];
    let tileBbox = tilebelt.tileToBBOX([tileX, tileY, z]) as [
      number,
      number,
      number,
      number
    ];

    let pixelX = Math.round(
      ((lon - tileBbox[0]) / (tileBbox[2] - tileBbox[0])) *
        TILE_CONSTANTS.TILE_SIZE -
        TILE_CONSTANTS.MARKER_OFFSET_X
    );
    let pixelY = Math.round(
      ((tileBbox[3] - lat) / (tileBbox[3] - tileBbox[1])) *
        TILE_CONSTANTS.TILE_SIZE -
        TILE_CONSTANTS.MARKER_OFFSET_Y
    );

    let pixelWidth = (tileBbox[2] - tileBbox[0]) / TILE_CONSTANTS.TILE_SIZE;
    let pixelHeight = (tileBbox[3] - tileBbox[1]) / TILE_CONSTANTS.TILE_SIZE;

    let offsetXDegrees = pixelX * pixelWidth;
    let offsetYDegrees = pixelY * pixelHeight;
    let bboxWithOffset: [number, number, number, number] = [
      tileBbox[0] + offsetXDegrees,
      tileBbox[1] - offsetYDegrees,
      tileBbox[2] + offsetXDegrees,
      tileBbox[3] - offsetYDegrees,
    ];

    const object = JSON.parse(geojson);
    const { type, coordinates } = object;

    tilesFitGeojson = geojsonFitsOnTile(coordinates, bboxWithOffset, type);

    if (!tilesFitGeojson) {
      z--;
    }
  }

  return z; // Return the adjusted zoom level
};
