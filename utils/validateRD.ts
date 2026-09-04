import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import { ValidationError } from '../types/errors.js';

export type Crs = 'rd' | 'wgs84';

const CSS_COLOR_REGEX =
  /^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\)|[a-zA-Z]+)$/;

const WGS84_LON_MIN = -180;
const WGS84_LON_MAX = 180;
const WGS84_LAT_MIN = -90;
const WGS84_LAT_MAX = 90;

const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  return Number(value.replace(',', '.'));
};

export const parseCrs = (crs: string | undefined): Crs => {
  if (!crs) return 'rd';
  const normalized = crs.toLowerCase();
  if (normalized === 'wgs84' || normalized === 'lonlat' || normalized === 'geographic') {
    return 'wgs84';
  }
  if (normalized === 'rd' || normalized === 'rijksdriehoek') {
    return 'rd';
  }
  throw new ValidationError(
    `Invalid crs "${crs}". Must be "rd" or "wgs84".`
  );
};

export const validateCoordinates = (
  x: string | number,
  y: string | number,
  crs: Crs = 'rd'
): { x: number; y: number } => {
  const parsedX = parseNumber(x);
  const parsedY = parseNumber(y);

  if (isNaN(parsedX) || isNaN(parsedY)) {
    throw new ValidationError('Coordinates must be numbers');
  }

  if (crs === 'wgs84') {
    if (parsedX < WGS84_LON_MIN || parsedX > WGS84_LON_MAX) {
      throw new ValidationError(
        `Longitude must be between ${WGS84_LON_MIN} and ${WGS84_LON_MAX}`
      );
    }
    if (parsedY < WGS84_LAT_MIN || parsedY > WGS84_LAT_MAX) {
      throw new ValidationError(
        `Latitude must be between ${WGS84_LAT_MIN} and ${WGS84_LAT_MAX}`
      );
    }
    return { x: parsedX, y: parsedY };
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

// Backwards-compatible alias
export const validateRdCoords = (
  x: string | number,
  y: string | number
): { x: number; y: number } => validateCoordinates(x, y, 'rd');

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

export const parseFormat = (format: string | undefined): OutputFormat => {
  if (!format) return MAP_CONSTANTS.DEFAULT_FORMAT;
  const normalized = format.toLowerCase();
  if (
    normalized === 'png' ||
    normalized === 'webp' ||
    normalized === 'avif'
  ) {
    return normalized;
  }
  throw new ValidationError(
    `Invalid format "${format}". Must be one of: png, webp, avif.`
  );
};

const ACCEPT_MIME: Record<string, OutputFormat> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * Resolves the output format. Explicit `format` param wins; otherwise the
 * client's `Accept` header is honored (content negotiation). Falls back to
 * the default format.
 */
export const resolveFormat = (
  format: string | undefined,
  accept: string | undefined
): OutputFormat => {
  const requested = parseFormat(format);

  const acceptFormat = [
    ...(accept || '*/*').split(','),
  ]
    .map((part) => part.trim().split(';')[0].trim().toLowerCase())
    .find((mime) => ACCEPT_MIME[mime]);

  if (requested !== MAP_CONSTANTS.DEFAULT_FORMAT) {
    return requested;
  }
  if (acceptFormat) {
    return ACCEPT_MIME[acceptFormat];
  }
  return MAP_CONSTANTS.DEFAULT_FORMAT;
};
