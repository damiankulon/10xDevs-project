import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import type { Json } from '../supabase/database.types';
import type {
  TemplatePackageListResponseDto,
  TemplatePackageResponseDto,
  TrackerTemplateResponseDto,
  ApplyPackageResponseDto,
  DataType,
  TrackerConfig,
} from '@kipio/shared';

/**
 * Template package entity from database
 */
export type TemplatePackage = Tables<'template_packages'>;

/**
 * Tracker template entity from database
 */
export type TrackerTemplate = Tables<'tracker_templates'>;

/**
 * Tracker entity from database
 */
export type Tracker = Tables<'trackers'>;

/**
 * Profile with trackers_limit field
 */
interface ProfileWithLimit {
  trackers_limit: number;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Retrieves all active template packages with their tracker templates
   *
   * @returns List of active template packages with associated tracker templates
   * @throws InternalServerErrorException if database query fails
   */
  async findAllPackages(): Promise<TemplatePackageListResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch active packages with their tracker templates
    const { data: packages, error } = await supabase
      .from('template_packages')
      .select(
        `
        id,
        name,
        description,
        icon,
        display_order,
        tracker_templates (
          id,
          name,
          data_type,
          unit,
          config,
          icon,
          color,
          display_order
        )
      `
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch template packages', error);
      throw new InternalServerErrorException(
        'Failed to fetch template packages'
      );
    }

    // Map database results to response DTOs
    const data: TemplatePackageResponseDto[] = (packages || []).map((pkg) =>
      this.mapPackageToResponseDto(pkg)
    );

    return { data };
  }

  /**
   * Applies a template package by creating trackers for the user
   *
   * @param packageId - The ID of the package to apply
   * @param userId - The ID of the user applying the package
   * @returns Response with list of created trackers
   * @throws NotFoundException if package is not found or inactive
   * @throws ForbiddenException if user would exceed tracker limit
   * @throws InternalServerErrorException if database operations fail
   */
  async applyPackage(
    packageId: string,
    userId: string
  ): Promise<ApplyPackageResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Fetch the package with its templates
    const { data: pkg, error: packageError } = await supabase
      .from('template_packages')
      .select(
        `
        id,
        is_active,
        tracker_templates (
          id,
          name,
          data_type,
          unit,
          config,
          color,
          icon,
          display_order
        )
      `
      )
      .eq('id', packageId)
      .single();

    const pkgData = pkg as unknown as {
      id: string;
      is_active: boolean;
      tracker_templates: Array<{
        id: string;
        name: string;
        data_type: string;
        unit: string | null;
        config: Json;
        color: string | null;
        icon: string | null;
        display_order: number;
      }>;
    };

    if (packageError || !pkgData || !pkgData.is_active) {
      this.logger.warn(`Package not found or inactive: ${packageId}`);
      throw new NotFoundException('Package not found');
    }

    const templates = pkgData.tracker_templates || [];

    // 2. Check user's tracker limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trackers_limit')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      this.logger.error('Failed to fetch user profile', profileError);
      throw new InternalServerErrorException('Failed to fetch user profile');
    }

    const profileData = profile as unknown as ProfileWithLimit;

    // 3. Count existing trackers
    const { count: currentCount, error: countError } = await supabase
      .from('trackers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (countError) {
      this.logger.error('Failed to count user trackers', countError);
      throw new InternalServerErrorException('Failed to count user trackers');
    }

    // 4. Validate tracker limit
    const totalTrackers = (currentCount || 0) + templates.length;
    if (totalTrackers > profileData.trackers_limit) {
      throw new ForbiddenException('Would exceed tracker limit');
    }

    // 5. Create trackers from templates
    const trackersToInsert = templates
      .sort((a, b) => a.display_order - b.display_order)
      .map((template, index) => ({
        user_id: userId,
        name: template.name,
        data_type: template.data_type,
        unit: template.unit,
        config: template.config,
        color: template.color,
        icon: template.icon,
        display_order: (currentCount || 0) + index,
      }));

    const { data: createdTrackers, error: insertError } = await supabase
      .from('trackers')
      .insert(trackersToInsert as any)
      .select('id, name, data_type');

    if (insertError || !createdTrackers) {
      this.logger.error('Failed to create trackers', insertError);
      throw new InternalServerErrorException('Failed to create trackers');
    }

    const trackersData = createdTrackers as unknown as Array<{
      id: string;
      name: string;
      data_type: string;
    }>;

    return {
      message: 'Package applied successfully',
      created_trackers: trackersData.map((tracker) => ({
        id: tracker.id,
        name: tracker.name,
        data_type: tracker.data_type as DataType,
      })),
    };
  }

  /**
   * Maps a database package result to response DTO
   *
   * @param pkg - Package from database with nested tracker templates
   * @returns Mapped TemplatePackageResponseDto
   */
  private mapPackageToResponseDto(pkg: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    display_order: number;
    tracker_templates: Array<{
      id: string;
      name: string;
      data_type: string;
      unit: string | null;
      config: Json;
      icon: string | null;
      color: string | null;
      display_order: number;
    }>;
  }): TemplatePackageResponseDto {
    const templates = (pkg.tracker_templates || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(
        (t): TrackerTemplateResponseDto => ({
          id: t.id,
          name: t.name,
          data_type: t.data_type as DataType,
          unit: t.unit,
          config: t.config as TrackerConfig,
          icon: t.icon,
          color: t.color,
          display_order: t.display_order,
        })
      );

    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      icon: pkg.icon,
      display_order: pkg.display_order,
      trackers: templates,
    };
  }
}
