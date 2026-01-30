import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standard error response structure
 * Matches the ErrorResponseDto from shared types
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: ValidationErrorDetail[];
  timestamp: string;
  path: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Global exception filter for consistent error responses
 * Catches all exceptions and formats them according to API specification
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;
    let details: ValidationErrorDetail[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = this.getErrorName(status);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = this.extractMessage(responseObj);
        error = (responseObj['error'] as string) || this.getErrorName(status);
        details = this.extractValidationDetails(responseObj);
      } else {
        message = 'An error occurred';
        error = this.getErrorName(status);
      }
    } else if (this.isSupabaseError(exception)) {
      // Handle Supabase errors
      const supabaseError = exception as { code?: string; message?: string };
      status = this.mapSupabaseErrorToStatus(supabaseError);
      message = supabaseError.message || 'Database error';
      error = this.getErrorName(status);

      this.logger.error(
        `Supabase error: ${supabaseError.code} - ${supabaseError.message}`,
        exception
      );
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error('Unknown error type', exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details && details.length > 0) {
      errorResponse.details = details;
    }

    // Log non-500 errors at warn level
    if (status >= 500) {
      this.logger.error(`${status} ${error}: ${message}`, request.url);
    } else if (status >= 400) {
      this.logger.warn(`${status} ${error}: ${message} - ${request.url}`);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Extracts the message from an exception response object
   */
  private extractMessage(responseObj: Record<string, unknown>): string {
    if (typeof responseObj['message'] === 'string') {
      return responseObj['message'];
    }
    if (Array.isArray(responseObj['message'])) {
      return responseObj['message'].join(', ');
    }
    return 'An error occurred';
  }

  /**
   * Extracts validation error details from class-validator errors
   */
  private extractValidationDetails(
    responseObj: Record<string, unknown>
  ): ValidationErrorDetail[] | undefined {
    const message = responseObj['message'];

    if (Array.isArray(message)) {
      return message.map((msg) => {
        if (typeof msg === 'string') {
          // Try to extract field name from message like "name must be..."
          const match = msg.match(/^(\w+)\s/);
          return {
            field: match ? match[1] : 'unknown',
            message: msg,
          };
        }
        return { field: 'unknown', message: String(msg) };
      });
    }

    return undefined;
  }

  /**
   * Maps HTTP status codes to error names
   */
  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };

    return errorNames[status] || 'Error';
  }

  /**
   * Checks if the exception is a Supabase error
   */
  private isSupabaseError(exception: unknown): boolean {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }
    const obj = exception as Record<string, unknown>;
    return 'code' in obj && 'message' in obj && typeof obj['code'] === 'string';
  }

  /**
   * Maps Supabase error codes to HTTP status codes
   */
  private mapSupabaseErrorToStatus(error: {
    code?: string;
    message?: string;
  }): number {
    const code = error.code || '';

    // PostgreSQL / Supabase error codes
    const errorCodeMap: Record<string, number> = {
      '23505': HttpStatus.CONFLICT, // unique_violation
      '23503': HttpStatus.BAD_REQUEST, // foreign_key_violation
      '23502': HttpStatus.BAD_REQUEST, // not_null_violation
      '23514': HttpStatus.BAD_REQUEST, // check_violation
      '42501': HttpStatus.FORBIDDEN, // insufficient_privilege
      '42P01': HttpStatus.INTERNAL_SERVER_ERROR, // undefined_table
      PGRST116: HttpStatus.NOT_FOUND, // No rows returned
      PGRST301: HttpStatus.INTERNAL_SERVER_ERROR, // Connection error
    };

    return errorCodeMap[code] || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
