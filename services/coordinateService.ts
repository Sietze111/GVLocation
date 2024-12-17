import { ValidationError } from '../types/errors';
import type { Coordinates, WGS84Coordinates } from '../types/map';
import { rdProjection } from '../utils/proj';

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
