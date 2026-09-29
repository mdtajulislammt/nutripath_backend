import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatQueryDto {
  @ApiProperty({
    example: 'আমি কি রাতে ভাত খেতে পারি? আমার আজকের বাকি ক্যালোরি কত?',
    description: 'User message or query in Bengali or English',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
