import {
    Request,
    Response,
    NextFunction,
    ErrorRequestHandler,
} from "express";

import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

import { ApiError } from "../utils/ApiError";
import { ErrorResponse } from "../types/common.types";

const isProduction = process.env.NODE_ENV === "production";

const globalErrorHandler: ErrorRequestHandler = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = "Internal Server Error";
    let code: string | undefined;
    let errors: unknown;

    /*
     * -----------------------------------------
     * 1. Our custom ApiError
     * -----------------------------------------
     */

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code;
        errors = err.details;
    }

    /*
     * -----------------------------------------
     * 2. Zod validation errors
     * -----------------------------------------
     */

    else if (err instanceof ZodError) {
        statusCode = 400;
        message = "Validation failed";

        errors = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));

        code = "VALIDATION_ERROR";
    }

    /*
     * -----------------------------------------
     * 3. Prisma known request errors
     * -----------------------------------------
     */

    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        code = err.code;

        switch (err.code) {
            case "P2002":
                statusCode = 409;
                message = "A record with this value already exists.";
                break;

            case "P2025":
                statusCode = 404;
                message = "The requested record was not found.";
                break;

            default:
                statusCode = 400;
                message = "Database operation failed.";
        }
    }

    /*
     * -----------------------------------------
     * 4. Prisma validation error
     * -----------------------------------------
     */

    else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid database request.";
        code = "DATABASE_VALIDATION_ERROR";
    }

    /*
     * -----------------------------------------
     * 5. JWT errors
     * -----------------------------------------
     */

    else if (err instanceof jwt.TokenExpiredError) {
        statusCode = 401;
        message = "Authentication token has expired.";
        code = "TOKEN_EXPIRED";
    }

    else if (err instanceof jwt.JsonWebTokenError) {
        statusCode = 401;
        message = "Invalid authentication token.";
        code = "INVALID_TOKEN";
    }

    /*
     * -----------------------------------------
     * 6. Unknown error
     * -----------------------------------------
     */

    else if (err instanceof Error) {
        /*
         * IMPORTANT:
         *
         * Do not expose err.message to the client
         * for unknown production errors.
         */
        if (!isProduction) {
            message = err.message;
        }
    }

    /*
     * -----------------------------------------
     * Logging
     * -----------------------------------------
     */

    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode,
        message:
            err instanceof Error
                ? err.message
                : String(err),
        stack:
            err instanceof Error
                ? err.stack
                : undefined,
        userId: req.user?.id ?? undefined,
    };

    if (statusCode >= 500) {
        console.error("INTERNAL SERVER ERROR", logData);
    } else if (!isProduction) {
        console.warn("REQUEST ERROR", logData);
    }

    /*
     * -----------------------------------------
     * Response
     * -----------------------------------------
     */

    const response: ErrorResponse = {
        success: false,
        statusCode,
        message,
    };

    if (code) {
        response.code = code;
    }

    if (errors) {
        response.errors = errors;
    }

    /*
     * NEVER expose stack traces in production.
     */

    if (!isProduction && err instanceof Error) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

export { globalErrorHandler };