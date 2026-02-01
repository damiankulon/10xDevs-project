import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { PackageIdParam } from './dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import type {
  TemplatePackageListResponseDto,
  ApplyPackageResponseDto,
} from '@kipio/shared';

/**
 * Templates Controller
 *
 * Handles template package endpoints for onboarding and quick tracker setup.
 * All endpoints require JWT authentication.
 *
 * @tags Templates
 */
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * GET /api/templates/packages
   *
   * Retrieves all active template packages with their tracker templates.
   * Used during user onboarding to display available tracker presets.
   *
   * @returns {TemplatePackageListResponseDto} List of template packages with nested tracker templates
   *
   * @example
   * Response 200 (application/json):
   * {
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "name": "Health",
   *       "description": "Track your health metrics: weight, sleep, water intake",
   *       "icon": "heart",
   *       "display_order": 1,
   *       "trackers": [
   *         {
   *           "id": "uuid",
   *           "name": "Weight",
   *           "data_type": "number",
   *           "unit": "kg",
   *           "config": {},
   *           "icon": "scale",
   *           "color": "#FF5733",
   *           "display_order": 0
   *         }
   *       ]
   *     }
   *   ]
   * }
   *
   * @throws {401} Unauthorized - Missing or invalid JWT token
   * @throws {500} InternalServerErrorException - Database query failed
   */
  @Get('packages')
  @HttpCode(HttpStatus.OK)
  async findAllPackages(): Promise<TemplatePackageListResponseDto> {
    return this.templatesService.findAllPackages();
  }

  /**
   * POST /api/templates/packages/:packageId/apply
   *
   * Applies a template package by creating trackers for the authenticated user.
   * Validates tracker limit and creates all trackers from the package templates.
   *
   * @param {PackageIdParam} params - Path parameters containing packageId (must be valid UUID)
   * @param {AuthUser} user - Authenticated user from JWT token
   * @returns {ApplyPackageResponseDto} Response with list of created trackers
   *
   * @example
   * Request:
   * POST /api/templates/packages/550e8400-e29b-41d4-a716-446655440000/apply
   * Authorization: Bearer <jwt_token>
   *
   * Response 201 (application/json):
   * {
   *   "message": "Package applied successfully",
   *   "created_trackers": [
   *     {
   *       "id": "uuid",
   *       "name": "Weight",
   *       "data_type": "number"
   *     },
   *     {
   *       "id": "uuid",
   *       "name": "Sleep",
   *       "data_type": "number"
   *     }
   *   ]
   * }
   *
   * @throws {400} BadRequestException - Invalid packageId format (not a UUID)
   * @throws {401} Unauthorized - Missing or invalid JWT token
   * @throws {403} ForbiddenException - Would exceed user's tracker limit
   * @throws {404} NotFoundException - Package not found or inactive
   * @throws {500} InternalServerErrorException - Database operation failed
   */
  @Post('packages/:packageId/apply')
  @HttpCode(HttpStatus.CREATED)
  async applyPackage(
    @Param() params: PackageIdParam,
    @CurrentUser() user: AuthUser
  ): Promise<ApplyPackageResponseDto> {
    return this.templatesService.applyPackage(params.packageId, user.id);
  }
}
