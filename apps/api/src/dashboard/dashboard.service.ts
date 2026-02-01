import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import type { Tables } from '../supabase';

// Database row types
type EntryRow = {
  tracker_id: string;
  value_number: number | null;
  value_boolean: boolean | null;
  value_text: string | null;
  recorded_at: string;
};

// Define local types for dashboard since shared import is failing
interface DashboardSummaryDto {
  total_trackers: number;
  active_trackers: number;
  entries_today: number;
  entries_this_week: number;
}

type TrendDirection = 'up' | 'down' | 'stable';

interface DashboardTrendDto {
  direction: TrendDirection;
  percentage: number;
}

interface DashboardTrackerDto {
  id: string;
  name: string;
  data_type: string;
  unit: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  last_entry: LastEntryDto | null;
  sparkline_data: number[];
  trend: DashboardTrendDto;
}

interface LastEntryDto {
  value: number | boolean | string;
  recorded_at: string;
}

interface DashboardResponseDto {
  trackers: DashboardTrackerDto[];
  summary: DashboardSummaryDto;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get complete dashboard data for a user
   * Includes active trackers with sparkline data, trends, and summary statistics
   *
   * @param userId - The user ID to fetch dashboard for
   * @param sparklineDays - Number of days to include in sparkline data (1-30)
   * @returns Dashboard data with trackers and summary
   * @throws InternalServerErrorException if data retrieval fails
   */
  async getDashboard(
    userId: string,
    sparklineDays: number
  ): Promise<DashboardResponseDto> {
    try {
      // Get active trackers and summary in parallel
      const [trackers, summary] = await Promise.all([
        this.getActiveTrackers(userId),
        this.getSummary(userId),
      ]);

      if (trackers.length === 0) {
        return {
          trackers: [],
          summary,
        };
      }

      // Get last entries for all trackers
      const trackerIds = trackers.map((t: any) => t.id);
      const lastEntries = await this.getLastEntries(trackerIds);

      // Build dashboard trackers with sparkline data in parallel
      const dashboardTrackers: DashboardTrackerDto[] = await Promise.all(
        trackers.map(async (tracker: any) => {
          const sparklineData = await this.getSparklineData(
            tracker.id,
            tracker.data_type,
            sparklineDays
          );

          const trend = this.calculateTrend(sparklineData);

          return {
            id: tracker.id,
            name: tracker.name,
            data_type: tracker.data_type,
            unit: tracker.unit,
            color: tracker.color,
            icon: tracker.icon,
            is_active: tracker.is_active,
            last_entry: lastEntries.get(tracker.id) || null,
            sparkline_data: sparklineData,
            trend,
          };
        })
      );

      return {
        trackers: dashboardTrackers,
        summary,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard for user ${userId}`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve dashboard data'
      );
    }
  }

  /**
   * Get all active trackers for a user
   *
   * @param userId - The user ID
   * @returns Array of active tracker records
   */
  private async getActiveTrackers(userId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('trackers')
      .select(
        'id, name, data_type, unit, color, icon, display_order, is_active'
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch trackers for user ${userId}. Error details:`,
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );
      // Return empty array instead of throwing - user might not have any trackers yet
      return [];
    }

    return data || [];
  }

