import * as jose from 'jose';

export interface JwtPayload {
  sub: string; // User ID
  email?: string;
  aud: string;
  role?: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<AuthUser | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const jwtPayload = payload as unknown as JwtPayload;

    // Check if token is expired
    if (jwtPayload.exp && Date.now() >= jwtPayload.exp * 1000) {
      return null;
    }

    return {
      id: jwtPayload.sub,
      email: jwtPayload.email,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
