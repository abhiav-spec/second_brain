export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;
    public readonly details?: unknown;

    constructor(
        statusCode: number,
        message: string,
        options?: {
            code?: string;
            details?: unknown;
            isOperational?: boolean;
        }
    ) {
        super(message);

        this.name = "ApiError";
        this.statusCode = statusCode;
        this.isOperational = options?.isOperational ?? true;
        this.code = options?.code;
        this.details = options?.details;

        Error.captureStackTrace(this, this.constructor);
    }
}