export class EthoraFaucetError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'EthoraFaucetError';
  }
}

export class RateLimitError extends EthoraFaucetError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class CooldownError extends EthoraFaucetError {
  constructor(
    message: string,
    public readonly expiresAt?: string,
  ) {
    super(message, 409);
    this.name = 'CooldownError';
  }
}
