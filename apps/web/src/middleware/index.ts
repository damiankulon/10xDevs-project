import { defineMiddleware } from 'astro:middleware';
import { verifyJwt } from '../lib/auth/jwt';
import { supabaseClient } from '../db/supabase.client';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/auth/login',
  '/register',
  '/auth/register',
  '/password-reset',
  '/auth/password-reset',
  '/update-password',
  '/auth/update-password',
];

// API paths are public (handled by NestJS)
const isApiPath = (pathname: string) => pathname.startsWith('/api/');

export const onRequest = defineMiddleware(async (context, next) => {
  // Make Supabase client available in context
  context.locals.supabase = supabaseClient;

  const { url, cookies, redirect } = context;
  const pathname = new URL(url).pathname;

  // Skip auth check for public paths and API routes
  if (PUBLIC_PATHS.includes(pathname) || isApiPath(pathname)) {
    return next();
  }

  // Try to get access token from cookie or Authorization header
  let accessToken = cookies.get('accessToken')?.value;

  if (!accessToken) {
    const authHeader = context.request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }

  if (!accessToken) {
    // No token found, redirect to login
    return redirect('/login');
  }

  // Verify JWT token
  const jwtSecret = import.meta.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error('SUPABASE_JWT_SECRET is not configured');
    return redirect('/login');
  }

  const user = await verifyJwt(accessToken, jwtSecret);

  if (!user) {
    // Invalid or expired token, redirect to login
    cookies.delete('accessToken', { path: '/' });
    return redirect('/login');
  }

  // Attach user to context
  context.locals.user = user;

  return next();
});
