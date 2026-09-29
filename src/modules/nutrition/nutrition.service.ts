import { Injectable } from '@nestjs/common';
import { Gender, ActivityLevel } from '@prisma/client';
import { calculateNutritionMetrics, NutritionMetrics } from '../../common/utils/nutrition-calc.util';

@Injectable()
export class NutritionService {
  calculate(user: {
    gender: Gender;
    age: number;
    currentWeight: number;
    heightCm: number;
    targetWeight: number;
    targetMonths: number;
    activityLevel: ActivityLevel; healthConditions?: string[];
    kcalOverride?: number | null;
  }): NutritionMetrics {
    return calculateNutritionMetrics(user);
  }
}
