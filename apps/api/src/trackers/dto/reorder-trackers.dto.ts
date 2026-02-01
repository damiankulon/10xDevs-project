import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single tracker order item for reordering
 */
export class TrackerOrderItemDto {
  /**
   * Tracker ID
   */
  @IsUUID('4', { message: 'id must be a valid UUID' })
  id: string;

  /**
   * Display order position
   */
  @IsInt({ message: 'display_order must be an integer' })
  display_order: number;
}

/**
 * DTO for reordering multiple trackers
 * Used in: PATCH /api/trackers/reorder
 */
export class ReorderTrackersDto {
  /**
   * Array of tracker IDs with their new display order
   */
  @IsArray({ message: 'order must be an array' })
  @IsNotEmpty({ message: 'order cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => TrackerOrderItemDto)
  order: TrackerOrderItemDto[];
}
