import { Gender, ActivityLevel } from '@prisma/client';

export interface SuggestedFoodItem {
  name: string;
  qty: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionMetrics {
  bmr: number;
  tdee: number;
  budget: number;
  autoBudget: number;
  walkMinGoal: number;
  waterGoalGlasses: number;
  macros: {
    proteinG: number; // 30% of budget (4 kcal/g)
    carbsG: number;   // 45% of budget (4 kcal/g)
    fatG: number;     // 25% of budget (9 kcal/g)
  };
  suggestedMealPlan: {
    BREAKFAST: SuggestedFoodItem[];
    LUNCH: SuggestedFoodItem[];
    SNACK: SuggestedFoodItem[];
    DINNER: SuggestedFoodItem[];
  };
}

export function generateSuggestedMealPlan(budget: number, conditions: string[] = []): {
  BREAKFAST: SuggestedFoodItem[];
  LUNCH: SuggestedFoodItem[];
  SNACK: SuggestedFoodItem[];
  DINNER: SuggestedFoodItem[];
} {
  const isDiabetes = conditions.some(c => c.toLowerCase().includes("diabet"));
  const isHighBp = conditions.some(c => c.toLowerCase().includes("bp") || c.toLowerCase().includes("pressure"));
  const isGastric = conditions.some(c => c.toLowerCase().includes("gastric") || c.toLowerCase().includes("acid"));

  const bBudget = Math.round(budget * 0.25);
  const lBudget = Math.round(budget * 0.40);
  const sBudget = Math.round(budget * 0.12);
  const dBudget = budget - bBudget - lBudget - sBudget;

  const breakfast: SuggestedFoodItem[] = [
    {
      name: isDiabetes ? "লাল আটার পাতলা রুটি (লো-গ্লাইসেমিক)" : "লাল আটার পাতলা রুটি",
      qty: bBudget > 320 ? "২টি" : "১টি",
      kcal: bBudget > 320 ? 150 : 80,
      proteinG: bBudget > 320 ? 6.0 : 3.0,
      carbsG: bBudget > 320 ? 30.0 : 16.0,
      fatG: 1.0,
    },
    {
      name: isHighBp ? "সেদ্ধ ডিম (কুসুম ছাড়া/পূর্ণ)" : "সেদ্ধ ডিম",
      qty: "১টি",
      kcal: 75,
      proteinG: 6.5,
      carbsG: 0.6,
      fatG: 5.0,
    },
    {
      name: "শসা ও লেবুর তাজা সালাদ",
      qty: "১ বাটি",
      kcal: 25,
      proteinG: 1.0,
      carbsG: 4.5,
      fatG: 0.2,
    },
    {
      name: isGastric ? "হালকা গরম পানি বা আদা চা (চিনি ছাড়া)" : "গ্রিন টি / চিনি ছাড়া রং চা",
      qty: "১ কাপ",
      kcal: 2,
      proteinG: 0.0,
      carbsG: 0.5,
      fatG: 0.0,
    },
  ];

  const lunch: SuggestedFoodItem[] = [
    {
      name: isDiabetes ? "লাল চালের সুষম ভাত" : "সাদা/লাল চালের ভাত",
      qty: lBudget > 500 ? "১.৫ কাপ (২২০ গ্রাম)" : "১ কাপ (১৫০ গ্রাম)",
      kcal: lBudget > 500 ? 270 : 200,
      proteinG: lBudget > 500 ? 5.5 : 4.0,
      carbsG: lBudget > 500 ? 58.0 : 44.0,
      fatG: 0.6,
    },
    {
      name: "রুই/কাতল মাছের পাতলা ঝোল",
      qty: "১ মাঝারি টুকরো (৯০ গ্রাম)",
      kcal: 140,
      proteinG: 18.0,
      carbsG: 2.0,
      fatG: 6.5,
    },
    {
      name: "পাতলা মসুর ডাল",
      qty: "১ বাটি (১৫০ মিলি)",
      kcal: 90,
      proteinG: 6.0,
      carbsG: 13.0,
      fatG: 1.5,
    },
    {
      name: isDiabetes ? "করল্লা/লাউ শাক মিক্সড ভাজি (কম তেলে)" : "সবুজ শাক ও পাঁচমিশালি সবজি",
      qty: "১ বাটি",
      kcal: 60,
      proteinG: 2.5,
      carbsG: 7.0,
      fatG: 2.5,
    },
  ];

  const snack: SuggestedFoodItem[] = [
    {
      name: "শুকনা মুড়ি",
      qty: "১ মুঠো (২৫ গ্রাম)",
      kcal: 75,
      proteinG: 1.5,
      carbsG: 17.0,
      fatG: 0.2,
    },
    {
      name: isDiabetes ? "ভেজানো কাঁচা ছোলা ও শসা" : "চিনা বাদাম / কাজু বাদাম",
      qty: "১০-১২টি",
      kcal: 65,
      proteinG: 3.0,
      carbsG: 3.0,
      fatG: 5.0,
    },
    {
      name: "চিনি ছাড়া গ্রিন টি",
      qty: "১ কাপ",
      kcal: 2,
      proteinG: 0.0,
      carbsG: 0.5,
      fatG: 0.0,
    },
  ];

  const dinner: SuggestedFoodItem[] = [
    {
      name: "লাল আটার পাতলা রুটি",
      qty: dBudget > 300 ? "২টি" : "১টি",
      kcal: dBudget > 300 ? 150 : 80,
      proteinG: dBudget > 300 ? 6.0 : 3.0,
      carbsG: dBudget > 300 ? 30.0 : 16.0,
      fatG: 1.0,
    },
    {
      name: "মুরগির বুকের মাংস পাতলা ঝোল (চামড়া ছাড়া)",
      qty: "১ মাঝারি বাটি (১০০ গ্রাম)",
      kcal: 135,
      proteinG: 22.0,
      carbsG: 1.5,
      fatG: 4.0,
    },
    {
      name: "পেঁপে ও লাউ সবজি ভুনা (হালকা মসলা)",
      qty: "১ বাটি",
      kcal: 55,
      proteinG: 1.5,
      carbsG: 8.0,
      fatG: 1.5,
    },
    {
      name: "কাঁচা শসা ও টমেটো সালাদ",
      qty: "১ ছোট প্লেট",
      kcal: 20,
      proteinG: 0.8,
      carbsG: 3.5,
      fatG: 0.2,
    },
  ];

  return {
    BREAKFAST: breakfast,
    LUNCH: lunch,
    SNACK: snack,
    DINNER: dinner,
  };
}

export function calculateNutritionMetrics(user: {
  gender: Gender;
  age: number;
  currentWeight: number;
  heightCm: number;
  targetWeight: number;
  targetMonths: number;
  activityLevel: ActivityLevel;
  healthConditions?: string[];
  kcalOverride?: number | null;
}): NutritionMetrics {
  // 1. Mifflin-St Jeor BMR
  const genderOffset = user.gender === Gender.MALE ? 5 : -161;
  const bmr = Math.round(
    10 * user.currentWeight + 6.25 * user.heightCm - 5 * user.age + genderOffset,
  );

  // 2. Activity Multiplier for TDEE
  const activityMultipliers: Record<ActivityLevel, number> = {
    [ActivityLevel.SEDENTARY]: 1.2,
    [ActivityLevel.COMMUTE]: 1.3,
    [ActivityLevel.WALKING]: 1.4,
  };
  const multiplier = activityMultipliers[user.activityLevel] || 1.3;
  const tdee = Math.round(bmr * multiplier);

  // 3. Calorie Adjustment (Deficit for Loss, Surplus for Gain)
  const targetDays = Math.min(365, Math.max(30, (user.targetMonths || 2) * 30));
  let autoBudget = tdee;

  if (user.targetWeight && user.targetWeight < user.currentWeight) {
    // Weight Loss: Deficit (7700 kcal per kg)
    const lossKg = user.currentWeight - user.targetWeight;
    const deficit = Math.min(1000, Math.max(250, Math.round((lossKg * 7700) / targetDays)));
    const floor = user.gender === Gender.MALE ? 1300 : 1200;
    autoBudget = Math.max(floor, Math.round((tdee - deficit) / 50) * 50);
  } else if (user.targetWeight && user.targetWeight > user.currentWeight) {
    // Weight Gain: Surplus (7700 kcal per kg)
    const gainKg = user.targetWeight - user.currentWeight;
    const surplus = Math.min(1000, Math.max(250, Math.round((gainKg * 7700) / targetDays)));
    autoBudget = Math.min(4500, Math.round((tdee + surplus) / 50) * 50);
  } else {
    autoBudget = Math.round(tdee / 50) * 50;
  }

  // Treat legacy default 1200 override as null so user gets dynamic plan
  const effectiveOverride = (user.kcalOverride === 1200 && autoBudget !== 1200) ? null : user.kcalOverride;
  const budget = effectiveOverride ?? autoBudget;

  // 5. Walking Goal (Brisk Walk in Minutes)
  const walkMinGoal = user.currentWeight > 100 ? 45 : user.currentWeight > 85 ? 40 : 30;

  // 6. Water Goal (Glasses based on body weight, ~35ml/kg, 250ml per glass)
  const waterGoalGlasses = Math.max(8, Math.min(16, Math.round((user.currentWeight * 0.035) / 0.25)));

  // 7. Macro Distribution: 30% P, 45% C, 25% F
  const macros = {
    proteinG: Math.round((budget * 0.30) / 4),
    carbsG: Math.round((budget * 0.45) / 4),
    fatG: Math.round((budget * 0.25) / 9),
  };

  // 8. AI Suggested Meal Plan
  const suggestedMealPlan = generateSuggestedMealPlan(budget, user.healthConditions || []);

  return { bmr, tdee, budget, autoBudget, walkMinGoal, waterGoalGlasses, macros, suggestedMealPlan };
}
