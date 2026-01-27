import { Module } from '@nestjs/common';
import { TrackersService } from './trackers.service';
import { TrackersController } from './trackers.controller';
import { SupabaseModule } from '../supabase';
import { AuthModule } from '../auth';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TrackersController],
  providers: [TrackersService],
  exports: [TrackersService],
})
export class TrackersModule {}
