import { MAP_CONSTANTS } from '../constants/map';
import { handleGeoJSON } from './geojsonUtils';
import { imageService } from './imageService';
import { overlayConfigService } from './overlayConfigService';

interface PixelCoords {
  x: number;
  y: number;
}

export const overlayService = {
  async createOverlay(
    geojson: string | undefined,
    achtergrond: string | undefined,
    kleur: string,
    bbox: [number, number, number, number],
    pixelCoords: PixelCoords
  ): Promise<Buffer> {
    if (!geojson) {
      return imageService.createMarkerOverlay(
        Buffer.from(''),
        pixelCoords.x,
        pixelCoords.y,
        MAP_CONSTANTS.MARKER_RADIUS,
        MAP_CONSTANTS.ATTRIBUTION
      );
    }

    const { type, coordinates } = JSON.parse(geojson);
    const { attribution, xValue } =
      overlayConfigService.getAttributionConfig(achtergrond);

    const { pathString } = handleGeoJSON(
      type,
      coordinates,
      bbox,
      pixelCoords.x,
      pixelCoords.y,
      kleur
    );

    return imageService.createGeoJSONOverlay(
      pathString,
      kleur,
      xValue,
      attribution
    );
  },
};
