import { Type } from '@sinclair/typebox';

export const complexTileSchema = {
  params: Type.Object({
    z: Type.Number(),
    x: Type.String(),
    y: Type.String(),
  }),
  querystring: Type.Object({
    geojson: Type.Optional(Type.String()),
    achtergrond: Type.Optional(Type.String()),
    kleur: Type.Optional(Type.String()),
    crs: Type.Optional(Type.String()),
    format: Type.Optional(Type.String()),
  }),
  response: {
    200: {
      type: 'string' as const,
    },
  },
};
