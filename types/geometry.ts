export type GeoJSONCoordinate = [number, number];
export type BoundingBox = [number, number, number, number];

export interface PointGeometry {
  type: 'Point';
  coordinates: GeoJSONCoordinate;
}

export interface MultiPointGeometry {
  type: 'MultiPoint';
  coordinates: GeoJSONCoordinate[];
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: GeoJSONCoordinate[];
}

export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: GeoJSONCoordinate[][];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: GeoJSONCoordinate[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: GeoJSONCoordinate[][][];
}

export type GeoJSONGeometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry;
