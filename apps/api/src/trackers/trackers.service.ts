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
import type {
  TrackerStatsResponseDto,
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

    // Use default limit if profile not found (shouldn't happen due to trigger)
    const limit = profile?.trackers_limit ?? 50;

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
