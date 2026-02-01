import { IsUUID } from 'class-validator';

/**
 * DTO for validating UUID path parameters
 * Used in tracker endpoints that require trackerId in the URL
 */
export class TrackerIdParamDto {
  @IsUUID('4', { message: 'trackerId must be a valid UUID' })
  trackerId: string;
}
