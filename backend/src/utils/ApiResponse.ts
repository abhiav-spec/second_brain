export class ApiResponse<T = unknown> {
    public readonly success = true;
    public readonly statusCode: number;
    public readonly message: string;
    public readonly data: T;

    constructor(
        statusCode: number,
        message: string,
        data: T
    ) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}