export type Coordinates = [number, number];
export type BoundingBox = [number, number, number, number];

export interface PointGeometry {
  type: 'Point';
  coordinates: Coordinates;
}

export interface MultiPointGeometry {
  type: 'MultiPoint';
  coordinates: Coordinates[];
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Coordinates[];
}

export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Coordinates[][];
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Coordinates[][];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Coordinates[][][];
}

export type GeoJSONGeometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry;

export type Geometry = GeoJSONGeometry;
