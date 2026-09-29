import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import {
  UpdateProfileDto,
  UpdateCalorieCeilingDto,
  UpdatePreferencesDto,
} from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nutritionService: NutritionService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const metrics = this.nutritionService.calculate(user);
    return {
      ...user,
      metrics,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const weightChanged =
      dto.currentWeight !== undefined && dto.currentWeight !== user.currentWeight;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
    });

    // If weight changed, also log a WeightRecord automatically
    if (weightChanged) {
      await this.prisma.weightRecord.create({
        data: {
          userId,
          weightKg: dto.currentWeight,
          notes: 'Updated via profile',
        },
      });
    }

    const metrics = this.nutritionService.calculate(updatedUser);

    // If completing onboarding, automatically populate today meals from AI suggestions
    if (dto.isOnboarded === true) {
      try {
        const today = new Date();
        const targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

        let dayLog = await this.prisma.dietDayLog.findUnique({
          where: { userId_date: { userId, date: targetDate } },
          include: { mealItems: true },
        });

        if (!dayLog) {
          dayLog = await this.prisma.dietDayLog.create({
            data: {
              userId,
              date: targetDate,
              targetKcal: metrics.budget,
              waterGlasses: 0,
              walkMinutes: 0,
            },
            include: { mealItems: true },
          });
        }

        if (dayLog.mealItems.length === 0 && metrics.suggestedMealPlan) {
          const itemsToCreate: any[] = [];
          for (const [slotKey, slotItems] of Object.entries(metrics.suggestedMealPlan)) {
            for (const item of (slotItems as any[])) {
              itemsToCreate.push({
                dayLogId: dayLog.id,
                slot: slotKey as any,
                name: item.name,
                qty: item.qty,
                servings: 1.0,
                kcal: item.kcal,
                proteinG: item.proteinG,
                carbsG: item.carbsG,
                fatG: item.fatG,
              });
            }
          }
          if (itemsToCreate.length > 0) {
            await this.prisma.loggedMealItem.createMany({
              data: itemsToCreate,
            });
          }
        }
      } catch (err) {
        console.error("Error auto-populating AI meals on onboarding:", err);
      }
    }
    return {
      ...updatedUser,
      metrics,
    };
  }

  async updateCalorieCeiling(userId: string, dto: UpdateCalorieCeilingDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        kcalOverride: dto.kcalOverride,
      },
    });

    const metrics = this.nutritionService.calculate(updatedUser);
    return {
      ...updatedUser,
      metrics,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDarkTheme: dto.isDarkTheme,
      },
    });

    const metrics = this.nutritionService.calculate(updatedUser);
    return {
      ...updatedUser,
      metrics,
    };
  }

  async resetOnboarding(userId: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnboarded: false,
      },
    });

    const metrics = this.nutritionService.calculate(updatedUser);
    return {
      ...updatedUser,
      metrics,
    };
  }
}
