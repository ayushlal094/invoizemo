export class AppError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>   // 4th arg — validation field errors
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.name = 'AppError';
  }
}

// Type guard — used by errorHandler.ts
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
