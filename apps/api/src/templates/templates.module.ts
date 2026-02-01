import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { SupabaseModule } from '../supabase';
import { AuthModule } from '../auth';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
