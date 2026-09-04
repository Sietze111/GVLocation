import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import { handleGeoJSON } from './geojsonUtils.js';
import { imageService } from './imageService.js';
import { overlayConfigService } from './overlayConfigService.js';

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
    achtergrond: string | undefined,
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
        MAP_CONSTANTS.OSM_ATTRIBUTION,
        format
      );
    }

    const { attribution, xValue } =
      overlayConfigService.getAttributionConfig(achtergrond);

    const { pathString } = handleGeoJSON(
      geojson.type,
      geojson.coordinates,
      bbox,
      pixelCoords.x,
      pixelCoords.y,
      kleur
    );

    return imageService.createGeoJSONOverlay(
      pathString,
      kleur,
      xValue,
      attribution,
      format
    );
  },
};
