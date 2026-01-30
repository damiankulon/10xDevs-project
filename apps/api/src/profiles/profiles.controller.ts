import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfilesService, Profile } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profiles
   * Retrieves all profiles (admin endpoint)
   */
  @Get()
  async findAll(): Promise<Profile[]> {
    return this.profilesService.findAll();
  }

  /**
   * GET /api/profiles/:id
   * Retrieves a specific profile by ID
   */
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Profile> {
    return this.profilesService.findById(id);
  }

  /**
   * PATCH /api/profiles/:id
   * Updates a profile
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto
  ): Promise<Profile> {
    return this.profilesService.update(id, updateProfileDto);
  }
}
