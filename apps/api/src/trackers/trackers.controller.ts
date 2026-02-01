import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TrackersService, TrackerResponseDto } from './trackers.service';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { TrackerStatsQueryDto } from './dto/tracker-stats-query.dto';
import { TrackerIdParamDto } from './dto/tracker-id-param.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import type { TrackerStatsResponseDto } from '@kipio/shared';

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

  /**
   * GET /api/trackers/:trackerId/stats
   * Get detailed statistics for a specific tracker
   *
   * @param user - Authenticated user from JWT token
   * @param params - URL parameters containing trackerId
   * @param query - Query parameters for period selection
   * @returns Tracker statistics with metrics, chart data, and heatmap
   * @throws UnauthorizedException if token is missing or invalid
   * @throws NotFoundException if tracker doesn't exist
   * @throws ForbiddenException if user doesn't have access to the tracker
   * @throws BadRequestException if validation fails
   */
  @Get(':trackerId/stats')
  @HttpCode(HttpStatus.OK)
  async getTrackerStats(
    @CurrentUser() user: AuthUser,
    @Param() params: TrackerIdParamDto,
    @Query() query: TrackerStatsQueryDto
  ): Promise<TrackerStatsResponseDto> {
    return this.trackersService.getTrackerStats(
      user.id,
      params.trackerId,
      query.period ?? '7d'
    );
  }
}
