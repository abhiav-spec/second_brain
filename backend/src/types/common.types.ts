export interface ErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    code?: string;
    errors?: unknown;
    stack?: string;
}