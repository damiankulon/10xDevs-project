import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import type { Json } from '../supabase/database.types';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { UpdateTrackerDto } from './dto/update-tracker.dto';
import { TrackerListQueryDto } from './dto/tracker-list-query.dto';
import { ReorderTrackersDto } from './dto/reorder-trackers.dto';
import type {
  TrackerStatsResponseDto,
  TrackerListResponseDto,
  TrackerDetailResponseDto,
  TrackerListItemDto,
  ReorderTrackersResponseDto,
  LastEntryDto,
  TrackerStatsDto,
  TrackerConfig,
  SharePermission,
  StatsPeriod,
  DataType,
  NumericStatsDto,
  ChartDataDto,
  HeatmapDataPointDto,
} from '@kipio/shared';

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

/**
 * Entry row type from database
 */
type EntryRow = {
  id: string;
  tracker_id: string;
  value_number: number | null;
  value_boolean: boolean | null;
  value_text: string | null;
  recorded_at: string;
};

/**
 * Internal type for tracker access information
 */
interface TrackerAccessInfo {
  isOwner: boolean;
  sharedPermission: SharePermission | null;
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
    // Note: Using maybeSingle to handle case where profile might not exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trackers_limit')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle<ProfileWithLimit>();

    if (profileError) {
      this.logger.error(
        `Failed to fetch profile for user ${userId}`,
        profileError
      );
      throw new InternalServerErrorException('Failed to fetch user profile');
    }

    // If profile doesn't exist, create it (fallback for cases where trigger didn't fire)
    let limit: number;
    if (!profile) {
      this.logger.warn(
        `Profile not found for user ${userId}. Creating profile automatically.`
      );

      // Get user's email from auth.users to create profile
      const { data: authUser, error: authError } =
        await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser.user) {
        this.logger.error(`User ${userId} not found in auth.users`, authError);
        throw new InternalServerErrorException('User not found');
      }

