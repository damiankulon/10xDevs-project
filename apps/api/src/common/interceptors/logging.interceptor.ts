import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Logging interceptor for performance monitoring
 * Logs request method, URL, user ID, and response time
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, user } = request as Request & {
      user?: { id: string };
    };
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          const userId = user?.id || 'anonymous';
          this.logger.log(
            `${method} ${url} - User: ${userId} - ${responseTime}ms`
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          const userId = user?.id || 'anonymous';
          this.logger.error(
            `${method} ${url} - User: ${userId} - ${responseTime}ms - Error: ${error.message}`
          );
        },
      })
    );
  }
}
