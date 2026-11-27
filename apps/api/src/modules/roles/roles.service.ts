import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // ─── Create custom role ───────────────────────────────────────────────────
  async createRole(orgId: string, dto: CreateRoleDto) {
    // Validate all permission names exist
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: dto.permissionNames } },
    });
    const foundNames = permissions.map((p) => p.name);
    const unknown = dto.permissionNames.filter((n) => !foundNames.includes(n));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission names: ${unknown.join(', ')}`);
    }

    return this.prisma.role.create({
      data: {
        orgId,
        name: dto.name,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  // ─── List org's custom roles ──────────────────────────────────────────────
  async listRoles(orgId: string) {
    return this.prisma.role.findMany({
      where: { orgId },
      include: { permissions: { include: { permission: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── List all permissions ─────────────────────────────────────────────────
  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  // ─── Assign role to user ─────────────────────────────────────────────────
  async assignRoleToUser(orgId: string, userId: string, roleId: string) {
    // User must be in this org
    const user = await this.prisma.user.findFirst({ where: { id: userId, orgId } });
    if (!user) throw new NotFoundException('User not found in this org');

    // Role must belong to this org
    const role = await this.prisma.role.findFirst({ where: { id: roleId, orgId } });
    if (!role) throw new NotFoundException('Role not found in this org');

    // Reject duplicate
    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (existing) throw new BadRequestException('User already has this role');

    return this.prisma.userRole.create({ data: { userId, roleId } });
  }

  // ─── Remove role from user ────────────────────────────────────────────────
  async removeRoleFromUser(orgId: string, userId: string, roleId: string) {
    // Role must belong to this org
    const role = await this.prisma.role.findFirst({ where: { id: roleId, orgId } });
    if (!role) throw new ForbiddenException('Role does not belong to this org');

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!existing) throw new NotFoundException('User does not have this role');

    return this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }
}
