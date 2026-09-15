import { Controller, Post, Get, Body, Param, UseGuards, Req, Put } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HiringPipelineService } from './hiring-pipeline.service';
import { SubmitRecruiterEvaluationDto } from './dto/submit-recruiter-evaluation.dto';
import { SubmitManagerEvaluationDto } from './dto/submit-manager-evaluation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ApproveHireDto } from './dto/approve-hire.dto';

@Controller('applications/:applicationId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class HiringPipelineController {
  constructor(private service: HiringPipelineService) {}

  @Post('recruiter-evaluation')
  @RequirePermission('applications.review')
  submitRecruiter(@Req() req: any, @Param('applicationId') applicationId: string, @Body() dto: SubmitRecruiterEvaluationDto) {
    return this.service.submitRecruiterEvaluation(req.user.orgId, applicationId, req.user.sub, dto);
  }

  @Post('manager-evaluation')
  submitManager(@Req() req: any, @Param('applicationId') applicationId: string, @Body() dto: SubmitManagerEvaluationDto) {
    return this.service.submitOrUpdateManagerEvaluation(req.user.orgId, applicationId, req.user.sub, dto);
  }

  @Put('manager-evaluation')
  editManager(@Req() req: any, @Param('applicationId') applicationId: string, @Body() dto: SubmitManagerEvaluationDto) {
    return this.service.submitOrUpdateManagerEvaluation(req.user.orgId, applicationId, req.user.sub, dto);
  }

  @Post('approve-hire')
  @RequirePermission('applications.review')
  approveHire(@Req() req: any, @Param('applicationId') applicationId: string, @Body() dto: ApproveHireDto) {
    return this.service.approveHire(req.user.orgId, applicationId, req.user.sub, dto);
  }

  @Get('hiring-decision')
  getDecision(@Req() req: any, @Param('applicationId') applicationId: string) {
    return this.service.getDecision(req.user.orgId, applicationId);
  }
}