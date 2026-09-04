import { ValidationError } from '../types/errors.js';
import type { Coordinates, WGS84Coordinates } from '../types/map.js';
import { rdProjection } from '../utils/proj.js';
import type { Crs } from '../utils/validateRD.js';

interface ParsedCoordinates {
  x: number;
  y: number;
}

export const coordinateService = {
  rdToWgs84({ x, y }: Coordinates): WGS84Coordinates {
    try {
      const [longitude, latitude] = rdProjection.inverse([x, y]);
      return { longitude, latitude };
    } catch (error) {
      throw new ValidationError('Invalid RD coordinates');
    }
  },

  toWgs84({ x, y }: ParsedCoordinates, crs: Crs): WGS84Coordinates {
    if (crs === 'wgs84') {
      return { longitude: x, latitude: y };
    }
    return coordinateService.rdToWgs84({ x, y });
  },
};
