import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { SubmitInterviewerFeedbackDto} from '../hiring-pipeline/dto/submit-interviewer-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('interviews/:interviewId/feedback')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  @RequirePermission('feedback.submit')
  submit(@Req() req: any, @Param('interviewId') interviewId: string, @Body() dto: SubmitInterviewerFeedbackDto) {
    return this.feedbackService.submit(req.user.orgId, interviewId, req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: any, @Param('interviewId') interviewId: string) {
    return this.feedbackService.findByInterview(req.user.orgId, interviewId);
  }

  @Get('candidate/:candidateId')
  findByCandidate(@Req() req: any, @Param('interviewId') interviewId: string, @Param('candidateId') candidateId: string) {
    return this.feedbackService.findByCandidate(req.user.orgId, interviewId, candidateId);
  }
}