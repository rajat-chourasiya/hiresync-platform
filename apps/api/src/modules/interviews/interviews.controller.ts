import { Controller, Post, Get, Body, Param, UseGuards, Req, NotFoundException, ForbiddenException, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CandidateAuthGuard } from '../../common/guards/candidate-auth.guard';
import { VideoService } from '../video/video.service';

@Controller('interviews')
export class InterviewsController {
  constructor(
    private interviewsService: InterviewsService,
    private videoService: VideoService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('interviews.schedule')
  @ApiBearerAuth()
  schedule(@Req() req: any, @Body() dto: ScheduleInterviewDto) {
    return this.interviewsService.schedule(req.user.orgId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  findAll(@Req() req: any) {
    return this.interviewsService.findAll(req.user.orgId, req.user.sub, req.user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.findOne(req.user.orgId, id);
  }

  // Staff join
  @Get(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async join(@Req() req: any, @Param('id') id: string) {
    const interview = await this.interviewsService.findOne(req.user.orgId, id);
    if (!interview) throw new NotFoundException('Interview not found');

    const isInterviewer = interview.interviewerIds.includes(req.user.sub);
    const isAdmin = req.user.role === 'org_admin';
    if (!isInterviewer && !isAdmin) {
      throw new ForbiddenException('You are not assigned to this interview');
    }

    const memberIds = Array.from(new Set([req.user.sub, ...interview.interviewerIds]));
    await this.videoService.createCall(interview.roomId, req.user.sub, memberIds);
    const token = this.videoService.generateUserToken(req.user.sub);

    return { roomId: interview.roomId, token, apiKey: process.env.STREAM_API_KEY };
  }

    // Candidate join
  @Get(':id/candidate-join')
  @UseGuards(CandidateAuthGuard)
  @ApiBearerAuth()

  async candidateJoin(@Req() req: any, @Param('id') id: string) {
    const interview = await this.interviewsService.findOne(req.candidate.orgId, id);
    if (!interview) throw new NotFoundException('Interview not found');

    if (!interview.candidateIds.includes(req.candidate.candidateId)) {
  throw new ForbiddenException('This is not your interview');
}

    const memberIds = Array.from(new Set([req.candidate.candidateId, ...interview.interviewerIds]));
    await this.videoService.createCall(interview.roomId, req.candidate.candidateId, memberIds);
    const token = this.videoService.generateUserToken(req.candidate.candidateId);
    return { roomId: interview.roomId, token, apiKey: process.env.STREAM_API_KEY };
  }

  @Patch(':id/tools')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('interviews.schedule')
  @ApiBearerAuth()
  updateTools(@Req() req: any, @Param('id') id: string, @Body('enabledTools') tools: string[]) {
    return this.interviewsService.updateTools(req.user.orgId, id, tools);
}

@Get('join/candidate')
async joinViaCandidateLink(
  @Query('token') token: string,
  @Query('interviewId') interviewId: string,
  @Query('candidateId') candidateId: string,
  @Query('expires') expires: string,
) {
  const { interviewId: verifiedInterviewId, candidateId: verifiedCandidateId } =
    await this.interviewsService.verifyCandidateMagicLink(interviewId, candidateId, token, expires);

  const interview = await this.interviewsService.findOneUnscoped(verifiedInterviewId); 
  if (!interview) throw new NotFoundException('Interview not found');

  const memberIds = Array.from(new Set([verifiedCandidateId, ...interview.interviewerIds]));
  await this.videoService.createCall(interview.roomId, verifiedCandidateId, memberIds);
  const streamToken = this.videoService.generateUserToken(verifiedCandidateId);

  return { roomId: interview.roomId, token: streamToken, apiKey: process.env.STREAM_API_KEY };
}

@Get('join/staff')
async joinViaInterviewerLink(
  @Query('token') token: string,
  @Query('interviewId') interviewId: string,
  @Query('interviewerId') interviewerId: string,
  @Query('expires') expires: string,
) {
  const { interviewId: verifiedInterviewId, interviewerId: verifiedInterviewerId } =
    await this.interviewsService.verifyInterviewerMagicLink(interviewId, interviewerId, token, expires);

  const interview = await this.interviewsService.findOneUnscoped(verifiedInterviewId); // fix
  if (!interview) throw new NotFoundException('Interview not found');

  const memberIds = Array.from(new Set([verifiedInterviewerId, ...interview.interviewerIds]));
  await this.videoService.createCall(interview.roomId, verifiedInterviewerId, memberIds);
  const streamToken = this.videoService.generateUserToken(verifiedInterviewerId);

  return { roomId: interview.roomId, token: streamToken, apiKey: process.env.STREAM_API_KEY };
}
}