import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import type { StringValue } from 'ms';

import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  private signTokens(
    userId: string,
    orgId: string,
    role: string,
    tokenVersion: number,
  ) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const accessExpiresIn =
      (process.env.JWT_ACCESS_EXPIRES_IN as StringValue);

    const refreshExpiresIn =
      (process.env.JWT_REFRESH_EXPIRES_IN as StringValue);

    const accessToken = jwt.sign(
      {
        sub: userId,
        orgId,
        role,
        tokenVersion,
      },
      accessSecret,
      {
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = jwt.sign(
      {
        sub: userId,
        tokenVersion,
      },
      refreshSecret,
      {
        expiresIn: refreshExpiresIn,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      Number(process.env.PASSWORD_SALT_ROUNDS || 12),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.orgName,
        },
      });

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          email: dto.email,
          passwordHash,
          role: 'org_admin',
        },
      });

      return {
        org,
        user,
      };
    });

    const { accessToken, refreshToken } = this.signTokens(
      result.user.id,
      result.org.id,
      result.user.role,
      result.user.tokenVersion,
    );

    await this.prisma.user.update({
      where: {
        id: result.user.id,
      },
      data: {
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = this.signTokens(
      user.id,
      user.orgId,
      user.role,
      user.tokenVersion,
    );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash: this.hashToken(refreshToken),
        refreshTokenExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(oldRefreshToken: string) {
  let payload: { sub: string; tokenVersion: number };
  try {
    payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET as string) as typeof payload;
  } catch {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new UnauthorizedException('User not found');

  const incomingHash = this.hashToken(oldRefreshToken);
  if (
    user.refreshTokenHash !== incomingHash ||
    user.tokenVersion !== payload.tokenVersion ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt < new Date()
  ) {
    throw new UnauthorizedException('Refresh token invalid or reused');
  }

  const newTokenVersion = user.tokenVersion + 1;
  const { accessToken, refreshToken } = this.signTokens(user.id, user.orgId, user.role, newTokenVersion);

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      tokenVersion: newTokenVersion,
      refreshTokenHash: this.hashToken(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}
}   