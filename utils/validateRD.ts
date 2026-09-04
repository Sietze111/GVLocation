import { MAP_CONSTANTS } from '../constants/map.js';
import { ValidationError } from '../types/errors.js';

const CSS_COLOR_REGEX =
  /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\)|[a-zA-Z]+)$/;

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return Number(value.replace(',', '.'));
};

export const validateRdCoords = (x: string | number, y: string | number) => {
  const parsedX = parseNumber(x);
  const parsedY = parseNumber(y);

  if (isNaN(parsedX) || isNaN(parsedY)) {
    throw new ValidationError('Coordinates must be numbers');
  }

  if (parsedX < MAP_CONSTANTS.RD_X_MIN || parsedX > MAP_CONSTANTS.RD_X_MAX) {
    throw new ValidationError(
      `X coordinate must be between ${MAP_CONSTANTS.RD_X_MIN} and ${MAP_CONSTANTS.RD_X_MAX}`
    );
  }

  if (parsedY < MAP_CONSTANTS.RD_Y_MIN || parsedY > MAP_CONSTANTS.RD_Y_MAX) {
    throw new ValidationError(
      `Y coordinate must be between ${MAP_CONSTANTS.RD_Y_MIN} and ${MAP_CONSTANTS.RD_Y_MAX}`
    );
  }

  return { x: parsedX, y: parsedY };
};

export const validateZ = (z: number): void => {
  if (z > MAP_CONSTANTS.MAX_ZOOM) {
    throw new ValidationError(
      `Zoom level cannot be larger than ${MAP_CONSTANTS.MAX_ZOOM}`
    );
  }
  if (z < MAP_CONSTANTS.MIN_ZOOM) {
    throw new ValidationError(
      `Zoom level cannot be smaller than ${MAP_CONSTANTS.MIN_ZOOM}`
    );
  }
};

export const validateColor = (kleur: string): void => {
  if (!CSS_COLOR_REGEX.test(kleur)) {
    throw new ValidationError(
      `Invalid color "${kleur}". Must be a valid CSS color value.`
    );
  }
};
