import { MAP_CONSTANTS } from '../constants/map.js';
import { ValidationError } from '../types/errors.js';
import type { Coordinates, WGS84Coordinates } from '../types/map.js';
import { rdProjection } from '../utils/proj.js';

export const coordinateService = {
  rdToWgs84({ x, y }: Coordinates): WGS84Coordinates {
    try {
      const [longitude, latitude] = rdProjection.inverse([x, y]);
      return { longitude, latitude };
    } catch (error) {
      throw new ValidationError('Invalid RD coordinates');
    }
  },
};
