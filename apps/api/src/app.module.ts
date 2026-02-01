import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase';
import { ProfilesModule } from './profiles';
import { TrackersModule } from './trackers';
import { AuthModule } from './auth';
import { DashboardModule } from './dashboard';
import { EntriesModule } from './entries';
import { TemplatesModule } from './templates';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    TrackersModule,
    EntriesModule,
    DashboardModule,
    TemplatesModule,
  ],
})
export class AppModule {}
