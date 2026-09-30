import { Controller, Post, Get, Body, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('org_admin')
  create(@Req() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.orgId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user.orgId);
  }

  @Patch(':id')
@Roles('recruiter', 'org_admin')
update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
  return this.usersService.update(req.user.orgId, id, dto);
}
}