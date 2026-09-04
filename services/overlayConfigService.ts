import { MAP_CONSTANTS } from '../constants/map.js';

export const overlayConfigService = {
  getAttribution(achtergrond: string | undefined): string {
    return achtergrond === 'luchtfoto' || achtergrond === 'pdok'
      ? MAP_CONSTANTS.PDOK_ATTRIBUTION
      : MAP_CONSTANTS.OSM_ATTRIBUTION;
  },
};
