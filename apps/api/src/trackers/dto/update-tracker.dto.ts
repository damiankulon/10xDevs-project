import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import type { TrackerConfig } from '@kipio/shared';

/**
 * DTO for updating an existing tracker
 * All fields are optional for partial updates
 * Note: data_type cannot be changed after creation
 * Used in: PATCH /api/trackers/:id
 */
export class UpdateTrackerDto {
  /**
   * Name of the tracker (max 100 characters)
   */
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'name must be at most 100 characters' })
  name?: string;

  /**
   * Unit of measurement (max 20 characters, only for data_type 'number')
   */
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'unit must be at most 20 characters' })
  unit?: string;

  /**
   * Configuration object (e.g., min/max for scale type)
   */
  @IsOptional()
  @IsObject({ message: 'config must be an object' })
  config?: TrackerConfig;

  /**
   * Color in hex format (#RRGGBB)
   */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be in hex format (#RRGGBB)',
  })
  color?: string;

  /**
   * Icon name (max 50 characters)
   */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'icon must be at most 50 characters' })
  icon?: string;

  /**
   * Display order for sorting
   */
  @IsOptional()
  @IsInt({ message: 'display_order must be an integer' })
  display_order?: number;

  /**
   * Whether the tracker is active
   */
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}
