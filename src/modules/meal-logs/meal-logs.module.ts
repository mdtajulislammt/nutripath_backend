import { Module } from '@nestjs/common';
import { MealLogsService } from './meal-logs.service';
import { MealLogsController } from './meal-logs.controller';

@Module({
  controllers: [MealLogsController],
  providers: [MealLogsService],
  exports: [MealLogsService],
})
export class MealLogsModule {}
