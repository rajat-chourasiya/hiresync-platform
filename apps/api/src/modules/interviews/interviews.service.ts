import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleInterviewDto, VALID_TOOLS } from './dto/schedule-interview.dto';
import * as crypto from 'crypto';

@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService) {}

  async schedule(orgId: string, dto: ScheduleInterviewDto) {
  if (dto.interviewType === 'single_candidate' && dto.applicationIds.length !== 1) {
    throw new BadRequestException('single_candidate interviews must have exactly one candidate');
  }
  if (dto.interviewType === 'group_discussion' && dto.applicationIds.length < 2) {
    throw new BadRequestException('group_discussion requires at least 2 candidates');
  }

  const tools = dto.enabledTools?.length ? dto.enabledTools : ['chat', 'video'];
  const invalidTools = tools.filter((t) => !VALID_TOOLS.includes(t));
  if (invalidTools.length > 0) {
    throw new BadRequestException(`Invalid tools: ${invalidTools.join(', ')}`);
  }

  const applications = await this.prisma.application.findMany({
    where: { id: { in: dto.applicationIds }, orgId },
  });
  if (applications.length !== dto.applicationIds.length) {
    throw new NotFoundException('One or more applications not found');
  }

  const notShortlisted = applications.filter((a) => a.status !== 'shortlisted');
  if (notShortlisted.length > 0) {
    throw new BadRequestException(
      `Cannot schedule interview: candidates must be shortlisted first (found status: ${notShortlisted.map((a) => a.status).join(', ')})`,
    );
  }

  const start = new Date(dto.scheduledStart);
  const end = new Date(dto.scheduledEnd);

  if (start <= new Date()) {
    throw new BadRequestException('Interview cannot be scheduled in the past');
  }
  if (end <= start) {
    throw new BadRequestException('scheduledEnd must be after scheduledStart');
  }

  const conflicts = await this.prisma.interview.findMany({
    where: {
      orgId,
      interviewerIds: { hasSome: dto.interviewerIds },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
    },
  });
  if (conflicts.length > 0) throw new ConflictException('One or more interviewers have a scheduling conflict');

  const roomId = crypto.randomBytes(8).toString('hex');
  const candidateIds = applications.map((a) => a.candidateId);

  const interview = await this.prisma.interview.create({
    data: {
      orgId,
      jobId: applications[0].jobId,
      interviewType: dto.interviewType,
      candidateIds,
      interviewerIds: dto.interviewerIds,
      enabledTools: tools,
      scheduledStart: start,
      scheduledEnd: end,
      roomId,
      status: 'scheduled',
    },
  });

  await this.prisma.application.updateMany({
    where: { id: { in: dto.applicationIds } },
    data: { status: 'interview_scheduled' },
  });

  return interview;
}

  async updateTools(orgId: string, interviewId: string, tools: string[]) {
  const invalidTools = tools.filter((t) => !VALID_TOOLS.includes(t));
  if (invalidTools.length > 0) throw new BadRequestException(`Invalid tools: ${invalidTools.join(', ')}`);

  const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
  if (!interview) throw new NotFoundException('Interview not found');

  return this.prisma.interview.update({ where: { id: interviewId }, data: { enabledTools: tools } });
}


  async findAll(orgId: string, userId: string, role: string) {
  if (role === 'interviewer') {
    return this.prisma.interview.findMany({
      where: { orgId, interviewerIds: { has: userId } },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  return this.prisma.interview.findMany({ where: { orgId }, orderBy: { scheduledStart: 'asc' } });
}

  async findOne(orgId: string, id: string) {
    return this.prisma.interview.findFirst({ where: { id, orgId } });
  }
}