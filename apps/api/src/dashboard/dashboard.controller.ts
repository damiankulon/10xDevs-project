import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';

// Define local type for response
interface DashboardResponseDto {
  trackers: any[];
  summary: any;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard
   * Retrieves dashboard data with trackers, sparkline data, and summary statistics
   *
   * @param user - Authenticated user from JWT token
   * @param query - Query parameters for sparkline days
   * @returns Dashboard data with trackers and summary
   * @throws UnauthorizedException if token is missing or invalid
   * @throws InternalServerErrorException if data retrieval fails
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQueryDto
  ): Promise<DashboardResponseDto> {
    const sparklineDays = query.sparkline_days || 7;
    return this.dashboardService.getDashboard(user.id, sparklineDays);
  }
}
