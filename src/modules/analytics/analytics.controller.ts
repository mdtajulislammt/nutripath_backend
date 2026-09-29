import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { LogWeightDto } from './dto/analytics.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('weekly-compliance')
  @ApiOperation({ summary: 'Get past 7 days target vs consumed calories and macro trends' })
  async getWeeklyCompliance(@CurrentUser('id') userId: string) {
    return this.analyticsService.getWeeklyCompliance(userId);
  }

  @Get('weight-trend')
  @ApiOperation({ summary: 'Get weight progress chart timeline data' })
  async getWeightTrend(@CurrentUser('id') userId: string) {
    return this.analyticsService.getWeightTrend(userId);
  }

  @Post('weight')
  @ApiOperation({ summary: 'Log a new weight measurement and update profile' })
  async logWeight(
    @CurrentUser('id') userId: string,
    @Body() dto: LogWeightDto,
  ) {
    return this.analyticsService.logWeight(userId, dto);
  }
}
