import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplyDto } from './dto/apply.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OtpService } from '../otp/otp.service';

@ApiBearerAuth()
@Controller('orgs/:orgId/jobs/:jobSlug/apply')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService, private otpService: OtpService,) {}

  @Post()
  async apply(
    @Param('orgId') orgId: string,
    @Param('jobSlug') jobSlug: string,
    @Body() dto: ApplyDto & { otp: string },
  ) {
    await this.otpService.verify(dto.email, 'apply_verification', dto.otp);
    return this.applicationsService.apply(orgId, jobSlug, dto);
  }
}