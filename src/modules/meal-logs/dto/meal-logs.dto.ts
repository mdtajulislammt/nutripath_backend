import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
  IsInt,
} from 'class-validator';
import { MealSlotType } from '@prisma/client';

export class AddMealItemDto {
  @ApiPropertyOptional({ example: '2026-09-28', description: 'Log date, defaults to today' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ enum: MealSlotType, example: MealSlotType.BREAKFAST })
  @IsEnum(MealSlotType)
  slot: MealSlotType;

  @ApiPropertyOptional({ example: 'food-bhat-white-rice', description: 'FoodItem ID if from catalog' })
  @IsOptional()
  @IsString()
  foodItemId?: string;

  @ApiProperty({ example: 'Bhat (White Rice)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1 cup' })
  @IsString()
  @IsNotEmpty()
  qty: string;

  @ApiPropertyOptional({ example: 1.0, default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  servings?: number = 1.0;

  @ApiProperty({ example: 204 })
  @IsNumber()
  @Min(0)
  kcal: number;

  @ApiProperty({ example: 4.2 })
  @IsNumber()
  @Min(0)
  proteinG: number;

  @ApiProperty({ example: 44.5 })
  @IsNumber()
  @Min(0)
  carbsG: number;

  @ApiProperty({ example: 0.4 })
  @IsNumber()
  @Min(0)
  fatG: number;
}

export class UpdateHabitsDto {
  @ApiPropertyOptional({ example: '2026-09-28', description: 'Log date, defaults to today' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 1, description: 'Change in water glasses (+1 or -1)' })
  @IsOptional()
  @IsInt()
  waterGlassesChange?: number;

  @ApiPropertyOptional({ example: 8, description: 'Absolute value for water glasses' })
  @IsOptional()
  @IsInt()
  @Min(0)
  waterGlasses?: number;

  @ApiPropertyOptional({ example: 15, description: 'Change in walking minutes (+15 or -15)' })
  @IsOptional()
  @IsInt()
  walkMinutesChange?: number;

  @ApiPropertyOptional({ example: 45, description: 'Absolute value for walking minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  walkMinutes?: number;
}
