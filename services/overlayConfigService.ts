import { TILE_CONSTANTS } from '../constants/tileMap';

export const overlayConfigService = {
  getAttributionConfig(achtergrond: string | undefined) {
    const attribution =
      achtergrond === 'luchtfoto'
        ? TILE_CONSTANTS.PDOK_ATTRIBUTION
        : TILE_CONSTANTS.OSM_ATTRIBUTION;

    const xValue =
      attribution === TILE_CONSTANTS.PDOK_ATTRIBUTION
        ? TILE_CONSTANTS.ATTRIBUTION_X_PDOK
        : TILE_CONSTANTS.ATTRIBUTION_X_OSM;

    return { attribution, xValue };
  },
};
