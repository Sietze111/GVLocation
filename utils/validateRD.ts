import { ValidationError } from '../types/errors';

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  // Replace comma with dot for decimal numbers
  return Number(value.replace(',', '.'));
};

// Validate input RD coordinates
export const validateRdCoords = (x: string | number, y: string | number) => {
  const parsedX = parseNumber(x);
  const parsedY = parseNumber(y);

  if (isNaN(parsedX) || isNaN(parsedY)) {
    throw new ValidationError('Coordinates must be numbers');
  }

  if (parsedX < 0 || parsedX > 300000) {
    throw new ValidationError('X coordinate must be between 0 and 300000');
  }

  if (parsedY < 300000 || parsedY > 650000) {
    throw new ValidationError('Y coordinate must be between 300000 and 650000');
  }

  return { x: parsedX, y: parsedY };
};

// Validate zoom level
export const validateZ = (z: number): void => {
  if (z > 19) {
    throw new ValidationError('Zoom level cannot be larger than 19');
  }
  if (z < 8) {
    throw new ValidationError('Zoom level cannot be smaller than 8');
  }
};
