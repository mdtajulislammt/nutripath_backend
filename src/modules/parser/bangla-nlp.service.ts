import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseBanglaQuantity,
  convertBanglaToEnglishDigits,
} from '../../common/utils/bangla-numerals.util';

export interface ParsedFoodItemResult {
  foodItemId?: string;
  name: string;
  bengaliName?: string;
  qty: string;
  servings: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
}

@Injectable()
export class BanglaNlpService {
  private readonly logger = new Logger(BanglaNlpService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async parseMealText(text: string): Promise<ParsedFoodItemResult[]> {
    if (!text || !text.trim()) {
      return [];
    }

    // Attempt Gemini 1.5 if API key is valid
    if (this.genAI) {
      try {
        const aiResult = await this.parseWithGemini(text);
        if (aiResult && aiResult.length > 0) {
          return aiResult;
        }
      } catch (err) {
        this.logger.warn(`Gemini NLP parser failed, falling back to rule-based: ${err.message}`);
      }
    }

    // Fallback to robust local regex & database keyword matcher
    return this.parseWithRules(text);
  }

  private async parseWithGemini(text: string): Promise<ParsedFoodItemResult[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash'),
    });

    const prompt = `You are a Bangladeshi nutrition food parser. The user typed what they ate in Bengali or Banglish:
"${text}"

Parse this text into an array of food items with estimated nutrition per Bangladeshi standard servings.
Respond ONLY with a valid JSON array matching this TypeScript structure:
[
  {
    "name": "Bhat (White Rice)",
    "bengaliName": "সাদা ভাত",
    "qty": "1 plate",
    "servings": 1.0,
    "kcal": 204,
    "proteinG": 4.2,
    "carbsG": 44.5,
    "fatG": 0.4,
    "confidence": 0.95
  }
]
No markdown wrapping, no explanation, only the raw JSON array.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed)) {
      // Cross-reference with database items if possible
      for (const item of parsed) {
        const dbMatch = await this.findMatchingDbFood(item.name || item.bengaliName);
        if (dbMatch) {
          item.foodItemId = dbMatch.id;
          item.kcal = Math.round(dbMatch.kcal * (item.servings || 1));
          item.proteinG = Math.round(dbMatch.proteinG * (item.servings || 1) * 10) / 10;
          item.carbsG = Math.round(dbMatch.carbsG * (item.servings || 1) * 10) / 10;
          item.fatG = Math.round(dbMatch.fatG * (item.servings || 1) * 10) / 10;
        }
      }
      return parsed;
    }

    return [];
  }

  async parseWithRules(text: string): Promise<ParsedFoodItemResult[]> {
    // 1. Fetch all food items from DB
    const allFoods = await this.prisma.foodItem.findMany();

    // 2. Split query by conjunctions: আর, এবং, ও, সাথে, +, ,, and, with
    const segments = text
      .split(/(?:\s+(?:আর|এবং|ও|সাথে|and|with|\+)\s+|,\s*|\n+)/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const results: ParsedFoodItemResult[] = [];

    for (const segment of segments) {
      // Extract quantity and food keyword
      // Patterns: "২টা ডিম", "১ প্লেট ভাত", "২ কাপ চা", "2 eggs", "1 bowl dal"
      const normalized = convertBanglaToEnglishDigits(segment);

      let quantity = 1;
      let unit = 'serving';

      // Match numbers: 2টা, 1.5 কাপ, 1 প্লেট, 3 পিস, 2 bowls
      const qtyMatch = normalized.match(
        /(\d+(?:\.\d+)?)\s*(টা|টি|টি|টা|পিস|প্লেট|বাটি|কাপ|গ্লাস|টুকরা|pcs|pc|plate|bowl|cup|glass|slice|slices)?/i,
      );

      if (qtyMatch) {
        quantity = parseFloat(qtyMatch[1]) || 1;
        if (qtyMatch[2]) {
          unit = qtyMatch[2];
        }
      } else {
        quantity = parseBanglaQuantity(segment);
      }

      // Find best matching food
      let bestMatch: any = null;
      let highestScore = 0;

      const cleanSegment = segment.toLowerCase();

      for (const food of allFoods) {
        let score = 0;

        // Check exact match or inclusion in keywords
        for (const kw of food.keywords) {
          const kwLower = kw.toLowerCase();
          if (cleanSegment.includes(kwLower)) {
            const currentScore = kwLower.length;
            if (currentScore > score) {
              score = currentScore;
            }
          }
        }

        if (food.bengaliName && cleanSegment.includes(food.bengaliName.toLowerCase())) {
          score = Math.max(score, food.bengaliName.length + 5);
        }

        if (cleanSegment.includes(food.name.toLowerCase())) {
          score = Math.max(score, food.name.length + 5);
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = food;
        }
      }

      if (bestMatch && highestScore > 0) {
        results.push({
          foodItemId: bestMatch.id,
          name: bestMatch.name,
          bengaliName: bestMatch.bengaliName,
          qty: `${quantity} ${unit}`,
          servings: quantity,
          kcal: Math.round(bestMatch.kcal * quantity),
          proteinG: Math.round(bestMatch.proteinG * quantity * 10) / 10,
          carbsG: Math.round(bestMatch.carbsG * quantity * 10) / 10,
          fatG: Math.round(bestMatch.fatG * quantity * 10) / 10,
          confidence: Math.min(0.95, 0.6 + highestScore * 0.05),
        });
      } else {
        // Unknown food item detected, default estimate
        results.push({
          name: segment,
          bengaliName: segment,
          qty: `${quantity} ${unit}`,
          servings: quantity,
          kcal: Math.round(150 * quantity),
          proteinG: Math.round(4.0 * quantity * 10) / 10,
          carbsG: Math.round(20.0 * quantity * 10) / 10,
          fatG: Math.round(5.0 * quantity * 10) / 10,
          confidence: 0.4,
        });
      }
    }

    return results;
  }

  private async findMatchingDbFood(name: string) {
    if (!name) return null;
    const lower = name.toLowerCase();
    return this.prisma.foodItem.findFirst({
      where: {
        OR: [
          { name: { contains: lower, mode: 'insensitive' } },
          { bengaliName: { contains: lower, mode: 'insensitive' } },
          { keywords: { has: lower } },
        ],
      },
    });
  }
}
