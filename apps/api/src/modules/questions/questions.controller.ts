import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InterviewsService } from '../interviews/interviews.service';

@Controller('interviews/:interviewId/questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private questionsService: QuestionsService, private interviewsService: InterviewsService) {}

  @Post(':candidateId')
  generate(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.questionsService.generate(req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role, dto);
  }

  @Get(':candidateId')
  findOne(@Req() req: any, @Param('interviewId') interviewId: string, @Param('candidateId') candidateId: string) {
    return this.questionsService.findOne(req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role);
  }

  @Get()
  findAll(@Req() req: any, @Param('interviewId') interviewId: string) {
    return this.questionsService.findAllForInterview(req.user.orgId, interviewId, req.user.sub, req.user.role);
  }

  @Patch(':candidateId')
  update(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: UpdateQuestionSetDto,
  ) {
    return this.questionsService.update(req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role, dto);
  }

@Get('review-link')
async verifyQuestionsReviewLink(
  @Query('token') token: string,
  @Query('interviewId') interviewId: string,
  @Query('interviewerId') interviewerId: string,
  @Query('candidateId') candidateId: string,
  @Query('expires') expires: string,
) {
  await this.interviewsService.verifyInterviewerMagicLink(interviewId, interviewerId, token, expires);
  return this.questionsService.findOneUnscoped(interviewId, candidateId); // fix — unscoped method use karo
}
}