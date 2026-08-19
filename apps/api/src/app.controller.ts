import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { getCurrentOrgId } from './common/context/tenant-context';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/tenant-context')
  checkTenantContext() {
    const orgId = getCurrentOrgId();
      return { orgId: orgId || 'NOT SET — middleware not working' };
}
}
