export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function unprocessable(message: string): HttpError {
  return new HttpError(422, message);
}

export function tooManyRequests(message: string, retryAfterSeconds: number): HttpError {
  return new HttpError(429, message, retryAfterSeconds);
}

export function serviceUnavailable(message: string, retryAfterSeconds?: number): HttpError {
  return new HttpError(503, message, retryAfterSeconds);
}

export function badGateway(message: string): HttpError {
  return new HttpError(502, message);
}