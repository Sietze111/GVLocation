type Coordinates = [number, number];
type BoundingBox = [number, number, number, number];

interface PointGeometry {
  type: 'Point';
  coordinates: Coordinates;
}

interface MultiPointGeometry {
  type: 'MultiPoint';
  coordinates: Coordinates[];
}

interface LineStringGeometry {
  type: 'LineString';
  coordinates: Coordinates[];
}

interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Coordinates[][];
}

interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Coordinates[][];
}

interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Coordinates[][][];
}

type Geometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry;
