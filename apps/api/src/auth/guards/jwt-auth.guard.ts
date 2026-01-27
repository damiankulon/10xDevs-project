import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * Protects routes by requiring a valid JWT token in the Authorization header
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected-route')
 * async protectedMethod(@CurrentUser() user: AuthUser) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the request can proceed
   * Calls the parent AuthGuard which triggers JWT validation
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors
   * Called when JWT validation fails
   *
   * @param err - Error from Passport
   * @param user - User object (null if authentication failed)
   * @param info - Additional info about the failure
   * @throws UnauthorizedException with appropriate message
   */
  handleRequest<TUser = any>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      const message = info?.message || 'Unauthorized';

      // Provide user-friendly error messages
      if (message.includes('expired')) {
        throw new UnauthorizedException('Token expired');
      }
      if (message.includes('jwt')) {
        throw new UnauthorizedException('Invalid token');
      }

      throw new UnauthorizedException(message);
    }

    return user;
  }
}
