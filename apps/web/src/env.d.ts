/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client';

interface AuthUser {
  id: string;
  email?: string;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: AuthUser;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_JWT_SECRET: string;
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
