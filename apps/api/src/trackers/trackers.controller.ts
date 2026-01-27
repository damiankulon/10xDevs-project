import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TrackersService, TrackerResponseDto } from './trackers.service';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';

@Controller('trackers')
@UseGuards(JwtAuthGuard)
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  /**
   * POST /api/trackers
   * Creates a new tracker for the authenticated user
   *
   * @param user - Authenticated user from JWT token
   * @param createTrackerDto - The tracker data to create
   * @returns The created tracker with 201 status code
   * @throws UnauthorizedException if token is missing or invalid
   * @throws ForbiddenException if user has reached their tracker limit
   * @throws BadRequestException if validation fails
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() createTrackerDto: CreateTrackerDto
  ): Promise<TrackerResponseDto> {
    return this.trackersService.create(user.id, createTrackerDto);
  }
}
