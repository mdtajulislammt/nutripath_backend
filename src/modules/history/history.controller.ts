import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HistoryService, HistoryFilterType } from './history.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Diet History & Milestone')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) { }

  @Get('summary')
  @ApiOperation({ summary: 'Get overall diet journey stats: daysOnDiet, weight lost, success compliance' })
  async getSummary(@CurrentUser('id') userId: string) {
    return this.historyService.getSummary(userId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get list of past diet days with budget status' })
  @ApiQuery({ name: 'filter', required: false, enum: ['ALL', 'WITHIN_BUDGET', 'OVER_BUDGET'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getLogs(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: HistoryFilterType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.getLogs(
      userId,
      filter || 'ALL',
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('logs/:date')
  @ApiOperation({ summary: 'Get detailed slot and food breakdown for a specific historical date (Modal View)' })
  async getDateDetail(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
  ) {
    return this.historyService.getDateDetail(userId, date);
  }
}
