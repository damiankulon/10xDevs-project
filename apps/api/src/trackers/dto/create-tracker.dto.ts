import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  IsObject,
  MaxLength,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for scale configuration - required when data_type is 'scale'
 */
export class ScaleConfigDto {
  @IsInt()
  min: number;

  @IsInt()
  max: number;
}

/**
 * DTO for creating a new tracker
 * Validates all input fields according to API specification
 */
export class CreateTrackerDto {
  /**
   * Name of the tracker (required, max 100 characters)
   */
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name must be at most 100 characters' })
  name: string;

  /**
   * Data type of the tracker values
   * Determines what kind of data can be stored in entries
   */
  @IsNotEmpty({ message: 'data_type is required' })
  @IsIn(['number', 'scale', 'boolean', 'text'], {
    message: 'data_type must be one of: number, scale, boolean, text',
  })
  data_type: 'number' | 'scale' | 'boolean' | 'text';

  /**
   * Unit of measurement (optional, only allowed for data_type 'number')
   * Examples: 'kg', 'km', 'hours'
   */
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'unit must be at most 20 characters' })
  unit?: string;

  /**
   * Configuration object (optional)
   * For 'scale' data_type, must include min and max values
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScaleConfigDto)
  @ValidateIf((o) => o.data_type === 'scale')
  config?: ScaleConfigDto | Record<string, unknown>;

  /**
   * Color in HEX format (optional)
   * Must be in #RRGGBB format
   */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be in hex format #RRGGBB',
  })
  color?: string;

  /**
   * Icon identifier (optional, max 50 characters)
   */
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'icon must be at most 50 characters' })
  icon?: string;

  /**
   * Display order in the UI (optional, defaults to 0)
   */
  @IsOptional()
  @IsInt({ message: 'display_order must be an integer' })
  display_order?: number;
}