      // Create profile with default values
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name:
            authUser.user.user_metadata?.full_name ||
            authUser.user.email ||
            'User',
        } as never)
        .select('trackers_limit')
        .single<ProfileWithLimit>();

      if (createProfileError || !newProfile) {
        this.logger.error(
          `Failed to create profile for user ${userId}`,
          createProfileError
        );
        throw new InternalServerErrorException('Failed to create user profile');
      }

      limit = newProfile.trackers_limit;
      this.logger.log(`Profile created for user ${userId}`);
    } else {
      limit = profile.trackers_limit;
    }

    // Count existing trackers for the user
    // Using RPC call to bypass RLS policy recursion issues
    const { data: countData, error: countError } = await supabase.rpc(
      'count_user_trackers' as any,
      { p_user_id: userId } as any
    );

    if (countError) {
      this.logger.error(
        `Failed to count trackers for user ${userId}`,
        countError
      );
      throw new InternalServerErrorException(
        'Failed to count existing trackers'
      );
    }

    const currentCount = countData ?? 0;

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

  /**
   * Get all trackers for a user with pagination, filtering, and sorting
   *
   * @param userId - The ID of the user requesting trackers
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of trackers with metadata
   */
  async findAll(
    userId: string,
    query: TrackerListQueryDto
  ): Promise<TrackerListResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const {
      page = 1,
      limit = 20,
      sort_by = 'display_order',
      sort_order = 'asc',
      is_active = true,
      data_type,
      include_shared = true,
    } = query;

    // Build base query
    let trackersQuery = supabase
      .from('trackers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Filter by owner or shared trackers
    if (include_shared) {
      // Get tracker IDs shared with the user
      const { data: sharedTrackers } = await supabase
        .from('tracker_shares')
        .select('tracker_id')
        .eq('shared_with_user_id', userId);

      const sharedTrackerIds =
        (sharedTrackers as { tracker_id: string }[] | null)?.map(
          (s) => s.tracker_id
        ) || [];

      // Include owned trackers OR shared trackers
      if (sharedTrackerIds.length > 0) {
        trackersQuery = trackersQuery.or(
          `user_id.eq.${userId},id.in.(${sharedTrackerIds.join(',')})`
        );
      } else {
        trackersQuery = trackersQuery.eq('user_id', userId);
      }
    } else {
      trackersQuery = trackersQuery.eq('user_id', userId);
    }

    // Apply filters
    if (is_active !== undefined) {
      trackersQuery = trackersQuery.eq('is_active', is_active);
    }

    if (data_type) {
      trackersQuery = trackersQuery.eq('data_type', data_type);
    }

    // Apply sorting
    trackersQuery = trackersQuery.order(sort_by, {
      ascending: sort_order === 'asc',
    });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    trackersQuery = trackersQuery.range(from, to);

    const { data: trackers, error, count } = await trackersQuery;

    if (error) {
      this.logger.error(`Failed to fetch trackers for user ${userId}`, error);
      throw new InternalServerErrorException('Failed to fetch trackers');
    }

    // Get shared tracker IDs for permission checks
    const { data: shares } = await supabase
      .from('tracker_shares')
      .select('tracker_id, permission')
      .eq('shared_with_user_id', userId);

    const shareMap = new Map<string, SharePermission>();
    (shares as { tracker_id: string; permission: string }[] | null)?.forEach(
      (share) => {
        shareMap.set(share.tracker_id, share.permission as SharePermission);
      }
    );

    // Enrich trackers with computed fields
    const enrichedTrackers: TrackerListItemDto[] = await Promise.all(
      ((trackers as Tracker[] | null) || []).map(async (tracker) => {
        const isOwner = tracker.user_id === userId;
        const sharedPermission = !isOwner
          ? shareMap.get(tracker.id) || null
          : null;

        // Get last entry
        const lastEntry = await this.getLastEntry(tracker.id);

        // Get sparkline data (last 7 values)
        const sparklineData = await this.getSparklineData(tracker.id);

        const { deleted_at, ...trackerWithoutDeleted } = tracker;

        return {
          ...trackerWithoutDeleted,
          config: trackerWithoutDeleted.config as unknown as TrackerConfig,
          is_owner: isOwner,
          shared_permission: sharedPermission,
          last_entry: lastEntry,
          sparkline_data: sparklineData,
        };
      })
    );

    return {
      data: enrichedTrackers,
      pagination: {
        page,
        limit,
        total_items: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get a single tracker by ID with stats
   *
   * @param id - Tracker ID
   * @param userId - ID of the user requesting the tracker
   * @returns Tracker details with statistics
   * @throws NotFoundException if tracker not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findOne(id: string, userId: string): Promise<TrackerDetailResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Get tracker
    const tracker = await this.findTrackerById(id);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    // Check access
    const accessInfo = await this.checkAccess(id, userId, tracker.user_id);
    if (!accessInfo.isOwner && !accessInfo.sharedPermission) {
      throw new ForbiddenException('Access denied to this tracker');
    }

    // Calculate stats
    const stats = await this.calculateStats(id);

    const { deleted_at, ...trackerWithoutDeleted } = tracker;

    return {
      ...trackerWithoutDeleted,
      config: trackerWithoutDeleted.config as unknown as TrackerConfig,
      is_owner: accessInfo.isOwner,
      shared_permission: accessInfo.sharedPermission,
      stats,
    };
  }

  /**
   * Update an existing tracker
   *
   * @param id - Tracker ID
   * @param userId - ID of the user updating the tracker
   * @param updateTrackerDto - Fields to update
   * @returns Updated tracker
   * @throws NotFoundException if tracker not found
   * @throws ForbiddenException if user is not the owner
   * @throws BadRequestException if validation fails
   */
  async update(
    id: string,
    userId: string,
    updateTrackerDto: UpdateTrackerDto
  ): Promise<TrackerResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Get tracker and check ownership
    const tracker = await this.checkOwnership(id, userId);

    // Validate business rules
    if (updateTrackerDto.unit !== undefined && tracker.data_type !== 'number') {
      throw new BadRequestException(
        "unit is only allowed for data_type 'number'"
      );
    }

    if (updateTrackerDto.config) {
      this.validateTrackerConfig(
        tracker.data_type as DataType,
        updateTrackerDto.config,
        updateTrackerDto.unit
      );
    }

    if (updateTrackerDto.color) {
      this.validateColorFormat(updateTrackerDto.color);
    }

    // Update tracker
    const { data: updatedTracker, error } = await supabase
      .from('trackers')
      .update(updateTrackerDto as never)
      .eq('id', id)
      .select()
      .single<Tracker>();

    if (error) {
      this.logger.error(`Failed to update tracker ${id}`, error);
      throw new InternalServerErrorException('Failed to update tracker');
    }

    if (!updatedTracker) {
      throw new InternalServerErrorException(
        'Failed to update tracker - no data returned'
      );
    }

    this.logger.log(`Tracker ${id} updated by user ${userId}`);

    const { deleted_at: _, ...trackerResponse } = updatedTracker;
    return trackerResponse;
  }

  /**
   * Soft delete a tracker
   *
   * @param id - Tracker ID
   * @param userId - ID of the user deleting the tracker
   * @throws NotFoundException if tracker not found
   * @throws ForbiddenException if user is not the owner
   */
  async remove(id: string, userId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    // Check ownership
    await this.checkOwnership(id, userId);

    // Soft delete tracker
    const { error } = await supabase
      .from('trackers')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete tracker ${id}`, error);
      throw new InternalServerErrorException('Failed to delete tracker');
    }

    this.logger.log(`Tracker ${id} deleted by user ${userId}`);
  }

  /**
   * Reorder multiple trackers
   *
   * @param userId - ID of the user reordering trackers
   * @param reorderDto - Array of tracker IDs with new display orders
   * @returns Confirmation message with update count
   * @throws ForbiddenException if user doesn't own all trackers
   */
  async reorder(
    userId: string,
    reorderDto: ReorderTrackersDto
  ): Promise<ReorderTrackersResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const trackerIds = reorderDto.order.map((item) => item.id);

    // Verify ownership of all trackers
    const { data: trackers, error } = await supabase
      .from('trackers')
      .select('id, user_id')
      .in('id', trackerIds)
      .is('deleted_at', null);

    if (error) {
      this.logger.error('Failed to fetch trackers for reordering', error);
      throw new InternalServerErrorException('Failed to fetch trackers');
    }

    // Check if all trackers belong to the user
    const notOwned = (
      trackers as { id: string; user_id: string }[] | null
    )?.filter((t) => t.user_id !== userId);
    if (notOwned && notOwned.length > 0) {
      throw new ForbiddenException(
        'You do not own all trackers in the reorder list'
      );
    }

    // Update display orders
    let updatedCount = 0;
    for (const item of reorderDto.order) {
      const { error: updateError } = await supabase
        .from('trackers')
        .update({ display_order: item.display_order } as never)
        .eq('id', item.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    this.logger.log(`Reordered ${updatedCount} trackers for user ${userId}`);

    return {
      message: 'Tracker order updated successfully',
      updated_count: updatedCount,
    };
  }

  /**
   * Get detailed statistics for a specific tracker
   *
   * @param userId - The ID of the user requesting stats
   * @param trackerId - The ID of the tracker
   * @param period - Time period for statistics (7d, 30d, 90d, 1y, all)
   * @returns Tracker statistics including numeric stats, chart data, and heatmap
   * @throws NotFoundException if tracker doesn't exist
   * @throws ForbiddenException if user doesn't have access to the tracker
   */
  async getTrackerStats(
    userId: string,
    trackerId: string,
    period: StatsPeriod
  ): Promise<TrackerStatsResponseDto> {
    // 1. Verify tracker exists and user has access
    const tracker = await this.findTrackerById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    const hasAccess = await this.verifyTrackerAccess(
      userId,
      trackerId,
      tracker.user_id
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this tracker');
    }

    // 2. Calculate date range based on period
    const startDate = this.calculateStartDate(period);

    // 3. Fetch entries for the period
    const entries = await this.getEntriesForPeriod(trackerId, startDate);

    // 4. Calculate statistics
    const stats = this.calculateNumericStats(entries, tracker.data_type);

    // 5. Prepare chart data
    const chartData = this.prepareChartData(entries, tracker.data_type);

    // 6. Prepare heatmap data
    const heatmapData = this.prepareHeatmapData(entries, tracker.data_type);

    return {
      tracker_id: trackerId,
      period,
      data_type: tracker.data_type as DataType,
      stats,
      chart_data: chartData,
      heatmap_data: heatmapData,
    };
  }

  /**
   * Find tracker by ID (excluding deleted trackers)
   */
  private async findTrackerById(trackerId: string): Promise<Tracker | null> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('trackers')
      .select('*')
      .eq('id', trackerId)
      .is('deleted_at', null)
      .maybeSingle<Tracker>();

    if (error) {
      this.logger.error(`Failed to find tracker ${trackerId}`, error);
      return null;
    }

    return data;
  }

  /**
   * Verify if user has access to tracker (owner or shared)
   */
  private async verifyTrackerAccess(
    userId: string,
    trackerId: string,
    ownerId: string
  ): Promise<boolean> {
    // Owner always has access
    if (userId === ownerId) return true;

    // Check if tracker is shared with the user
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from('tracker_shares')
      .select('id')
      .eq('tracker_id', trackerId)
      .eq('shared_with_user_id', userId)
      .maybeSingle();

    return data !== null;
  }

  /**
   * Check access and return permission info
   */
  private async checkAccess(
    trackerId: string,
    userId: string,
    ownerId: string
  ): Promise<TrackerAccessInfo> {
    const isOwner = userId === ownerId;

    if (isOwner) {
      return { isOwner: true, sharedPermission: null };
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data: share } = await supabase
      .from('tracker_shares')
      .select('permission')
      .eq('tracker_id', trackerId)
      .eq('shared_with_user_id', userId)
      .maybeSingle();

    const typedShare = share as { permission: string } | null;

    return {
      isOwner: false,
      sharedPermission: typedShare
        ? (typedShare.permission as SharePermission)
        : null,
    };
  }

  /**
   * Check if user owns a tracker (throw if not)
   */
  private async checkOwnership(
    trackerId: string,
    userId: string
  ): Promise<Tracker> {
    const tracker = await this.findTrackerById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    if (tracker.user_id !== userId) {
      throw new ForbiddenException('You are not the owner of this tracker');
    }

    return tracker;
  }

  /**
   * Calculate basic stats for a tracker
   */
  private async calculateStats(trackerId: string): Promise<TrackerStatsDto> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: entries, error } = await supabase
      .from('entries')
      .select('id, recorded_at')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch entries for tracker ${trackerId}`,
        error
      );
      return {
        total_entries: 0,
        first_entry_at: null,
        last_entry_at: null,
      };
    }

    const typedEntries = entries as
      | { id: string; recorded_at: string }[]
      | null;

    if (!typedEntries || typedEntries.length === 0) {
      return {
        total_entries: 0,
        first_entry_at: null,
        last_entry_at: null,
      };
    }

    return {
      total_entries: typedEntries.length,
      first_entry_at: typedEntries[0].recorded_at,
      last_entry_at: typedEntries[typedEntries.length - 1].recorded_at,
    };
  }

  /**
   * Get the last entry for a tracker
   */
  private async getLastEntry(trackerId: string): Promise<LastEntryDto | null> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: entry } = await supabase
      .from('entries')
      .select('value_number, value_boolean, value_text, recorded_at')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const typedEntry = entry as {
      value_number: number | null;
      value_boolean: boolean | null;
      value_text: string | null;
      recorded_at: string;
    } | null;

    if (!typedEntry) {
      return null;
    }

    // Determine value based on available fields
    const value =
      typedEntry.value_number ??
      typedEntry.value_boolean ??
      typedEntry.value_text ??
      '';

    return {
      value,
      recorded_at: typedEntry.recorded_at,
    };
  }

  /**
   * Get sparkline data (last 7 values) for a tracker
   */
  private async getSparklineData(trackerId: string): Promise<number[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: entries } = await supabase
      .from('entries')
      .select('value_number, value_boolean')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false })
      .limit(7);

    const typedEntries = entries as
      | {
          value_number: number | null;
          value_boolean: boolean | null;
        }[]
      | null;

    if (!typedEntries || typedEntries.length === 0) {
      return [];
    }

    // Reverse to get chronological order
    return typedEntries.reverse().map((e) => {
      if (e.value_number !== null) return e.value_number;
      if (e.value_boolean !== null) return e.value_boolean ? 1 : 0;
      return 0;
    });
  }

  /**
   * Validate tracker configuration
   */
  private validateTrackerConfig(
    dataType: DataType,
    config: unknown,
    unit?: string
  ): void {
    if (dataType !== 'number' && unit) {
      throw new BadRequestException(
        "unit is only allowed for data_type 'number'"
      );
    }

    if (dataType === 'scale') {
      const scaleConfig = config as { min?: number; max?: number };
      if (
        typeof scaleConfig.min !== 'number' ||
        typeof scaleConfig.max !== 'number'
      ) {
        throw new BadRequestException(
          "config must include min and max for data_type 'scale'"
        );
      }
    }
  }

  /**
   * Validate color format
   */
  private validateColorFormat(color?: string): void {
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new BadRequestException('color must be in hex format (#RRGGBB)');
    }
  }

  /**
   * Calculate start date based on stats period
   */
  private calculateStartDate(period: StatsPeriod): Date | null {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case 'all':
        return null;
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }

  /**
   * Fetch entries for a tracker within a date range
   */
  private async getEntriesForPeriod(
    trackerId: string,
    startDate: Date | null
  ): Promise<EntryRow[]> {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('entries')
      .select(
        'id, tracker_id, value_number, value_boolean, value_text, recorded_at'
      )
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: true });

    if (startDate) {
      query = query.gte('recorded_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(
        `Failed to fetch entries for tracker ${trackerId}`,
        error
      );
      throw new InternalServerErrorException('Failed to fetch entries');
    }

    return (data || []) as EntryRow[];
  }

  /**
   * Calculate numeric statistics (count, avg, min, max, median, std_dev)
   */
  private calculateNumericStats(
    entries: EntryRow[],
    dataType: string
  ): NumericStatsDto {
    const values = entries
      .map((e) => {
        if (dataType === 'boolean') return e.value_boolean ? 1 : 0;
        return e.value_number;
      })
      .filter((v): v is number => v !== null);

    if (values.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, median: 0, std_dev: 0 };
    }

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate median
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];

    // Calculate standard deviation
    const squaredDiffs = values.map((v) => Math.pow(v - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const std_dev = Math.sqrt(avgSquaredDiff);

    return {
      count,
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      median: Math.round(median * 100) / 100,
      std_dev: Math.round(std_dev * 100) / 100,
    };
  }

  /**
   * Prepare chart data (labels and values arrays)
   */
  private prepareChartData(
    entries: EntryRow[],
    dataType: string
  ): ChartDataDto {
    const labels: string[] = [];
    const values: number[] = [];

    for (const entry of entries) {
      const date = entry.recorded_at.split('T')[0];
      labels.push(date);

      if (dataType === 'boolean') {
        values.push(entry.value_boolean ? 1 : 0);
      } else {
        values.push(entry.value_number ?? 0);
      }
    }

    return { labels, values };
  }

  /**
   * Prepare heatmap data (date, count, value)
   */
  private prepareHeatmapData(
    entries: EntryRow[],
    dataType: string
  ): HeatmapDataPointDto[] {
    const dateMap = new Map<
      string,
      { count: number; values: (number | boolean | string)[] }
    >();

    for (const entry of entries) {
      const date = entry.recorded_at.split('T')[0];
      const existing = dateMap.get(date) || { count: 0, values: [] };

      let value: number | boolean | string;
      if (dataType === 'number' || dataType === 'scale') {
        value = entry.value_number ?? 0;
      } else if (dataType === 'boolean') {
        value = entry.value_boolean ?? false;
      } else {
        value = entry.value_text ?? '';
      }

      existing.count++;
      existing.values.push(value);
      dateMap.set(date, existing);
    }

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      value: data.values[data.values.length - 1], // Last value of the day
    }));
  }
}
