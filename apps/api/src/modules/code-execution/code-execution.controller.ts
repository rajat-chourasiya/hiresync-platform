import { Controller, Post, Body, Param, UseGuards, Req, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CodeExecutionService } from './code-execution.service';
import { RunCodeDto } from './dto/run-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CandidateAuthGuard } from '../../common/guards/candidate-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@Controller('interviews/:interviewId/run-code')
export class CodeExecutionController {
  constructor(
    private codeExecutionService: CodeExecutionService,
    private prisma: PrismaService,
  ) {}

  // Staff (interviewer) run
  @Post('staff')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async runAsStaff(@Req() req: any, @Param('interviewId') interviewId: string, @Body() dto: RunCodeDto) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId: req.user.orgId } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!interview.interviewerIds.includes(req.user.sub) && req.user.role !== 'org_admin') {
      throw new ForbiddenException('You are not assigned to this interview');
    }
    return this.codeExecutionService.run(dto.language, dto.version, dto.code);
  }

  // Candidate run
  @Post('candidate')
@UseGuards(CandidateAuthGuard)
@ApiBearerAuth()
async runAsCandidate(@Req() req: any, @Param('interviewId') interviewId: string, @Body() dto: RunCodeDto) {
  const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId: req.candidate.orgId } });
  if (!interview) throw new NotFoundException('Interview not found');

  if (!interview.enabledTools.includes('code_execution')) {
    throw new ForbiddenException('Code execution is not enabled for this interview');
  }
  if (!interview.candidateIds.includes(req.candidate.candidateId)) {
    throw new ForbiddenException('This is not your interview');
  }
  return this.codeExecutionService.run(dto.language, dto.version, dto.code);
}
}