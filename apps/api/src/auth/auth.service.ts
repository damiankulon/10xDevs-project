import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase';
import {
  LoginDto,
  RegisterDto,
  PasswordResetDto,
  UpdatePasswordDto,
} from './dto';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      const supabase = this.supabaseService.getAdminClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error(`Login failed for ${email}: ${error.message}`);
        throw new UnauthorizedException('Nieprawidłowy email lub hasło');
      }

      if (!data.user || !data.session) {
        throw new UnauthorizedException('Nieprawidłowy email lub hasło');
      }

      this.logger.log(`User logged in: ${data.user.id}`);

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new BadRequestException('Wystąpił błąd podczas logowania');
    }
  }

  /**
   * Register new user with email and password
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password } = registerDto;

    try {
      const supabase = this.supabaseService.getAdminClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${this.configService.get('FRONTEND_URL')}/auth/callback`,
        },
      });

      if (error) {
        this.logger.error(`Registration failed for ${email}: ${error.message}`);

        if (error.message.includes('already registered')) {
          throw new ConflictException(
            'Użytkownik z tym adresem email już istnieje'
          );
        }

        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        throw new BadRequestException('Nie udało się utworzyć konta');
      }

      this.logger.log(`User registered: ${data.user.id}`);

      return {
        message:
          'Konto zostało utworzone. Sprawdź skrzynkę email w celu weryfikacji.',
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Registration error: ${error.message}`, error.stack);
      throw new BadRequestException('Wystąpił błąd podczas rejestracji');
    }
  }

  /**
   * Initiate password reset flow
   */
  async resetPassword(
    passwordResetDto: PasswordResetDto
  ): Promise<{ message: string }> {
    const { email } = passwordResetDto;

    try {
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${this.configService.get('FRONTEND_URL')}/update-password`,
      });

      if (error) {
        this.logger.error(
          `Password reset failed for ${email}: ${error.message}`
        );
        // Don't reveal whether email exists or not for security
      }

      // Always return success to prevent email enumeration
      this.logger.log(`Password reset requested for: ${email}`);

      return {
        message:
          'Jeśli konto istnieje, link do resetowania hasła został wysłany na podany adres email.',
      };
    } catch (error) {
      this.logger.error(`Password reset error: ${error.message}`, error.stack);
      throw new BadRequestException('Wystąpił błąd podczas resetowania hasła');
    }
  }

  /**
   * Update user password (requires valid access token in request)
   */
  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto
  ): Promise<{ message: string }> {
    const { password } = updatePasswordDto;

    try {
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password,
      });

      if (error) {
        this.logger.error(
          `Password update failed for user ${userId}: ${error.message}`
        );
        throw new BadRequestException('Nie udało się zmienić hasła');
      }

      this.logger.log(`Password updated for user: ${userId}`);

      return {
        message: 'Hasło zostało zmienione pomyślnie',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Password update error: ${error.message}`, error.stack);
      throw new BadRequestException('Wystąpił błąd podczas zmiany hasła');
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase.auth.admin.signOut(accessToken);

      if (error) {
        this.logger.error(`Logout failed: ${error.message}`);
        // Don't throw error, just log it
      }

      this.logger.log('User logged out');

      return {
        message: 'Wylogowano pomyślnie',
      };
    } catch (error) {
      this.logger.error(`Logout error: ${error.message}`, error.stack);
      // Always return success for logout
      return {
        message: 'Wylogowano pomyślnie',
      };
    }
  }
}
