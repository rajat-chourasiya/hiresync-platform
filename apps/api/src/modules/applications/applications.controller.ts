import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ApplyDto } from './dto/apply.dto';
import { OtpService } from '../otp/otp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
export class ApplicationsController {
  constructor(
    private applicationsService: ApplicationsService,
    private otpService: OtpService,
  ) { }

  // Public apply route (existing)
  @Post('orgs/:orgId/jobs/:jobSlug/apply')
  async apply(
    @Param('orgId') orgId: string,
    @Param('jobSlug') jobSlug: string,
    @Body() dto: ApplyDto,
  ) {
    if (dto.otp) {
      await this.otpService.verify(dto.email, 'apply_verification', dto.otp);
    }
    return this.applicationsService.apply(orgId, jobSlug, dto);
  }

  // Recruiter-facing: list applications for a job (protected)
  @Get('jobs/:jobId/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listByJob(@Req() req: any, @Param('jobId') jobId: string) {
    return this.applicationsService.listByJob(req.user.orgId, jobId);
  }

  // Recruiter-facing: single application with AI analysis (protected)
  @Get('applications/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.applicationsService.findOne(req.user.orgId, id);
  }

  // Recruiter-facing: multiple applications listByJobRanked with AI analysis (protected)
  @Get('jobs/:jobId/applications/ranked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listRanked(@Req() req: any, @Param('jobId') jobId: string) {
    return this.applicationsService.listByJobRanked(req.user.orgId, jobId);
  }
}

