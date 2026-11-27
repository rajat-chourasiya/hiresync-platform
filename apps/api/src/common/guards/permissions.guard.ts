import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { hasPermission } from '../constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>('permission', context.getHandler());
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Missing permission: ' + required);

    // Fast path: built-in role has the permission via ROLE_PERMISSIONS map
    if (hasPermission(user.role, required)) return true;

    // DB path: check custom roles assigned to this user
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.sub },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const customPermNames = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.name),
    );

    if (!customPermNames.includes(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }

    return true;
  }
}
