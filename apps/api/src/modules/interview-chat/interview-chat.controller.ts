import { Controller, Get, Param, Query, UseGuards, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InterviewViewerGuard } from '../../common/guards/interview-viewer.guard';
import { PrismaService } from '../../database/prisma.service';
import { canAccessCandidateChannel, canAccessInterviewerChannel } from '../../common/helpers/interview-access';

@Controller('interviews/:interviewId/chat')
@UseGuards(InterviewViewerGuard)
@ApiBearerAuth()
export class InterviewChatController {
  constructor(private prisma: PrismaService) {}

  @Get(':channel')
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async history(
    @Req() req: any,
    @Param('interviewId') interviewId: string,
    @Param('channel') channel: 'candidate' | 'interviewer',
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '20',
  ) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId: req.viewer.orgId } });
    if (!interview) throw new NotFoundException('Interview not found');

    const allowed = channel === 'candidate'
      ? canAccessCandidateChannel(req.viewer, interview)
      : canAccessInterviewerChannel(req.viewer, interview);
    if (!allowed) throw new ForbiddenException('Not authorized for this channel');

    return this.prisma.chatMessage.findMany({
      where: { roomId: interviewId, channel: channel === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER' },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }
}