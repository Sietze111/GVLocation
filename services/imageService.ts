import type { OverlayOptions } from 'sharp';
import sharp from 'sharp';
import { MAP_CONSTANTS } from '../constants/map.js';

const T = MAP_CONSTANTS.TILE_SIZE;

export const imageService = {
  async createGeoJSONOverlay(
    pathString: string,
    kleur: string,
    xValue: number,
    attribution: string
  ): Promise<Buffer> {
    return sharp({
      create: {
        width: T,
        height: T,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
              <path d="${pathString}" stroke="${kleur}" fill="${kleur}" fill-opacity="0.5" stroke-width="1" />
              <rect x="${xValue}" y="${MAP_CONSTANTS.ATTRIBUTION_Y}" width="200" height="200" fill="black" opacity="0.5"/>
              <text x="${T - 5}" y="${T - 5}" fill="white" font-family="Arial" font-size="9" text-anchor="end">
                ${attribution}
              </text>
            </svg>`
          ),
          blend: 'dest-over',
        },
      ])
      .png()
      .toBuffer();
  },

  async createMarkerOverlay(
    tileBuffer: Buffer,
    pixelX: number,
    pixelY: number,
    markerRadius: number,
    attribution: string
  ): Promise<Buffer> {
    if (
      !Buffer.isBuffer(tileBuffer) ||
      typeof pixelX !== 'number' ||
      typeof pixelY !== 'number' ||
      typeof markerRadius !== 'number' ||
      typeof attribution !== 'string'
    ) {
      throw new Error('Invalid input parameters.');
    }

    const overlayedImageBuffer = await sharp(tileBuffer)
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
              <circle cx="${pixelX}" cy="${pixelY}" r="${markerRadius}" stroke="red" fill="rgba(255, 0, 0, 0.5)" fill-opacity="0.8" stroke-width="1.5" />
            </svg>`
          ),
          top: 0,
          left: 0,
          blend: 'over',
        },
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
              <rect x="170" y="${MAP_CONSTANTS.ATTRIBUTION_Y}" width="200" height="200" fill="gray" opacity="0.2"/>
              <text x="250" y="251" fill="black" font-family="Arial" font-size="9" text-anchor="end">
                ${attribution}
              </text>
            </svg>`
          ),
          top: 0,
          left: 0,
          blend: 'over',
        },
      ])
      .png()
      .toBuffer();

    return overlayedImageBuffer;
  },

  async createCompositeImage(
    tiles: OverlayOptions[],
    overlayedImageBuffer: Buffer
  ): Promise<Buffer> {
    return sharp({
      create: {
        width: T,
        height: T,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([...tiles, { input: overlayedImageBuffer }])
      .png()
      .toBuffer();
  },
};
