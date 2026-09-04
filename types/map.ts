import { Type } from '@sinclair/typebox';

export interface Coordinates {
  x: number;
  y: number;
}

export interface WGS84Coordinates {
  longitude: number;
  latitude: number;
}

export interface TileCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface PixelCoordinates {
  x: number;
  y: number;
}

export interface TileParams {
  z: number;
  x: string;
  y: string;
}

export const tileSchema = {
  params: Type.Object({
    z: Type.Number(),
    x: Type.String(),
    y: Type.String(),
  }),
  querystring: Type.Object({
    crs: Type.Optional(Type.String()),
    format: Type.Optional(Type.String()),
  }),
  response: {
    200: Type.String(),
  },
};
