import type { OverlayOptions } from 'sharp';
import sharp from 'sharp';
import { MAP_CONSTANTS, OutputFormat } from '../constants/map.js';
import type { GeoJSONPath } from './geojsonUtils.js';

const T = MAP_CONSTANTS.TILE_SIZE;

const applyFormat = (
  pipeline: sharp.Sharp,
  format: OutputFormat
): sharp.Sharp => {
  switch (format) {
    case 'webp':
      return pipeline.webp({ quality: 85 });
    case 'avif':
      return pipeline.avif({ quality: 70 });
    case 'png':
    default:
      return pipeline.png();
  }
};

const transparentCanvas = (): sharp.Sharp =>
  sharp({
    create: {
      width: T,
      height: T,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

export const imageService = {
  async createGeoJSONOverlay(
    path: GeoJSONPath,
    kleur: string,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT
  ): Promise<Buffer> {
    const { pathString, isFilled } = path;
    const fillAttrs = isFilled
      ? `fill="${kleur}" fill-opacity="0.5" fill-rule="evenodd"`
      : 'fill="none"';

    return applyFormat(
      transparentCanvas().composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
              <path d="${pathString}" ${fillAttrs} stroke="${kleur}" stroke-width="1.5" />
            </svg>`
          ),
          blend: 'dest-over',
        },
      ]),
      format
    ).toBuffer();
  },

  async createMarkerOverlay(
    tileBuffer: Buffer,
    pixelX: number,
    pixelY: number,
    markerRadius: number,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT,
    kleur: string = MAP_CONSTANTS.DEFAULT_COLOR
  ): Promise<Buffer> {
    if (
      !Buffer.isBuffer(tileBuffer) ||
      typeof pixelX !== 'number' ||
      typeof pixelY !== 'number' ||
      typeof markerRadius !== 'number'
    ) {
      throw new Error('Invalid input parameters.');
    }

    const pipeline = sharp(tileBuffer).composite([
      {
        input: markerSvg(pixelX, pixelY, markerRadius, kleur),
        top: 0,
        left: 0,
        blend: 'over',
      },
    ]);

    return applyFormat(pipeline, format).toBuffer();
  },

  async createMarkerOnly(
    pixelX: number,
    pixelY: number,
    markerRadius: number,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT,
    kleur: string = MAP_CONSTANTS.DEFAULT_COLOR
  ): Promise<Buffer> {
    const pipeline = transparentCanvas().composite([
      {
        input: markerSvg(pixelX, pixelY, markerRadius, kleur),
        top: 0,
        left: 0,
        blend: 'over',
      },
    ]);

    return applyFormat(pipeline, format).toBuffer();
  },

  async createCompositeImage(
    tiles: OverlayOptions[],
    overlayedImageBuffer: Buffer,
    format: OutputFormat = MAP_CONSTANTS.DEFAULT_FORMAT
  ): Promise<Buffer> {
    const pipeline = transparentCanvas().composite([
      ...tiles,
      { input: overlayedImageBuffer },
    ]);

    return applyFormat(pipeline, format).toBuffer();
  },
};

const markerSvg = (
  x: number,
  y: number,
  radius: number,
  kleur: string
): Buffer =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
      <circle cx="${x}" cy="${y}" r="${radius}" stroke="${kleur}" fill="${kleur}" fill-opacity="0.5" stroke-width="1.5" />
    </svg>`
  );
