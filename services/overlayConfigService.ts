import { MAP_CONSTANTS } from '../constants/map.js';

export const overlayConfigService = {
  getAttributionConfig(achtergrond: string | undefined) {
    const attribution =
      achtergrond === 'luchtfoto'
        ? MAP_CONSTANTS.PDOK_ATTRIBUTION
        : MAP_CONSTANTS.OSM_ATTRIBUTION;

    const xValue =
      attribution === MAP_CONSTANTS.PDOK_ATTRIBUTION
        ? MAP_CONSTANTS.ATTRIBUTION_X_PDOK
        : MAP_CONSTANTS.ATTRIBUTION_X_OSM;

    return { attribution, xValue };
  },
};
