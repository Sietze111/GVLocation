export const VALIDATION_BOUNDS = {
  ZOOM: {
    MIN: 8,
    MAX: 19,
  },
  RD: {
    X: {
      MIN: 0,
      MAX: 300000,
    },
    Y: {
      MIN: 300000,
      MAX: 650000,
    },
  },
} as const;
