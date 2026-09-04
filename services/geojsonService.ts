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
  GeoJSONCoordinate,
  GeoJSONGeometry,
} from '../types/geometry.js';

export function isInsideBoundingBox(
  geometry: GeoJSONGeometry,
  boundingBox: BoundingBox
): boolean {
  const [minLng, minLat, maxLng, maxLat] = boundingBox;

  const checkCoordinates = (coordinates: GeoJSONCoordinate[]): boolean => {
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
      return checkCoordinates(
        geometry.coordinates as GeoJSONCoordinate[]
      );
    case 'LineString':
    case 'MultiLineString':
    case 'Polygon':
    case 'MultiPolygon':
      for (const coordinates of geometry.coordinates) {
        if (!checkCoordinates(coordinates as GeoJSONCoordinate[])) {
          return false;
        }
      }
      return true;
    default:
      return false;
  }
}

export function geojsonFitsOnTile(
  coordinates: unknown,
  bbox: [number, number, number, number],
  type: string
): boolean {
  const box = bboxPolygon(bbox);

  switch (type) {
    case 'Point':
      return booleanWithin(
        point(coordinates as [number, number]),
        box
      );
    case 'LineString':
      return booleanWithin(
        lineString(coordinates as [number, number][]),
        box
      );
    case 'Polygon':
      return booleanWithin(
        polygon(coordinates as [number, number][][]),
        box
      );
    case 'MultiPoint':
      return booleanWithin(
        multiPoint(coordinates as [number, number][]),
        box
      );
    case 'MultiLineString':
      return booleanWithin(
        multiLineString(coordinates as [number, number][][]),
        box
      );
    case 'MultiPolygon':
      return booleanWithin(
        multiPolygon(coordinates as [number, number][][][]),
        box
      );
    default:
      throw new Error('Unsupported GeoJSON type');
  }
}
