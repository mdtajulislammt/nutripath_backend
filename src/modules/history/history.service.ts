import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MealLogsService } from '../meal-logs/meal-logs.service';

export type HistoryFilterType = 'ALL' | 'WITHIN_BUDGET' | 'OVER_BUDGET';

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mealLogsService: MealLogsService,
  ) {}

  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        weightRecords: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Days on diet
    const startDate = user.dietStartDate || user.createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const daysOnDiet = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Weight progress
    const firstWeight = user.weightRecords[0]?.weightKg ?? user.currentWeight;
    const latestWeight = user.currentWeight;
    const totalWeightLost = Math.max(0, Math.round((firstWeight - latestWeight) * 10) / 10);
    const weightToTarget = Math.max(0, Math.round((latestWeight - user.targetWeight) * 10) / 10);

    // 3. Days logged & successful days
    const allDays = await this.prisma.dietDayLog.findMany({
      where: { userId },
      include: { mealItems: true },
    });

    let successfulDays = 0;
    for (const day of allDays) {
      const consumedKcal = day.mealItems.reduce((sum, item) => sum + item.kcal, 0);
      if (consumedKcal > 0 && consumedKcal <= day.targetKcal) {
        successfulDays++;
      }
    }

    return {
      daysOnDiet,
      startDate: startDate.toISOString().split('T')[0],
      currentWeight: latestWeight,
      targetWeight: user.targetWeight,
      initialWeight: firstWeight,
      totalWeightLost,
      weightToTarget,
      totalLoggedDays: allDays.length,
      successfulDays,
      complianceRate: allDays.length > 0 ? Math.round((successfulDays / allDays.length) * 100) : 100,
    };
  }

  async getLogs(userId: string, filter: HistoryFilterType = 'ALL', page = 1, limit = 20) {
    const allDays = await this.prisma.dietDayLog.findMany({
      where: { userId },
      include: {
        mealItems: {
          select: {
            id: true,
            slot: true,
            name: true,
            kcal: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const mapped = allDays.map((day) => {
      const totalKcal = day.mealItems.reduce((acc, curr) => acc + curr.kcal, 0);
      const isWithinBudget = totalKcal <= day.targetKcal;
      return {
        id: day.id,
        date: day.date.toISOString().split('T')[0],
        targetKcal: day.targetKcal,
        totalKcal,
        isWithinBudget,
        mealCount: day.mealItems.length,
        waterGlasses: day.waterGlasses,
        walkMinutes: day.walkMinutes,
      };
    });

    const filtered = mapped.filter((item) => {
      if (filter === 'WITHIN_BUDGET') return item.isWithinBudget;
      if (filter === 'OVER_BUDGET') return !item.isWithinBudget;
      return true;
    });

    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async getDateDetail(userId: string, dateStr: string) {
    return this.mealLogsService.getDaySummary(userId, dateStr);
  }
}
