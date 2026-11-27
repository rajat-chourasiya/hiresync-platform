import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('roles')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  // ─── Permissions list (read-only, any authenticated staff) ───────────────
  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  // ─── Roles ────────────────────────────────────────────────────────────────
  @Post('roles')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'Create a custom org role' })
  createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(req.user.orgId, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: "List this org's custom roles" })
  listRoles(@Req() req: any) {
    return this.rolesService.listRoles(req.user.orgId);
  }

  // ─── Assign / remove role on a user ──────────────────────────────────────
  @Post('users/:userId/roles')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'Assign a custom role to a user' })
  assignRole(@Req() req: any, @Param('userId') userId: string, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(req.user.orgId, userId, dto.roleId);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermission('roles.manage')
  @ApiOperation({ summary: 'Remove a custom role from a user' })
  removeRole(@Req() req: any, @Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.rolesService.removeRoleFromUser(req.user.orgId, userId, roleId);
  }
}
