import { Module } from '@nestjs/common';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { SupabaseModule } from '../supabase';

/**
 * Moduł zarządzający wpisami (entries) dla trackerów
 * Obsługuje CRUD operations z pełną walidacją i kontrolą dostępu
 */
@Module({
  imports: [SupabaseModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
