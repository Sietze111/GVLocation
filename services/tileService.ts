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
import { tileCache } from './tileCache.js';
import { httpsAgent } from '../utils/httpAgent.js';

interface TileCalculationResult {
  tileCoords: TileCoordinates;
  pixelCoords: PixelCoordinates;
  tileBuffer: Buffer;
}

const AXIOS_OPTIONS = {
  timeout: MAP_CONSTANTS.TILE_FETCH_TIMEOUT_MS,
  httpsAgent,
  headers: {
    'User-Agent': MAP_CONSTANTS.USER_AGENT,
  },
};

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

  async fetchSingleTile(url: string): Promise<Buffer> {
    const cached = tileCache.get(url);
    if (cached) return cached;

    const response: AxiosResponse<Buffer> = await axios.get(url, {
      responseType: 'arraybuffer',
      ...AXIOS_OPTIONS,
    });
    const buffer = Buffer.from(response.data);
    tileCache.set(url, buffer);
    return buffer;
  },

  async fetchTiles(
    tileBaseUrl: string,
    z: number,
    tileX: number,
    tileY: number,
    pixelX: number,
    pixelY: number
  ): Promise<OverlayOptions[]> {
    const urls: string[] = [];
    for (let i = 0; i < 9; i++) {
      const dx = Math.floor(i / 3) - 1;
      const dy = (i % 3) - 1;
      urls.push(`${tileBaseUrl}/${z}/${tileX + dx}/${tileY + dy}.png`);
    }

    const tileBuffers = await Promise.all(
      urls.map((url) => tileService.fetchSingleTile(url))
    );

    return tileBuffers.map((imageBuffer, i) => {
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
    return tileService.fetchSingleTile(tileUrl);
  },
};
