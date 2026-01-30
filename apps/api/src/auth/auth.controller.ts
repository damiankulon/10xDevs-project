import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  PasswordResetDto,
  UpdatePasswordDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint
   * POST /api/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.login(loginDto);

    // Set HTTP-only cookie with refresh token
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return access token and user info in response body
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Register endpoint
   * POST /api/auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Logout endpoint
   * POST /api/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') || '';

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return this.authService.logout(accessToken);
  }

  /**
   * Password reset request endpoint
   * POST /api/auth/password-reset
   */
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.resetPassword(passwordResetDto);
  }

  /**
   * Update password endpoint (protected route)
   * POST /api/auth/update-password
   */
  @Post('update-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @CurrentUser() user: AuthUser,
    @Body() updatePasswordDto: UpdatePasswordDto
  ) {
    return this.authService.updatePassword(user.id, updatePasswordDto);
  }
}
