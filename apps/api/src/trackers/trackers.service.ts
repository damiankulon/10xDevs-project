import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import type { Json } from '../supabase/database.types';
import { CreateTrackerDto } from './dto/create-tracker.dto';

/**
 * Tracker entity type from database
 */
export type Tracker = Tables<'trackers'>;

/**
 * Response DTO for tracker (excludes deleted_at)
 */
export type TrackerResponseDto = Omit<Tracker, 'deleted_at'>;

/**
 * Profile with trackers_limit field
 */
interface ProfileWithLimit {
  trackers_limit: number;
}

@Injectable()
export class TrackersService {
  private readonly logger = new Logger(TrackersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Creates a new tracker for the specified user
   *
   * @param userId - The ID of the user creating the tracker
   * @param createTrackerDto - The tracker data to create
   * @returns The created tracker
   * @throws ForbiddenException if user has reached their tracker limit
   * @throws BadRequestException if unit is provided for non-number types or config is invalid
   */
  async create(
    userId: string,
    createTrackerDto: CreateTrackerDto
  ): Promise<TrackerResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Validate unit is only provided for 'number' data_type
    if (createTrackerDto.unit && createTrackerDto.data_type !== 'number') {
      throw new BadRequestException(
        "unit is only allowed for data_type 'number'"
      );
    }

    // Validate config for 'scale' data_type
    if (createTrackerDto.data_type === 'scale') {
      if (
        !createTrackerDto.config ||
        typeof (createTrackerDto.config as { min?: number; max?: number })
          .min !== 'number' ||
        typeof (createTrackerDto.config as { min?: number; max?: number })
          .max !== 'number'
      ) {
        throw new BadRequestException(
          "config must include min and max for data_type 'scale'"
        );
      }
    }

    // Check user's tracker limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trackers_limit')
      .eq('id', userId)
      .is('deleted_at', null)
      .single<ProfileWithLimit>();

    if (profileError) {
      this.logger.error(
        `Failed to fetch profile for user ${userId}`,
        profileError
      );
      throw new InternalServerErrorException('Failed to fetch user profile');
    }

    // Count existing trackers for the user
    const { count, error: countError } = await supabase
      .from('trackers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (countError) {
      this.logger.error(
        `Failed to count trackers for user ${userId}`,
        countError
      );
      throw new InternalServerErrorException(
        'Failed to count existing trackers'
      );
    }

    const currentCount = count ?? 0;
    const limit = profile?.trackers_limit ?? 10;

    if (currentCount >= limit) {
      throw new ForbiddenException(`Tracker limit reached. Maximum: ${limit}`);
    }

    // Prepare tracker data for insertion
    const trackerData = {
      user_id: userId,
      name: createTrackerDto.name,
      data_type: createTrackerDto.data_type,
      unit: createTrackerDto.unit ?? null,
      config: (createTrackerDto.config ?? {}) as Json,
      color: createTrackerDto.color ?? null,
      icon: createTrackerDto.icon ?? null,
      display_order: createTrackerDto.display_order ?? 0,
    };

    // Insert the tracker
    // Note: Using type assertion due to Supabase SDK v2.89+ type inference issues
    const { data: tracker, error: insertError } = await supabase
      .from('trackers')
      .insert(trackerData as never)
      .select()
      .single<Tracker>();

    if (insertError) {
      this.logger.error(
        `Failed to create tracker for user ${userId}`,
        insertError
      );
      throw new InternalServerErrorException('Failed to create tracker');
    }

    if (!tracker) {
      throw new InternalServerErrorException(
        'Failed to create tracker - no data returned'
      );
    }

    this.logger.log(`Tracker ${tracker.id} created for user ${userId}`);

    // Return tracker without deleted_at field
    const { deleted_at: _, ...trackerResponse } = tracker;
    return trackerResponse;
  }
}
