import tilebelt from '@mapbox/tilebelt';
import axios, { AxiosResponse } from 'axios';
import { OverlayOptions } from 'sharp';
import { MAP_CONSTANTS } from '../constants/map.js';
import { TileError } from '../types/errors.js';
import type {
  PixelCoordinates,
  TileCoordinates,
  WGS84Coordinates,
} from '../types/map.js';
import { coordinateService } from './coordinateService.js';

interface TileCalculationResult {
  tileCoords: TileCoordinates;
  pixelCoords: PixelCoordinates;
  tileBuffer: Buffer;
}

const AXIOS_TIMEOUT = { timeout: MAP_CONSTANTS.TILE_FETCH_TIMEOUT_MS };

export const tileService = {
  calculateTileCoordinates(
    coords: WGS84Coordinates,
    z: number
  ): TileCoordinates {
    const [x, y] = tilebelt.pointToTile(coords.longitude, coords.latitude, z);
    return { x, y, z };
  },

  calculatePixelCoordinates(
    wgs84Coords: WGS84Coordinates,
    tileCoords: TileCoordinates
  ): PixelCoordinates {
    const bbox = tilebelt.tileToBBOX([
      tileCoords.x,
      tileCoords.y,
      tileCoords.z,
    ]);

    return {
      x: Math.round(
        ((wgs84Coords.longitude - bbox[0]) / (bbox[2] - bbox[0])) *
          MAP_CONSTANTS.TILE_SIZE
      ),
      y: Math.round(
        ((bbox[3] - wgs84Coords.latitude) / (bbox[3] - bbox[1])) *
          MAP_CONSTANTS.TILE_SIZE
      ),
    };
  },

  async fetchTiles(
    tileBaseUrl: string,
    z: number,
    tileX: number,
    tileY: number,
    pixelX: number,
    pixelY: number
  ): Promise<OverlayOptions[]> {
    const tilePromises: Promise<AxiosResponse<Buffer>>[] = Array.from(
      { length: 9 },
      (_, i) => {
        const dx = Math.floor(i / 3) - 1;
        const dy = (i % 3) - 1;
        const currTileX = tileX + dx;
        const currTileY = tileY + dy;
        const url = `${tileBaseUrl}/${z}/${currTileX}/${currTileY}.png`;
        return axios.get(url, {
          responseType: 'arraybuffer',
          ...AXIOS_TIMEOUT,
        });
      }
    );

    const tileResponses = await Promise.all(tilePromises);

    return tileResponses.map((response, i) => {
      const { data: imageBuffer } = response;
      const dx = Math.floor(i / 3) - 1;
      const dy = (i % 3) - 1;
      const offsetX =
        MAP_CONSTANTS.TILE_SIZE / 2 - pixelX + dx * MAP_CONSTANTS.TILE_SIZE;
      const offsetY =
        MAP_CONSTANTS.TILE_SIZE / 2 - pixelY + dy * MAP_CONSTANTS.TILE_SIZE;
      return { input: imageBuffer, top: offsetY, left: offsetX };
    });
  },

  async calculateTileData(
    x: number,
    y: number,
    z: number
  ): Promise<TileCalculationResult> {
    try {
      const wgs84Coords = coordinateService.rdToWgs84({ x, y });
      const tileCoords = tileService.calculateTileCoordinates(wgs84Coords, z);
      const pixelCoords = tileService.calculatePixelCoordinates(
        wgs84Coords,
        tileCoords
      );

      const tileBuffer = await tileService.fetchTileImage(
        z,
        tileCoords.x,
        tileCoords.y
      );

      return {
        tileCoords,
        pixelCoords,
        tileBuffer,
      };
    } catch (error) {
      if (error instanceof TileError) {
        throw error;
      }
      throw new TileError('Failed to calculate tile data');
    }
  },

  async fetchTileImage(z: number, x: number, y: number): Promise<Buffer> {
    const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const { data: tileBuffer } = await axios.get(tileUrl, {
      responseType: 'arraybuffer',
      responseEncoding: 'binary',
      ...AXIOS_TIMEOUT,
    });
    return Buffer.from(tileBuffer, 'binary');
  },
};
