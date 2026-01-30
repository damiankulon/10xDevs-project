import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY'
    );

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized');
  }

  /**
   * Returns the Supabase admin client with service role privileges
   * Use with caution - bypasses RLS policies
   */
  getAdminClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  /**
   * Creates a Supabase client authenticated as a specific user
   * Respects RLS policies based on user's JWT
   */
  getClientForUser(accessToken: string): SupabaseClient<Database> {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseAnonKey =
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY');

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
