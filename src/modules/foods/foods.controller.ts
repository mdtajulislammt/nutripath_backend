import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FoodsService } from './foods.service';
import { QueryFoodsDto, CreateCustomFoodDto, ParseBanglaMealDto } from './dto/foods.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Foods & Catalog')
@UseGuards(JwtAuthGuard)
@Controller('foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search food catalog with query and category filters' })
  async getFoods(@Query() query: QueryFoodsDto) {
    return this.foodsService.findAll(query);
  }

  @ApiBearerAuth()
  @Post('custom')
  @ApiOperation({ summary: 'Create user custom food item' })
  async createCustomFood(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomFoodDto,
  ) {
    return this.foodsService.createCustom(userId, dto);
  }

  @Public()
  @Post('parse-bangla')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse natural language Bengali food sentence to structured items' })
  async parseBangla(@Body() dto: ParseBanglaMealDto) {
    return this.foodsService.parseBangla(dto);
  }
}
