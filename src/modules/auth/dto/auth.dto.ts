import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID Token from mobile client' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ description: 'Optional user email fallback' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Optional user full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Optional user avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Optional Firebase user UID' })
  @IsOptional()
  @IsString()
  firebaseUid?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token issued by backend' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class DevLoginDto {
  @ApiProperty({ example: 'testuser@nutripath.com', description: 'Email for dev login or direct testing' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Test User', description: 'Name of the user' })
  @IsOptional()
  @IsString()
  name?: string;
}
