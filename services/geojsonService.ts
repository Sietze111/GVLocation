import { bboxPolygon } from '@turf/bbox-polygon';
import { booleanWithin } from '@turf/boolean-within';
import {
  lineString,
  multiLineString,
  multiPoint,
  multiPolygon,
  point,
  polygon,
} from '@turf/helpers';
import type {
  BoundingBox,
  Coordinates,
  GeoJSONGeometry,
} from '../types/geometry';

export function isInsideBoundingBox(
  geometry: GeoJSONGeometry,
  boundingBox: BoundingBox
): boolean {
  const [minLng, minLat, maxLng, maxLat] = boundingBox;

  const checkCoordinates = (coordinates: Coordinates[]): boolean => {
    for (const coordinate of coordinates) {
      const [lng, lat] = coordinate;
      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
        return false;
      }
    }
    return true;
  };

  switch (geometry.type) {
    case 'Point':
    case 'MultiPoint':
      return checkCoordinates(geometry.coordinates as Coordinates[]);
    case 'LineString':
    case 'MultiLineString':
    case 'Polygon':
    case 'MultiPolygon':
      for (const coordinates of geometry.coordinates) {
        if (!checkCoordinates(coordinates as Coordinates[])) {
          return false;
        }
      }
      return true;
    default:
      return false;
  }
}

export function geojsonFitsOnTile(
  coordinates: any,
  bbox: [number, number, number, number],
  type: string
): boolean {
  const box = bboxPolygon(bbox);

  switch (type) {
    case 'Point':
      return booleanWithin(point(coordinates), box);
    case 'LineString':
      return booleanWithin(lineString(coordinates), box);
    case 'Polygon':
      return booleanWithin(polygon(coordinates), box);
    case 'MultiPoint':
      return booleanWithin(multiPoint(coordinates), box);
    case 'MultiLineString':
      return booleanWithin(multiLineString(coordinates), box);
    case 'MultiPolygon':
      return booleanWithin(multiPolygon(coordinates), box);
    default:
      throw new Error('Unsupported GeoJSON type');
  }
}
