import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogWeightDto {
  @ApiProperty({ example: 108.5, description: 'Weight in kilograms' })
  @IsNumber()
  @Min(20)
  @Max(300)
  @IsNotEmpty()
  weightKg: number;

  @ApiPropertyOptional({ example: '2026-09-28', description: 'Date of weight measurement, defaults to now' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Morning weigh-in before breakfast' })
  @IsOptional()
  @IsString()
  notes?: string;
}
