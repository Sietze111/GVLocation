import { Type } from '@sinclair/typebox';

export const batchSchema = {
  body: Type.Object({
    items: Type.Array(
      Type.Object({
        z: Type.Number(),
        x: Type.String(),
        y: Type.String(),
        geojson: Type.Optional(Type.String()),
        achtergrond: Type.Optional(Type.String()),
        kleur: Type.Optional(Type.String()),
      }),
      { minItems: 1, maxItems: 100 }
    ),
  }),
  response: {
    200: Type.Object({
      results: Type.Array(
        Type.Object({
          index: Type.Number(),
          image: Type.String({ description: 'Base64-encoded PNG' }),
          adjustedZoom: Type.Optional(Type.Number()),
        })
      ),
      stats: Type.Object({
        total: Type.Number(),
        success: Type.Number(),
        failed: Type.Number(),
        cacheStats: Type.Object({
          size: Type.Number(),
          hitRate: Type.Number(),
        }),
      }),
    }),
    400: Type.Object({
      error: Type.String(),
    }),
  },
};
