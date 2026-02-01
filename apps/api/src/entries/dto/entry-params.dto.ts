import { IsUUID } from 'class-validator';

/**
 * DTO dla parametrów ścieżki związanych z trackerem
 */
export class TrackerParamDto {
  @IsUUID('4', { message: 'Invalid tracker ID format' })
  trackerId: string;
}

/**
 * DTO dla parametrów ścieżki entry endpoint (trackerId + entryId)
 */
export class EntryParamsDto extends TrackerParamDto {
  @IsUUID('4', { message: 'Invalid entry ID format' })
  entryId: string;
}
