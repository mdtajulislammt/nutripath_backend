import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MealSlotType } from '@prisma/client';
import { MealLogsService } from './meal-logs.service';
import { AddMealItemDto, UpdateHabitsDto } from './dto/meal-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Meal Logging & Daily Diary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealLogsController {
  constructor(private readonly mealLogsService: MealLogsService) {}

  @Get('today')
  @ApiOperation({ summary: "Get day's live meals, slot items, habits, and macros" })
  @ApiQuery({ name: 'date', required: false, example: '2026-09-28', description: 'YYYY-MM-DD date' })
  async getToday(
    @CurrentUser('id') userId: string,
    @Query('date') date?: string,
  ) {
    return this.mealLogsService.getDaySummary(userId, date);
  }

  @Post('item')
  @ApiOperation({ summary: 'Add a food item to a specific meal slot (BREAKFAST, LUNCH, SNACK, DINNER)' })
  async addMealItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddMealItemDto,
  ) {
    return this.mealLogsService.addMealItem(userId, dto);
  }

  @Delete('item/:id')
  @ApiOperation({ summary: 'Delete a single logged meal item by ID' })
  async deleteMealItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.mealLogsService.deleteMealItem(userId, id);
  }

  @Delete('slot/:slot')
  @ApiOperation({ summary: 'Clear all food items inside a meal slot' })
  @ApiQuery({ name: 'date', required: false, example: '2026-09-28' })
  async clearSlot(
    @CurrentUser('id') userId: string,
    @Param('slot') slot: MealSlotType,
    @Query('date') date?: string,
  ) {
    return this.mealLogsService.clearSlot(userId, slot, date);
  }

  @Patch('habits')
  @ApiOperation({ summary: 'Update or increment water glasses and walking minutes' })
  async updateHabits(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateHabitsDto,
  ) {
    return this.mealLogsService.updateHabits(userId, dto);
  }
}
