export const processCoordinates = (
  coords: [number, number][],
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number
): [number, number][] => {
  return coords.map(([lon, lat]) => {
    const geoX = Math.round(
      ((Number(lon) - bbox[0]) / (bbox[2] - bbox[0])) * 256
    );
    const geoY = Math.round(
      ((bbox[3] - Number(lat)) / (bbox[3] - bbox[1])) * 256
    );
    const offsetX = geoX - pixelX + 128;
    const offsetY = geoY - pixelY + 128;

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
  const geoX = Math.round(((lon - bbox[0]) / (bbox[2] - bbox[0])) * 256);
  const geoY = Math.round(((bbox[3] - lat) / (bbox[3] - bbox[1])) * 256);
  const offsetX = geoX - pixelX + 128;
  const offsetY = geoY - pixelY + 128;
  return [offsetX, offsetY];
};

export const handleGeoJSON = (
  type: string,
  coordinates: any,
  bbox: [number, number, number, number],
  pixelX: number,
  pixelY: number,
  kleur: string
): { geojsonCoords: [number, number][]; pathString: string } => {
  let geojsonCoords: [number, number][] = [];
  let pathString = '';

  switch (type) {
    case 'Polygon':
      geojsonCoords = processCoordinates(coordinates[0], bbox, pixelX, pixelY);
      pathString = `M${geojsonCoords.map(([x, y]) => `${x},${y}`).join('L')}Z`;
      break;

    case 'LineString':
      geojsonCoords = processCoordinates(coordinates, bbox, pixelX, pixelY);
      pathString = `M${geojsonCoords.map(([x, y]) => `${x},${y}`).join('L')}Z`;
      break;

    case 'MultiLineString':
      geojsonCoords = (coordinates as [number, number][][])
        .map((lineString) =>
          processCoordinates(lineString, bbox, pixelX, pixelY)
        )
        .flat();
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y}L${geojsonCoords.map(([x, y]) => `${x},${y}`).join(' ')}`
        )
        .join(' ');
      break;

    case 'Point':
      geojsonCoords = [
        calculateOffsets(coordinates[0], coordinates[1], bbox, pixelX, pixelY),
      ];
      const pointRadius = 4;
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y} m${-pointRadius},0 a${pointRadius},${pointRadius} 0 1,0 ${
              pointRadius * 2
            },0 a${pointRadius},${pointRadius} 0 1,0 ${-pointRadius * 2},0`
        )
        .join(' ');
      break;

    case 'MultiPoint':
      geojsonCoords = processCoordinates(coordinates, bbox, pixelX, pixelY);
      const multiPointRadius = 4;
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y} m${-multiPointRadius},0 a${multiPointRadius},${multiPointRadius} 0 1,0 ${
              multiPointRadius * 2
            },0 a${multiPointRadius},${multiPointRadius} 0 1,0 ${
              -multiPointRadius * 2
            },0`
        )
        .join(' ');
      break;

    case 'MultiPolygon':
      geojsonCoords = (coordinates as [number, number][][][])
        .map((polygon) => processCoordinates(polygon[0], bbox, pixelX, pixelY))
        .flat();
      pathString = geojsonCoords
        .map(
          ([x, y]) =>
            `M${x},${y}L${geojsonCoords
              .map(([x, y]) => `${x},${y}`)
              .join(' ')}Z`
        )
        .join(' ');
      break;

    default:
      throw new Error('Unsupported GeoJSON type');
  }

  return { geojsonCoords, pathString };
};
