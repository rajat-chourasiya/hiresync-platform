import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CandidateAuthGuard } from '../../common/guards/candidate-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@Controller('candidate')
@UseGuards(CandidateAuthGuard)
@ApiBearerAuth()
export class CandidatePortalController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.prisma.candidateProfile.findUnique({ where: { id: req.candidate.candidateId } });
  }

  @Get('applications')
  myApplications(@Req() req: any) {
    return this.prisma.application.findMany({
      where: { candidateId: req.candidate.candidateId, orgId: req.candidate.orgId },
      include: {
        job: { select: { title: true, slug: true } },
        aiResumeAnalysis: { select: { tier: true } }, 
      },
    });
  }
}