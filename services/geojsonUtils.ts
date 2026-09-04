import { MAP_CONSTANTS } from '../constants/map.js';

const T = MAP_CONSTANTS.TILE_SIZE;
const HALF = MAP_CONSTANTS.MARKER_OFFSET_X;
const PR = MAP_CONSTANTS.POINT_RADIUS;

export const processCoordinates = (
  coords: [number, number][],
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number
): [number, number][] => {
  return coords.map(([lon, lat]) => {
    const geoX = Math.round(
      ((Number(lon) - bbox[0]) / (bbox[2] - bbox[0])) * T
    );
    const geoY = Math.round(
      ((bbox[3] - Number(lat)) / (bbox[3] - bbox[1])) * T
    );
    const offsetX = geoX - pixelX + HALF;
    const offsetY = geoY - pixelY + HALF;
    return [offsetX, offsetY] as [number, number];
  });
};

export const calculateOffsets = (
  lon: number,
  lat: number,
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number
): [number, number] => {
  const geoX = Math.round(((lon - bbox[0]) / (bbox[2] - bbox[0])) * T);
  const geoY = Math.round(((bbox[3] - lat) / (bbox[3] - bbox[1])) * T);
  const offsetX = geoX - pixelX + HALF;
  const offsetY = geoY - pixelY + HALF;
  return [offsetX, offsetY];
};

export const handleGeoJSON = (
  type: string,
  coordinates: unknown,
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number,
  _kleur: string
): { geojsonCoords: [number, number][]; pathString: string } => {
  let geojsonCoords: [number, number][] = [];
  let pathString = '';

  switch (type) {
    case 'Polygon':
      geojsonCoords = processCoordinates(
        (coordinates as [number, number][][])[0],
        bbox,
        pixelX,
        pixelY
      );
      pathString = `M${geojsonCoords.map(([x, y]) => `${x},${y}`).join('L')}Z`;
      break;

    case 'LineString':
      geojsonCoords = processCoordinates(
        coordinates as [number, number][],
        bbox,
        pixelX,
        pixelY
      );
      pathString = `M${geojsonCoords.map(([x, y]) => `${x},${y}`).join('L')}`;
      break;

    case 'MultiLineString':
      pathString = (coordinates as [number, number][][])
        .map((lineString) => {
          const coords = processCoordinates(lineString, bbox, pixelX, pixelY);
          return `M${coords.map(([x, y]) => `${x},${y}`).join('L')}`;
        })
        .join(' ');
      geojsonCoords = (coordinates as [number, number][][])
        .map((lineString) =>
          processCoordinates(lineString, bbox, pixelX, pixelY)
        )
        .flat();
      break;

    case 'Point':
      geojsonCoords = [
        calculateOffsets(
          (coordinates as [number, number])[0],
          (coordinates as [number, number])[1],
          bbox,
          pixelX,
          pixelY
        ),
      ];
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y} m${-PR},0 a${PR},${PR} 0 1,0 ${PR * 2},0 a${PR},${PR} 0 1,0 ${-PR * 2},0`
        )
        .join(' ');
      break;

    case 'MultiPoint':
      geojsonCoords = processCoordinates(
        coordinates as [number, number][],
        bbox,
        pixelX,
        pixelY
      );
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y} m${-PR},0 a${PR},${PR} 0 1,0 ${PR * 2},0 a${PR},${PR} 0 1,0 ${-PR * 2},0`
        )
        .join(' ');
      break;

    case 'MultiPolygon':
      geojsonCoords = (coordinates as [number, number][][][])
        .map((polygon) =>
          processCoordinates(polygon[0], bbox, pixelX, pixelY)
        )
        .flat();
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y}L${geojsonCoords
              .map(([cx, cy]) => `${cx},${cy}`)
              .join(' ')}Z`
        )
        .join(' ');
      break;

    default:
      throw new Error('Unsupported GeoJSON type');
  }

  return { geojsonCoords, pathString };
};
