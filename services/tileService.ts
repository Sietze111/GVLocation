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
import { metrics } from './metrics.js';
import type { Crs } from '../utils/validateRD.js';

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

  async fetchSingleTile(
    url: string,
    stats?: { cacheHits: number; sourceTiles: number }
  ): Promise<Buffer> {
    const cached = tileCache.get(url);
    if (cached) {
      if (stats) stats.cacheHits += 1;
      return cached;
    }

    const maxAttempts = MAP_CONSTANTS.TILE_FETCH_RETRIES + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const started = Date.now();
        const response: AxiosResponse<Buffer> = await axios.get(url, {
          responseType: 'arraybuffer',
          ...AXIOS_OPTIONS,
        });
        metrics.observe('tile_fetch_duration_ms', Date.now() - started);
        const buffer = Buffer.from(response.data);
        tileCache.set(url, buffer);
        metrics.increment('tiles_fetched_total');
        if (stats) stats.sourceTiles += 1;
        return buffer;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 200)
          );
        }
      }
    }

    throw new TileError(`Failed to fetch tile after ${maxAttempts} attempts: ${url}`);
  },

  async fetchTiles(
    tileBaseUrl: string,
    z: number,
    tileX: number,
    tileY: number,
    pixelX: number,
    pixelY: number
  ): Promise<OverlayOptions[]> {
    const result = await tileService.fetchTilesWithMeta(
      tileBaseUrl,
      z,
      tileX,
      tileY,
      pixelX,
      pixelY
    );
    return result.tiles;
  },

  async fetchTilesWithMeta(
    tileBaseUrl: string,
    z: number,
    tileX: number,
    tileY: number,
    pixelX: number,
    pixelY: number
  ): Promise<{
    tiles: OverlayOptions[];
    cacheHits: number;
    sourceTiles: number;
  }> {
    const urls: string[] = [];
    for (let i = 0; i < 9; i++) {
      const dx = Math.floor(i / 3) - 1;
      const dy = (i % 3) - 1;
      urls.push(`${tileBaseUrl}/${z}/${tileX + dx}/${tileY + dy}.png`);
    }

    const stats = { cacheHits: 0, sourceTiles: 0 };
    const tileBuffers = await Promise.all(
      urls.map((url) => tileService.fetchSingleTile(url, stats))
    );

    const tiles = tileBuffers.map((imageBuffer, i) => {
      const dx = Math.floor(i / 3) - 1;
      const dy = (i % 3) - 1;
      const offsetX =
        MAP_CONSTANTS.TILE_SIZE / 2 - pixelX + dx * MAP_CONSTANTS.TILE_SIZE;
      const offsetY =
        MAP_CONSTANTS.TILE_SIZE / 2 - pixelY + dy * MAP_CONSTANTS.TILE_SIZE;
      return { input: imageBuffer, top: offsetY, left: offsetX };
    });

    return { tiles, cacheHits: stats.cacheHits, sourceTiles: stats.sourceTiles };
  },

  async calculateTileData(
    x: number,
    y: number,
    z: number,
    crs: Crs = 'rd'
  ): Promise<TileCalculationResult> {
    try {
      const wgs84Coords = coordinateService.toWgs84({ x, y }, crs);
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
