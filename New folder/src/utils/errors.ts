export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message = 'Resource not found') =>
  new AppError(404, 'not_found', message);

export const forbidden = (message = 'Forbidden') => new AppError(403, 'forbidden', message);

export const badRequest = (message = 'Bad request', details?: unknown) =>
  new AppError(400, 'bad_request', message, details);
