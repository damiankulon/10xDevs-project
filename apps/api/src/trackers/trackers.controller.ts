import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TrackersService, TrackerResponseDto } from './trackers.service';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { UpdateTrackerDto } from './dto/update-tracker.dto';
import { ReorderTrackersDto } from './dto/reorder-trackers.dto';
import { TrackerListQueryDto } from './dto/tracker-list-query.dto';
import { TrackerParamDto } from './dto/tracker-param.dto';
import { TrackerStatsQueryDto } from './dto/tracker-stats-query.dto';
import { TrackerIdParamDto } from './dto/tracker-id-param.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import { LoggingInterceptor } from '../common';
import type {
  TrackerListResponseDto,
  TrackerDetailResponseDto,
  ReorderTrackersResponseDto,
  TrackerStatsResponseDto,
} from '@kipio/shared';

@Controller('trackers')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  /**
   * GET /api/trackers
   * List all trackers for the authenticated user
   *
   * @param user - Authenticated user from JWT token
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of trackers
   * @throws UnauthorizedException if token is missing or invalid
   * @throws BadRequestException if query validation fails
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: TrackerListQueryDto
  ): Promise<TrackerListResponseDto> {
    return this.trackersService.findAll(user.id, query);
  }

  /**
   * GET /api/trackers/:id
   * Get detailed information about a specific tracker
   *
   * @param user - Authenticated user from JWT token
   * @param params - URL parameters containing tracker ID
   * @returns Tracker details with statistics
   * @throws UnauthorizedException if token is missing or invalid
   * @throws NotFoundException if tracker doesn't exist
   * @throws ForbiddenException if user doesn't have access
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param() params: TrackerParamDto
  ): Promise<TrackerDetailResponseDto> {
    return this.trackersService.findOne(params.id, user.id);
  }

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
   * PATCH /api/trackers/reorder
   * Reorder multiple trackers
   *
   * @param user - Authenticated user from JWT token
   * @param reorderDto - Array of tracker IDs with new display orders
   * @returns Confirmation message with update count
   * @throws UnauthorizedException if token is missing or invalid
   * @throws ForbiddenException if user doesn't own all trackers
   * @throws BadRequestException if validation fails
   */
  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @CurrentUser() user: AuthUser,
    @Body() reorderDto: ReorderTrackersDto
  ): Promise<ReorderTrackersResponseDto> {
    return this.trackersService.reorder(user.id, reorderDto);
  }

  /**
   * PATCH /api/trackers/:id
   * Update an existing tracker
   *
   * @param user - Authenticated user from JWT token
   * @param params - URL parameters containing tracker ID
   * @param updateTrackerDto - Fields to update
   * @returns Updated tracker
   * @throws UnauthorizedException if token is missing or invalid
   * @throws NotFoundException if tracker doesn't exist
   * @throws ForbiddenException if user is not the owner
   * @throws BadRequestException if validation fails
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: AuthUser,
    @Param() params: TrackerParamDto,
    @Body() updateTrackerDto: UpdateTrackerDto
  ): Promise<TrackerResponseDto> {
    return this.trackersService.update(params.id, user.id, updateTrackerDto);
  }

  /**
   * DELETE /api/trackers/:id
   * Soft delete a tracker
   *
   * @param user - Authenticated user from JWT token
   * @param params - URL parameters containing tracker ID
   * @throws UnauthorizedException if token is missing or invalid
   * @throws NotFoundException if tracker doesn't exist
   * @throws ForbiddenException if user is not the owner
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param() params: TrackerParamDto
  ): Promise<void> {
    return this.trackersService.remove(params.id, user.id);
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
