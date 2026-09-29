import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { ParserModule } from './modules/parser/parser.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { FoodsModule } from './modules/foods/foods.module';
import { MealLogsModule } from './modules/meal-logs/meal-logs.module';
import { HistoryModule } from './modules/history/history.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    NutritionModule,
    ParserModule,
    AuthModule,
    UserModule,
    FoodsModule,
    MealLogsModule,
    HistoryModule,
    AnalyticsModule,
    AiChatModule,
  ],
})
export class AppModule {}
