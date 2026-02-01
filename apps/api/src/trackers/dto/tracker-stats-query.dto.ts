import { IsOptional, IsIn } from 'class-validator';
import { StatsPeriod } from '@kipio/shared';

/**
 * DTO for tracker statistics query parameters
 * Used in: GET /api/trackers/:trackerId/stats
 */
export class TrackerStatsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '1y', 'all'], {
    message: 'period must be one of: 7d, 30d, 90d, 1y, all',
  })
  period?: StatsPeriod = '7d';
}
