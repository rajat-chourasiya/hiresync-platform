import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, Number(process.env.PASSWORD_SALT_ROUNDS));

    return this.prisma.user.create({
      data: {
        orgId,
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
      },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, email: true, name: true, role: true, timezone: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMyTimezone(userId: string, timezone: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { timezone },
      select: { id: true, email: true, name: true, role: true, timezone: true },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: { id: true, email: true, name: true, role: true, timezone: true, createdAt: true },
    });
  }

  async update(orgId: string, userId: string, dto: UpdateUserDto) {
  const user = await this.prisma.user.findFirst({ where: { id: userId, orgId } });
  if (!user) throw new NotFoundException('User not found');

  return this.prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.timezone ? { timezone: dto.timezone } : {}),
    },
  });
}
}