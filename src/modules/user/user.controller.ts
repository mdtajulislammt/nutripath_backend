import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  UpdateProfileDto,
  UpdateCalorieCeilingDto,
  UpdatePreferencesDto,
} from './dto/user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile with calculated BMR/TDEE and target macros' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile parameters (weight, height, targetWeight, timeline, activity)' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  @Patch('calorie-ceiling')
  @ApiOperation({ summary: 'Set custom manual calorie budget ceiling or reset to auto' })
  async updateCalorieCeiling(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCalorieCeilingDto,
  ) {
    return this.userService.updateCalorieCeiling(userId, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Toggle dark theme or other user preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(userId, dto);
  }

  @Post('reset-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset onboarding flow to start over' })
  async resetOnboarding(@CurrentUser('id') userId: string) {
    return this.userService.resetOnboarding(userId);
  }
}
