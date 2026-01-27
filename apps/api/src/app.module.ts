import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase';
import { ProfilesModule } from './profiles';
import { TrackersModule } from './trackers';
import { AuthModule } from './auth';

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
  ],
})
export class AppModule {}
