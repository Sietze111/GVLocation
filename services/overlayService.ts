import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import { handleGeoJSON } from './geojsonUtils.js';
import { imageService } from './imageService.js';

interface PixelCoords {
  x: number;
  y: number;
}

interface ParsedGeoJSON {
  type: string;
  coordinates: unknown;
}

export const overlayService = {
  async createOverlay(
    geojson: ParsedGeoJSON | undefined,
    kleur: string,
    bbox: [number, number, number, number],
    pixelCoords: PixelCoords,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT
  ): Promise<Buffer> {
    if (!geojson) {
      return imageService.createMarkerOnly(
        pixelCoords.x,
        pixelCoords.y,
        MAP_CONSTANTS.MARKER_RADIUS,
        format,
        kleur
      );
    }

    const path = handleGeoJSON(
      geojson.type,
      geojson.coordinates,
      bbox,
      pixelCoords.x,
      pixelCoords.y
    );

    return imageService.createGeoJSONOverlay(path, kleur, format);
  },
};
