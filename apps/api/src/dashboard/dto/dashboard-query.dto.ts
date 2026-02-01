import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'sparkline_days must be at least 1' })
  @Max(30, { message: 'sparkline_days must be at most 30' })
  @Type(() => Number)
  sparkline_days?: number = 7;
}
