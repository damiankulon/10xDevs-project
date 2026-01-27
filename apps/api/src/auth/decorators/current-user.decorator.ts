import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../strategies/jwt.strategy';

/**
 * Parameter decorator to extract the authenticated user from the request
 *
 * Usage:
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * async getMe(@CurrentUser() user: AuthUser) {
 *   return user;
 * }
 *
 * // Or get specific property
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * async getMe(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext
  ): AuthUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      return undefined;
    }

    // If a specific property is requested, return just that property
    if (data) {
      return user[data];
    }

    return user;
  }
);
