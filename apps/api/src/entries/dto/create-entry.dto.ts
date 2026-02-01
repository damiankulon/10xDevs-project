import { IsDefined, IsOptional, IsISO8601 } from 'class-validator';
import type { CreateEntryCommand } from '@kipio/shared';

/**
 * DTO dla tworzenia nowego wpisu
 * Wartość value jest walidowana przez service w zależności od data_type trackera
 */
export class CreateEntryDto implements CreateEntryCommand {
  @IsDefined({ message: 'value is required' })
  value: number | boolean | string;

  @IsOptional()
  @IsISO8601({}, { message: 'recorded_at must be a valid ISO8601 date' })
  recorded_at?: string;
}
