import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Gender, ActivityLevel } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'MD Tajul Islam' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: 175.0 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({ example: 110.0 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  currentWeight?: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  targetWeight?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  targetMonths?: number;

  @ApiPropertyOptional({ enum: ActivityLevel, example: ActivityLevel.COMMUTE })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @ApiPropertyOptional({ example: ['None', 'Pre-diabetic'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isOnboarded?: boolean;
}

export class UpdateCalorieCeilingDto {
  @ApiProperty({ example: 1400, description: 'Calorie ceiling override, or null to revert to auto budget' })
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(5000)
  kcalOverride?: number | null;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDarkTheme?: boolean;
}
