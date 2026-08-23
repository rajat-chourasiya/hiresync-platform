import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Roles } from './common/decorators/roles.decorator';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected/admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('org_admin')
  adminOnly() {
    return { message: 'You are an org_admin, access granted' };
  }
}