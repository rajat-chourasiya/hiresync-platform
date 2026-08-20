import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest();
    const userRole = req.user?.role;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}