  /**
   * Get last entry for each tracker (optimized batch query)
   * Uses a single query with IN clause to avoid N+1 problem
   *
   * @param trackerIds - Array of tracker IDs
   * @returns Map of tracker ID to last entry data
   */
  private async getLastEntries(
    trackerIds: string[]
  ): Promise<Map<string, LastEntryDto>> {
    if (trackerIds.length === 0) return new Map();

    const supabase = this.supabaseService.getAdminClient();
    const result = new Map<string, LastEntryDto>();

    // Fetch all entries for these trackers, then group by tracker_id
    // This is more efficient than N separate queries
    const { data, error } = await supabase
      .from('entries')
      .select(
        'tracker_id, value_number, value_boolean, value_text, recorded_at'
      )
      .in('tracker_id', trackerIds)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: false });

    if (error || !data) {
      this.logger.warn(
        'Failed to fetch last entries, returning empty map',
        error
      );
      return result;
    }

    // Group by tracker_id and keep only the first (most recent) entry for each
    const entriesByTracker = new Map<string, EntryRow>();
    for (const entry of data as EntryRow[]) {
      if (!entriesByTracker.has(entry.tracker_id)) {
        entriesByTracker.set(entry.tracker_id, entry);
      }
    }

    // Convert to LastEntryDto format
    for (const [trackerId, entry] of entriesByTracker.entries()) {
      result.set(trackerId, {
        value:
          entry.value_number ?? entry.value_boolean ?? entry.value_text ?? '',
        recorded_at: entry.recorded_at,
      });
    }

    return result;
  }

  /**
   * Get sparkline data for a tracker
   * Groups entries by day and calculates daily averages
   *
   * @param trackerId - The tracker ID
   * @param dataType - The data type of the tracker (number, boolean, scale, text)
   * @param days - Number of days to include
   * @returns Array of numeric values for sparkline visualization
   */
  private async getSparklineData(
    trackerId: string,
    dataType: string,
    days: number
  ): Promise<number[]> {
    const supabase = this.supabaseService.getAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('entries')
      .select('value_number, value_boolean, value_text, recorded_at')
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch sparkline data for tracker ${trackerId}`,
        error
      );
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Cast data to expected type and remove tracker_id from type
    const entries = data as Array<Omit<EntryRow, 'tracker_id'>>;

    // Group entries by date and get average/count for each day
    const dailyData = new Map<string, number[]>();

    entries.forEach((entry) => {
      const date = entry.recorded_at.split('T')[0];
      let value = 0;

      if (dataType === 'boolean') {
        value = entry.value_boolean ? 1 : 0;
      } else if (dataType === 'number' || dataType === 'scale') {
        value = entry.value_number ?? 0;
      } else {
        // For text type, just count occurrences
        value = 1;
      }

      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(value);
    });

    // Calculate average for each day and return as array
    return Array.from(dailyData.values()).map((values) => {
      const sum = values.reduce((a, b) => a + b, 0);
      return values.length > 0 ? sum / values.length : 0;
    });
  }

  /**
   * Calculate trend direction and percentage change
   * Compares first half vs second half of sparkline data
   *
   * @param sparklineData - Array of numeric values
   * @returns Trend direction and percentage change
   */
  private calculateTrend(sparklineData: number[]): DashboardTrendDto {
    if (sparklineData.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const firstHalf = sparklineData.slice(
      0,
      Math.floor(sparklineData.length / 2)
    );
    const secondHalf = sparklineData.slice(
      Math.floor(sparklineData.length / 2)
    );

    if (firstHalf.length === 0 || secondHalf.length === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // If both values are 0, no trend
    if (firstAvg === 0 && secondAvg === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    // If first is 0 but second is not, show 100% increase
    if (firstAvg === 0) {
      return { direction: 'up', percentage: 100 };
    }

    const percentageChange =
      ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
    const roundedPercentage = Math.round(percentageChange * 100) / 100;

    let direction: TrendDirection = 'stable';
    if (percentageChange > 1) direction = 'up';
    else if (percentageChange < -1) direction = 'down';

    return { direction, percentage: Math.abs(roundedPercentage) };
  }

  /**
   * Get summary statistics for dashboard
   * Includes total/active tracker counts and entry counts
   *
   * @param userId - The user ID
   * @returns Summary statistics object
   */
  private async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Total trackers
    const { count: totalTrackers } = await supabase
      .from('trackers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Active trackers
    const { count: activeTrackers } = await supabase
      .from('trackers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('is_active', true);

    // Entries today
    const today = new Date().toISOString().split('T')[0];
    const { count: entriesToday } = await supabase
      .from('entries')
      .select('*, trackers!inner(user_id)', { count: 'exact', head: true })
      .eq('trackers.user_id', userId)
      .is('deleted_at', null)
      .gte('recorded_at', `${today}T00:00:00Z`)
      .lt('recorded_at', `${today}T23:59:59Z`);

    // Entries this week
    const weekStart = this.getStartOfWeek(new Date()).toISOString();
    const { count: entriesThisWeek } = await supabase
      .from('entries')
      .select('*, trackers!inner(user_id)', { count: 'exact', head: true })
      .eq('trackers.user_id', userId)
      .is('deleted_at', null)
      .gte('recorded_at', weekStart);

    return {
      total_trackers: totalTrackers || 0,
      active_trackers: activeTrackers || 0,
      entries_today: entriesToday || 0,
      entries_this_week: entriesThisWeek || 0,
    };
  }

  /**
   * Get start of week (Sunday) for a given date
   *
   * @param date - The date to calculate from
   * @returns Date object representing start of week
   */
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // adjust when day is sunday
    return new Date(d.setDate(diff));
  }
}
