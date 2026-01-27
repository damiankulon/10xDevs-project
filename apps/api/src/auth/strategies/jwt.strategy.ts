import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase';

/**
 * JWT payload structure from Supabase Auth
 */
export interface JwtPayload {
  sub: string; // User ID
  email?: string;
  aud: string;
  role?: string;
  exp: number;
  iat: number;
}

/**
 * User object attached to request after authentication
 */
export interface AuthUser {
  id: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService
  ) {
    const jwtSecret = configService.getOrThrow<string>('SUPABASE_JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Validates the JWT payload and returns the user object
   * This method is called by Passport after JWT signature verification
   *
   * @param payload - Decoded JWT payload
   * @returns AuthUser object to be attached to request
   * @throws UnauthorizedException if token is invalid
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      this.logger.warn('JWT payload missing sub claim');
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check if token is expired (additional safety check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      this.logger.warn(`Token expired for user ${payload.sub}`);
      throw new UnauthorizedException('Token expired');
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
