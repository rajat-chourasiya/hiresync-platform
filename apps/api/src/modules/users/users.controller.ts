import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission('users.create')
  create(@Req() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.orgId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user.orgId);
  }

  @Patch(':id')
  @RequirePermission('users.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.orgId, id, dto);
  }
}