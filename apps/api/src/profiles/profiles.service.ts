import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';

export type Profile = Tables<'profiles'>;

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Retrieves all active profiles (admin only - bypasses RLS)
   */
  async findAll(): Promise<Profile[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch profiles', error);
      throw error;
    }

    return data;
  }

  /**
   * Retrieves a profile by user ID
   */
  async findById(id: string): Promise<Profile> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch profile ${id}`, error);
      throw error;
    }

    if (!data) {
      throw new NotFoundException(`Profile with id ${id} not found`);
    }

    return data;
  }

  /**
   * Retrieves the current user's profile using their access token
   * Respects RLS policies
   */
  async findCurrentUser(accessToken: string): Promise<Profile> {
    const supabase = this.supabaseService.getClientForUser(accessToken);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .single();

    if (error) {
      this.logger.error('Failed to fetch current user profile', error);
      throw error;
    }

    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    return data;
  }

  /**
   * Updates a profile by user ID
   */
  async update(
    id: string,
    updates: Partial<
      Pick<
        Profile,
        'display_name' | 'onboarding_completed' | 'preferred_theme' | 'timezone'
      >
    >
  ): Promise<Profile> {
    const supabase = this.supabaseService.getAdminClient();

    // Note: Using type assertion due to Supabase SDK v2.89+ type inference issues
    const { data, error } = await supabase
      .from('profiles')
      .update(updates as never)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single<Profile>();

    if (error) {
      this.logger.error(`Failed to update profile ${id}`, error);
      throw error;
    }

    if (!data) {
      throw new NotFoundException(`Profile with id ${id} not found`);
    }

    return data;
  }

  /**
   * Soft deletes a profile
   */
  async softDelete(id: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    // Note: Using type assertion due to Supabase SDK v2.89+ type inference issues
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      this.logger.error(`Failed to soft delete profile ${id}`, error);
      throw error;
    }
  }
}
