import { IsUUID } from 'class-validator';

/**
 * URL parameter DTO for tracker ID validation
 * Used in endpoints that require :id parameter
 */
export class TrackerParamDto {
  /**
   * Tracker UUID from URL parameter
   */
  @IsUUID('4', { message: 'id must be a valid UUID' })
  id: string;
}
