import tilebelt from '@mapbox/tilebelt';
import type { Crs } from '../utils/validateRD.js';
import { coordinateService } from './coordinateService.js';
import { checkGeoJSONFit } from './geojsonFitService.js';
import { tileService } from './tileService.js';

interface ParsedGeoJSON {
  type: string;
  coordinates: unknown;
}

export const tileCoordinateService = {
  async calculateTileData(
    x: number,
    y: number,
    z: number,
    geojson?: ParsedGeoJSON,
    crs: Crs = 'rd'
  ) {
    const { longitude: lon, latitude: lat } = coordinateService.toWgs84(
      { x, y },
      crs
    );

    if (geojson !== undefined) {
      z = checkGeoJSONFit(lon, lat, z, geojson);
    }

    const [tileX, tileY] = tilebelt.pointToTile(lon, lat, z) as [
      number,
      number
    ];
    const bbox = tilebelt.tileToBBOX([tileX, tileY, z]) as [
      number,
      number,
      number,
      number
    ];

    const pixelCoords = tileService.calculatePixelCoordinates(
      { longitude: lon, latitude: lat },
      { x: tileX, y: tileY, z }
    );

    return {
      z,
      tileX,
      tileY,
      bbox,
      pixelCoords,
      wgs84Coords: { longitude: lon, latitude: lat },
    };
  },
};
