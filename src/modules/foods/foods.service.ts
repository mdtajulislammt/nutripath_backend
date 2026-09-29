import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BanglaNlpService } from '../parser/bangla-nlp.service';
import { QueryFoodsDto, CreateCustomFoodDto, ParseBanglaMealDto } from './dto/foods.dto';

@Injectable()
export class FoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly banglaNlpService: BanglaNlpService,
  ) {}

  async findAll(query: QueryFoodsDto) {
    const { q, cat, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FoodItemWhereInput = {};

    if (cat) {
      where.category = cat;
    }

    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bengaliName: { contains: search, mode: 'insensitive' } },
        { keywords: { has: search.toLowerCase() } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.foodItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.foodItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.foodItem.findUnique({
      where: { id },
    });
  }

  async createCustom(userId: string, dto: CreateCustomFoodDto) {
    return this.prisma.foodItem.create({
      data: {
        name: dto.name,
        bengaliName: dto.bengaliName,
        category: dto.category,
        servingQty: dto.servingQty,
        unitWeightG: dto.unitWeightG,
        kcal: dto.kcal,
        proteinG: dto.proteinG,
        carbsG: dto.carbsG,
        fatG: dto.fatG,
        keywords: dto.keywords || [dto.name.toLowerCase()],
        isVerified: false,
        createdById: userId,
      },
    });
  }

  async parseBangla(dto: ParseBanglaMealDto) {
    return this.banglaNlpService.parseMealText(dto.text);
  }
}
