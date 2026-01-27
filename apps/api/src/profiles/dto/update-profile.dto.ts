import {
  IsString,
  IsBoolean,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;

  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  preferred_theme?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
