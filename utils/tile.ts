import axios from 'axios';

// Fetch tile image from OpenStreetMap
export async function fetchTileImage(z: number, x: number, y: number) {
  const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const { data: tileBuffer } = await axios.get(tileUrl, {
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
  });
  return Buffer.from(tileBuffer, 'binary');
}
