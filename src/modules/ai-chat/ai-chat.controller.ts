import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { ChatQueryDto } from './dto/ai-chat.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Bengali AI Nutritionist Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('history')
  @ApiOperation({ summary: 'Load previous conversation history with the AI Nutritionist' })
  async getHistory(@CurrentUser('id') userId: string) {
    return this.aiChatService.getChatHistory(userId);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Bengali/English question to AI Nutritionist injected with personal health metrics' })
  async queryAi(
    @CurrentUser('id') userId: string,
    @Body() dto: ChatQueryDto,
  ) {
    return this.aiChatService.processQuery(userId, dto);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all AI chat history for the user' })
  async clearHistory(@CurrentUser('id') userId: string) {
    return this.aiChatService.clearChatHistory(userId);
  }
}
