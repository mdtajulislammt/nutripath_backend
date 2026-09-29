import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FoodCategory } from '@prisma/client';

export class QueryFoodsDto {
  @ApiPropertyOptional({ description: 'Search term for food name, bengali name, or keywords' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: FoodCategory, description: 'Filter by Food Category' })
  @IsOptional()
  @IsEnum(FoodCategory)
  cat?: FoodCategory;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class CreateCustomFoodDto {
  @ApiProperty({ example: 'Homemade Chicken Korma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'বাসায় তৈরি চিকেন কোরমা' })
  @IsOptional()
  @IsString()
  bengaliName?: string;

  @ApiProperty({ enum: FoodCategory, example: FoodCategory.PROTEIN })
  @IsEnum(FoodCategory)
  category: FoodCategory;

  @ApiProperty({ example: '1 bowl (180g)' })
  @IsString()
  @IsNotEmpty()
  servingQty: string;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  unitWeightG?: number;

  @ApiProperty({ example: 290 })
  @IsNumber()
  @Min(0)
  kcal: number;

  @ApiProperty({ example: 24.5 })
  @IsNumber()
  @Min(0)
  proteinG: number;

  @ApiProperty({ example: 8.0 })
  @IsNumber()
  @Min(0)
  carbsG: number;

  @ApiProperty({ example: 18.0 })
  @IsNumber()
  @Min(0)
  fatG: number;

  @ApiPropertyOptional({ example: ['korma', 'chicken', 'কোরমা'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class ParseBanglaMealDto {
  @ApiProperty({
    example: '২টা ডিম আর ১ প্লেট ভাত',
    description: 'Natural language description of foods in Bengali or Banglish',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
