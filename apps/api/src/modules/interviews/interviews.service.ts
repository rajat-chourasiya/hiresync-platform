import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import * as crypto from 'crypto';

@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService) {}

  async schedule(orgId: string, dto: ScheduleInterviewDto) {
    const application = await this.prisma.application.findFirst({
      where: { id: dto.applicationId, orgId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);

    if (start <= new Date()) {
      throw new BadRequestException('Interview cannot be scheduled in the past');
    }
    
    if (end <= start) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }

    // Conflict check — same interviewer already booked in overlapping time
    const conflicts = await this.prisma.interview.findMany({
      where: {
        orgId,
        interviewerIds: { hasSome: dto.interviewerIds },
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
    });
    if (conflicts.length > 0) {
      throw new ConflictException('One or more interviewers have a scheduling conflict');
    }

    const roomId = crypto.randomBytes(8).toString('hex');

    const interview = await this.prisma.interview.create({
      data: {
        orgId,
        jobId: application.jobId,
        candidateId: application.candidateId,
        interviewerIds: dto.interviewerIds,
        scheduledStart: start,
        scheduledEnd: end,
        roomId,
        status: 'scheduled',
      },
    });

    await this.prisma.application.update({
      where: { id: application.id },
      data: { status: 'interview_scheduled' },
    });

    return interview;
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