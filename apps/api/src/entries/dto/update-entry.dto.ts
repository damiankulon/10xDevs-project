import { IsOptional, IsISO8601 } from 'class-validator';
import type { UpdateEntryCommand } from '@kipio/shared';

/**
 * DTO dla aktualizacji istniejącego wpisu
 * Wszystkie pola opcjonalne - partial update
 */
export class UpdateEntryDto implements UpdateEntryCommand {
  @IsOptional()
  value?: number | boolean | string;

  @IsOptional()
  @IsISO8601({}, { message: 'recorded_at must be a valid ISO8601 date' })
  recorded_at?: string;
}
