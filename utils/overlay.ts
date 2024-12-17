import sharp from 'sharp';

/**
 * Create a marker overlay on the tile image.
 * @param tileBuffer The buffer containing the tile image.
 * @param pixelX The X coordinate of the marker in pixels.
 * @param pixelY The Y coordinate of the marker in pixels.
 * @param markerRadius The radius of the marker circle in pixels.
 * @param attribution The attribution text to be displayed.
 * @returns A Promise resolving to the buffer of the overlayed image.
 */
export async function createMarkerOverlay(
  tileBuffer: Buffer,
  pixelX: number,
  pixelY: number,
  markerRadius: number,
  attribution: string
): Promise<Buffer> {
  // Validate input parameters
  if (
    !Buffer.isBuffer(tileBuffer) ||
    typeof pixelX !== 'number' ||
    typeof pixelY !== 'number' ||
    typeof markerRadius !== 'number' ||
    typeof attribution !== 'string'
  ) {
    throw new Error('Invalid input parameters.');
  }

  // Create marker overlay using Sharp
  const overlayedImageBuffer = await sharp(tileBuffer)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
            <circle cx="${pixelX}" cy="${pixelY}" r="${markerRadius}" stroke="red" fill="rgba(255, 0, 0, 0.5)" fill-opacity="0.8" stroke-width="1.5" />
          </svg>`
        ),
        top: 0,
        left: 0,
        blend: 'over',
      },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
       <!-- Background rectangle -->
       <rect x="170" y="240" width="200" height="200" fill="gray" opacity="0.2"/>
     
       <!-- Attribution text -->
       <text x="250" y="251" fill="black" font-family="Arial" font-size="9" text-anchor="end">
         ${attribution}
       </text>
     </svg>
     `
        ),
        top: 0,
        left: 0,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer();

  return overlayedImageBuffer;
}
