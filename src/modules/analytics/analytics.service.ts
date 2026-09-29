import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { LogWeightDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nutritionService: NutritionService,
  ) {}

  async getWeeklyCompliance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const metrics = this.nutritionService.calculate(user);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate past 7 days (today down to 6 days ago)
    const days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      days.push(d);
    }

    const startDate = days[0];
    const endDate = days[days.length - 1];

    const logs = await this.prisma.dietDayLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        mealItems: true,
      },
    });

    const logsByDate = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      const dStr = log.date.toISOString().split('T')[0];
      logsByDate.set(dStr, log);
    }

    let totalConsumedWeek = 0;
    let daysWithLogs = 0;
    let compliantDays = 0;

    const dailyStats = days.map((dateObj) => {
      const dStr = dateObj.toISOString().split('T')[0];
      const log = logsByDate.get(dStr);

      const targetKcal = log?.targetKcal || metrics.budget;
      let consumedKcal = 0;
      let proteinG = 0;
      let carbsG = 0;
      let fatG = 0;

      if (log && log.mealItems.length > 0) {
        daysWithLogs++;
        for (const item of log.mealItems) {
          consumedKcal += item.kcal;
          proteinG += item.proteinG;
          carbsG += item.carbsG;
          fatG += item.fatG;
        }
        if (consumedKcal <= targetKcal) {
          compliantDays++;
        }
        totalConsumedWeek += consumedKcal;
      }

      return {
        date: dStr,
        dayOfWeek: dayNames[dateObj.getUTCDay()],
        targetKcal,
        consumedKcal,
        isWithinBudget: consumedKcal <= targetKcal,
        hasLogs: Boolean(log && log.mealItems.length > 0),
        macros: {
          proteinG: Math.round(proteinG * 10) / 10,
          carbsG: Math.round(carbsG * 10) / 10,
          fatG: Math.round(fatG * 10) / 10,
        },
      };
    });

    return {
      dailyStats,
      targetKcal: metrics.budget,
      weeklyAverageKcal: daysWithLogs > 0 ? Math.round(totalConsumedWeek / daysWithLogs) : 0,
      compliancePercentage: daysWithLogs > 0 ? Math.round((compliantDays / daysWithLogs) * 100) : 100,
    };
  }

  async getWeightTrend(userId: string) {
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

    const records = user.weightRecords.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      weightKg: r.weightKg,
      notes: r.notes,
    }));

    // If no weight records exist yet, provide the user's initial weight
    if (records.length === 0) {
      records.push({
        id: 'initial',
        date: (user.dietStartDate || user.createdAt).toISOString().split('T')[0],
        weightKg: user.currentWeight,
        notes: 'Initial weight',
      });
    }

    const startWeight = records[0].weightKg;
    const currentWeight = user.currentWeight;
    const changeKg = Math.round((currentWeight - startWeight) * 10) / 10;

    return {
      records,
      startWeight,
      currentWeight,
      targetWeight: user.targetWeight,
      changeKg,
      weightToTarget: Math.max(0, Math.round((currentWeight - user.targetWeight) * 10) / 10),
    };
  }

  async logWeight(userId: string, dto: LogWeightDto) {
    const date = dto.date ? new Date(dto.date) : new Date();

    const record = await this.prisma.weightRecord.create({
      data: {
        userId,
        weightKg: dto.weightKg,
        date,
        notes: dto.notes,
      },
    });

    // Update currentWeight on user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentWeight: dto.weightKg,
      },
    });

    const metrics = this.nutritionService.calculate(updatedUser);

    return {
      record,
      user: {
        ...updatedUser,
        metrics,
      },
    };
  }
}
