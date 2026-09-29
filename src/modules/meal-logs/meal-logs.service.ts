import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MealSlotType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { AddMealItemDto, UpdateHabitsDto } from './dto/meal-logs.dto';

@Injectable()
export class MealLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nutritionService: NutritionService,
  ) {}

  private parseDate(dateStr?: string): Date {
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      }
    }
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  async getOrCreateDayLog(userId: string, dateStr?: string) {
    const targetDate = this.parseDate(dateStr);

    let dayLog = await this.prisma.dietDayLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      include: {
        mealItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dayLog) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const metrics = user ? this.nutritionService.calculate(user) : { budget: 1200 };

      dayLog = await this.prisma.dietDayLog.create({
        data: {
          userId,
          date: targetDate,
          targetKcal: metrics.budget,
          waterGlasses: 0,
          walkMinutes: 0,
        },
        include: {
          mealItems: true,
        },
      });
    }

    return dayLog;
  }

  async getDaySummary(userId: string, dateStr?: string) {
    const dayLog = await this.getOrCreateDayLog(userId, dateStr);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const metrics = user ? this.nutritionService.calculate(user) : null;

    // Slot breakdown
    const slots: Record<MealSlotType, {
      items: typeof dayLog.mealItems;
      kcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }> = {
      [MealSlotType.BREAKFAST]: { items: [], kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      [MealSlotType.LUNCH]: { items: [], kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      [MealSlotType.SNACK]: { items: [], kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      [MealSlotType.DINNER]: { items: [], kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    };

    let totalKcal = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const item of dayLog.mealItems) {
      if (slots[item.slot]) {
        slots[item.slot].items.push(item);
        slots[item.slot].kcal += item.kcal;
        slots[item.slot].proteinG += item.proteinG;
        slots[item.slot].carbsG += item.carbsG;
        slots[item.slot].fatG += item.fatG;
      }
      totalKcal += item.kcal;
      totalProteinG += item.proteinG;
      totalCarbsG += item.carbsG;
      totalFatG += item.fatG;
    }

    // Round slot values
    for (const slotKey of Object.keys(slots) as MealSlotType[]) {
      slots[slotKey].proteinG = Math.round(slots[slotKey].proteinG * 10) / 10;
      slots[slotKey].carbsG = Math.round(slots[slotKey].carbsG * 10) / 10;
      slots[slotKey].fatG = Math.round(slots[slotKey].fatG * 10) / 10;
    }

    const remainingKcal = Math.max(0, dayLog.targetKcal - totalKcal);

    return {
      dayLogId: dayLog.id,
      date: dayLog.date.toISOString().split('T')[0],
      targetKcal: dayLog.targetKcal,
      totalKcal,
      remainingKcal,
      isOverBudget: totalKcal > dayLog.targetKcal,
      totalMacros: {
        proteinG: Math.round(totalProteinG * 10) / 10,
        carbsG: Math.round(totalCarbsG * 10) / 10,
        fatG: Math.round(totalFatG * 10) / 10,
      },
      targetMacros: metrics?.macros,
      habits: {
        waterGlasses: dayLog.waterGlasses,
        waterGoalGlasses: 8,
        walkMinutes: dayLog.walkMinutes,
        walkMinGoal: metrics?.walkMinGoal || 30,
      },
      slots,
    };
  }

  async addMealItem(userId: string, dto: AddMealItemDto) {
    const dayLog = await this.getOrCreateDayLog(userId, dto.date);

    const mealItem = await this.prisma.loggedMealItem.create({
      data: {
        dayLogId: dayLog.id,
        slot: dto.slot,
        foodItemId: dto.foodItemId,
        name: dto.name,
        qty: dto.qty,
        servings: dto.servings || 1.0,
        kcal: Math.round(dto.kcal),
        proteinG: Math.round(dto.proteinG * 10) / 10,
        carbsG: Math.round(dto.carbsG * 10) / 10,
        fatG: Math.round(dto.fatG * 10) / 10,
      },
    });

    const summary = await this.getDaySummary(userId, dto.date);
    return {
      addedItem: mealItem,
      daySummary: summary,
    };
  }

  async deleteMealItem(userId: string, itemId: string) {
    const item = await this.prisma.loggedMealItem.findUnique({
      where: { id: itemId },
      include: { dayLog: true },
    });

    if (!item) {
      throw new NotFoundException('Meal item not found');
    }

    if (item.dayLog.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this meal item');
    }

    await this.prisma.loggedMealItem.delete({
      where: { id: itemId },
    });

    const dateStr = item.dayLog.date.toISOString().split('T')[0];
    return this.getDaySummary(userId, dateStr);
  }

  async clearSlot(userId: string, slot: MealSlotType, dateStr?: string) {
    const dayLog = await this.getOrCreateDayLog(userId, dateStr);

    await this.prisma.loggedMealItem.deleteMany({
      where: {
        dayLogId: dayLog.id,
        slot,
      },
    });

    return this.getDaySummary(userId, dateStr);
  }

  async updateHabits(userId: string, dto: UpdateHabitsDto) {
    const dayLog = await this.getOrCreateDayLog(userId, dto.date);

    let newWater = dayLog.waterGlasses;
    if (dto.waterGlasses !== undefined) {
      newWater = dto.waterGlasses;
    } else if (dto.waterGlassesChange !== undefined) {
      newWater = Math.max(0, dayLog.waterGlasses + dto.waterGlassesChange);
    }

    let newWalk = dayLog.walkMinutes;
    if (dto.walkMinutes !== undefined) {
      newWalk = dto.walkMinutes;
    } else if (dto.walkMinutesChange !== undefined) {
      newWalk = Math.max(0, dayLog.walkMinutes + dto.walkMinutesChange);
    }

    await this.prisma.dietDayLog.update({
      where: { id: dayLog.id },
      data: {
        waterGlasses: newWater,
        walkMinutes: newWalk,
      },
    });

    return this.getDaySummary(userId, dto.date);
  }
}
