import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto, RefreshTokenDto, DevLoginDto } from './dto/auth.dto';
import { NutritionService } from '../nutrition/nutrition.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly nutritionService: NutritionService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    this.googleClient = new OAuth2Client(clientId);

    if (!getApps().length) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID', 'ekhoroch');
      try {
        initializeApp({
          projectId,
        });
        this.logger.log(`Firebase Admin initialized with project: ${projectId}`);
      } catch (err) {
        this.logger.warn(`Firebase Admin init note: ${err.message}`);
      }
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'nutripath_jwt_access_secret_key_2026_super_secure'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '7d'),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    let email = dto.email;
    let name = dto.name || 'NutriPath User';
    let avatarUrl = dto.avatarUrl;
    let googleId: string | null = dto.firebaseUid || null;

    // 1. Try Firebase Admin token verification if idToken is supplied
    if (dto.idToken && !dto.idToken.startsWith('mock_')) {
      try {
        const decodedFb = await getAuth().verifyIdToken(dto.idToken);
        if (decodedFb) {
          email = decodedFb.email || email;
          name = decodedFb.name || name;
          avatarUrl = decodedFb.picture || avatarUrl;
          googleId = decodedFb.uid || googleId;
          this.logger.log(`Verified Firebase ID Token for user: ${email} (${googleId})`);
        }
      } catch (fbErr) {
        this.logger.warn(`Firebase token verify skipped or failed: ${fbErr.message}`);

        // 2. Fallback to Google OAuth2 token verification
        try {
          const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
          if (clientId && clientId !== 'your-google-client-id.apps.googleusercontent.com') {
            const ticket = await this.googleClient.verifyIdToken({
              idToken: dto.idToken,
              audience: clientId,
            });
            const payload = ticket.getPayload();
            if (payload) {
              email = payload.email || email;
              name = payload.name || name;
              avatarUrl = payload.picture || avatarUrl;
              googleId = payload.sub || googleId;
              this.logger.log(`Verified Google OAuth Token for user: ${email} (${googleId})`);
            }
          }
        } catch (gErr) {
          this.logger.warn(`Google OAuth token verify failed: ${gErr.message}`);
        }

        // 3. Fallback to JWT payload decoding
        if (!email) {
          try {
            const decoded: any = this.jwtService.decode(dto.idToken);
            if (decoded) {
              email = decoded.email || email;
              name = decoded.name || name;
              avatarUrl = decoded.picture || avatarUrl;
              googleId = decoded.sub || decoded.uid || googleId;
            }
          } catch (_) {}
        }
      }
    }

    if (!email) {
      throw new UnauthorizedException('Email could not be determined from Google/Firebase token');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(googleId ? [{ googleId }] : [])],
      },
    });

    if (!user) {
      this.logger.log(`Registering new user via Google/Firebase Auth: ${email}`);
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          isGoogleLinked: true,
          googleId,
          gender: 'MALE',
          age: 26,
          heightCm: 175.0,
          currentWeight: 110.0,
          targetWeight: 100.0,
          targetMonths: 2,
          activityLevel: 'COMMUTE',
          healthConditions: ['None'],
          kcalOverride: null,
          isOnboarded: false,
        },
      });
    } else {
      this.logger.log(`Existing user logged in: ${email}`);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isGoogleLinked: true,
          googleId: googleId || user.googleId,
          avatarUrl: avatarUrl || user.avatarUrl,
          name: name || user.name,
        },
      });
    }

    const tokens = await this.generateTokens(user);
    const metrics = this.nutritionService.calculate(user);

    return {
      ...tokens,
      user: {
        ...user,
        metrics,
      },
    };
  }

  async loginDev(dto: DevLoginDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name || 'Test User',
          gender: 'MALE',
          age: 26,
          heightCm: 175.0,
          currentWeight: 110.0,
          targetWeight: 100.0,
          targetMonths: 2,
          activityLevel: 'COMMUTE',
          healthConditions: ['None'],
          kcalOverride: null,
          isOnboarded: false,
        },
      });
    }

    const tokens = await this.generateTokens(user);
    const metrics = this.nutritionService.calculate(user);

    return {
      ...tokens,
      user: {
        ...user,
        metrics,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Issue new tokens
    const tokens = await this.generateTokens(storedToken.user);
    const metrics = this.nutritionService.calculate(storedToken.user);

    return {
      ...tokens,
      user: {
        ...storedToken.user,
        metrics,
      },
    };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    } else if (userId) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Successfully logged out' };
  }
}
