import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>('permission', context.getHandler());
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const role = req.user?.role;

    if (!hasPermission(role, required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
    return true;
  }
}