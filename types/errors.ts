export class TileError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'TileError';
  }
}

export class ValidationError extends TileError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
