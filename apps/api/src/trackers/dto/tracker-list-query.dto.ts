import { IsOptional, IsInt, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { TrackerSortBy, SortOrder, DataType } from '@kipio/shared';

/**
 * Query parameters for listing trackers
 * Used in: GET /api/trackers
 */
export class TrackerListQueryDto {
  /**
   * Page number for pagination (default: 1)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  /**
   * Number of items per page (default: 20, max: 100)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 20;

  /**
   * Field to sort by (default: display_order)
   */
  @IsOptional()
  @IsIn(['display_order', 'name', 'created_at', 'updated_at'], {
    message:
      'sort_by must be one of: display_order, name, created_at, updated_at',
  })
  sort_by?: TrackerSortBy = 'display_order';

  /**
   * Sort direction (default: asc)
   */
  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sort_order must be one of: asc, desc',
  })
  sort_order?: SortOrder = 'asc';

  /**
   * Filter by active status (default: true)
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean = true;

  /**
   * Filter by data type
   */
  @IsOptional()
  @IsIn(['number', 'scale', 'boolean', 'text'], {
    message: 'data_type must be one of: number, scale, boolean, text',
  })
  data_type?: DataType;

  /**
   * Include shared trackers (default: true)
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'include_shared must be a boolean' })
  include_shared?: boolean = true;
}
