import { MAP_CONSTANTS } from '../constants/map.js';

const T = MAP_CONSTANTS.TILE_SIZE;
const PR = MAP_CONSTANTS.POINT_RADIUS;

export interface OffsetCoords {
  x: number;
  y: number;
}

export interface GeoJSONPath {
  pathString: string;
  isFilled: boolean;
}

const toOffset = (
  lon: number,
  lat: number,
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number
): [number, number] => [
  Math.round(((lon - bbox[0]) / (bbox[2] - bbox[0])) * T) -
    pixelX +
    MAP_CONSTANTS.MARKER_OFFSET_X,
  Math.round(((bbox[3] - lat) / (bbox[3] - bbox[1])) * T) -
    pixelY +
    MAP_CONSTANTS.MARKER_OFFSET_Y,
];

const linePath = (points: [number, number][]): string =>
  `M${points.map(([x, y]) => `${x},${y}`).join('L')}`;

const ringPath = (points: [number, number][]): string =>
  `${linePath(points)}Z`;

const circlePath = (x: number, y: number): string =>
  `M${x},${y} m${-PR},0 a${PR},${PR} 0 1,0 ${PR * 2},0 a${PR},${PR} 0 1,0 ${-PR * 2},0`;

export const handleGeoJSON = (
  type: string,
  coordinates: unknown,
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number
): GeoJSONPath => {
  const proj = (c: [number, number]): [number, number] =>
    toOffset(c[0], c[1], bbox, pixelX, pixelY);

  switch (type) {
    case 'Polygon':
      return {
        pathString: (coordinates as [number, number][][])
          .map((ring) => ringPath(ring.map(proj)))
          .join(' '),
        isFilled: true,
      };

    case 'MultiPolygon':
      return {
        pathString: (coordinates as [number, number][][][])
          .map((polygon) =>
            polygon.map((ring) => ringPath(ring.map(proj))).join(' ')
          )
          .join(' '),
        isFilled: true,
      };

    case 'LineString':
      return {
        pathString: linePath((coordinates as [number, number][]).map(proj)),
        isFilled: false,
      };

    case 'MultiLineString':
      return {
        pathString: (coordinates as [number, number][][])
          .map((ls) => linePath(ls.map(proj)))
          .join(' '),
        isFilled: false,
      };

    case 'Point': {
      const [x, y] = proj(coordinates as [number, number]);
      return { pathString: circlePath(x, y), isFilled: true };
    }

    case 'MultiPoint':
      return {
        pathString: (coordinates as [number, number][])
          .map((p) => {
            const [x, y] = proj(p);
            return circlePath(x, y);
          })
          .join(' '),
        isFilled: true,
      };

    default:
      throw new Error('Unsupported GeoJSON type');
  }
};
