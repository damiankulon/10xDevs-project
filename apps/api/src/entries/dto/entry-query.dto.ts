import { IsOptional, IsInt, Min, Max, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import type { EntryListQueryDto } from '@kipio/shared';

/**
 * DTO dla parametrów zapytania GET /api/trackers/:trackerId/entries
 * Obsługuje paginację, sortowanie i filtrowanie po zakresie dat
 */
export class EntryQueryDto implements EntryListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 50;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_order must be asc or desc' })
  sort_order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsISO8601({}, { message: 'from must be a valid ISO8601 date' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to must be a valid ISO8601 date' })
  to?: string;
}
