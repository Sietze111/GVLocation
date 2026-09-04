import type { BoundingBox } from '../types/geometry.js';

const extractCoords = (
  coordinates: unknown,
  type: string
): [number, number][] => {
  switch (type) {
    case 'Point':
      return [coordinates as [number, number]];
    case 'MultiPoint':
    case 'LineString':
      return coordinates as [number, number][];
    case 'MultiLineString':
    case 'Polygon':
      return (coordinates as [number, number][][]).flat();
    case 'MultiPolygon':
      return (coordinates as [number, number][][][]).flat(2);
    default:
      throw new Error('Unsupported GeoJSON type');
  }
};

export function allCoordinatesWithin(
  coordinates: unknown,
  boundingBox: BoundingBox,
  type: string
): boolean {
  const [minLng, minLat, maxLng, maxLat] = boundingBox;
  return extractCoords(coordinates, type).every(
    ([lng, lat]) =>
      lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
  );
}

export function geojsonFitsOnTile(
  coordinates: unknown,
  bbox: BoundingBox,
  type: string
): boolean {
  return allCoordinatesWithin(coordinates, bbox, type);
}
