import { Global, Module } from '@nestjs/common';
import { NutritionService } from './nutrition.service';

@Global()
@Module({
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
