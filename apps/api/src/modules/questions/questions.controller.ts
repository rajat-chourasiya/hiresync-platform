import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InterviewsService } from '../interviews/interviews.service';

@ApiTags('Questions')
@Controller('interviews/:interviewId/questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(
    private questionsService: QuestionsService,
    private interviewsService: InterviewsService,
  ) {}

  // ── Readiness check ────────────────────────────────────────────────────────
  // Frontend isko poll karke decide karta hai ki "Generate Questions" button
  // enable karna hai ya nahi.
  // Response: { analysisStatus, analysisReady, canGenerate, questionSet, ... }
  @ApiOperation({ summary: 'Check if question generation is possible for a candidate' })
  @Get(':candidateId/readiness')
  readiness(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.questionsService.getReadiness(
      req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role,
    );
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  // Body: { roundType, durationMinutes?, numQuestions?, reviewerType?, reviewerId? }
  // Analysis done hone ke baad hi allowed hai (service-level guard)
  @ApiOperation({ summary: 'Generate AI question set for a candidate' })
  @Post(':candidateId')
  generate(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.questionsService.generate(
      req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role, dto,
    );
  }

  // ── Approve (reviewer approves) ────────────────────────────────────────────
  // Sirf assigned reviewer hi call kar sakta hai
  // Sets status: 'approved' + reviewedAt timestamp
  @ApiOperation({ summary: 'Approve question set (reviewer only)' })
  @Post(':candidateId/approve')
  approve(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.questionsService.approve(
      req.user.orgId, interviewId, candidateId, req.user.sub,
    );
  }

  // ── Read all sets for interview ────────────────────────────────────────────
  @ApiOperation({ summary: 'List all question sets for an interview' })
  @Get()
  findAll(@Req() req: any, @Param('interviewId') interviewId: string) {
    return this.questionsService.findAllForInterview(
      req.user.orgId, interviewId, req.user.sub, req.user.role,
    );
  }

  // ── Read one set ───────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Get question set for a specific candidate' })
  @Get(':candidateId')
  findOne(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.questionsService.findOne(
      req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role,
    );
  }

  // ── Edit questions / status ────────────────────────────────────────────────
  // Reviewer can edit individual questions and change status (draft/approved)
  @ApiOperation({ summary: 'Edit question set (questions or status)' })
  @Patch(':candidateId')
  update(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: UpdateQuestionSetDto,
  ) {
    return this.questionsService.update(
      req.user.orgId, interviewId, candidateId, req.user.sub, req.user.role, dto,
    );
  }

  // ── Magic-link review (no JWT needed, token-verified) ─────────────────────
  @ApiOperation({ summary: 'Verify interviewer magic link and return question set' })
  @Get('review-link')
  async verifyQuestionsReviewLink(
    @Query('token') token: string,
    @Query('interviewId') interviewId: string,
    @Query('interviewerId') interviewerId: string,
    @Query('candidateId') candidateId: string,
    @Query('expires') expires: string,
  ) {
    await this.interviewsService.verifyInterviewerMagicLink(interviewId, interviewerId, token, expires);
    return this.questionsService.findOneUnscoped(interviewId, candidateId);
  }
}
