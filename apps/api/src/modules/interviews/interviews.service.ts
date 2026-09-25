import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleInterviewDto, VALID_TOOLS } from './dto/schedule-interview.dto';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class InterviewsService {
  constructor(private prisma: PrismaService, private emailService: EmailService) {}

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
    include: { candidate: true },
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
  if (start <= new Date()) throw new BadRequestException('Interview cannot be scheduled in the past');
  if (end <= start) throw new BadRequestException('scheduledEnd must be after scheduledStart');

  const conflicts = await this.prisma.interview.findMany({
    where: { orgId, interviewerIds: { hasSome: dto.interviewerIds }, scheduledStart: { lt: end }, scheduledEnd: { gt: start } },
  });
  if (conflicts.length > 0) throw new ConflictException('One or more interviewers have a scheduling conflict');

  const roomId = crypto.randomBytes(8).toString('hex');
  const candidateIds = applications.map((a) => a.candidateId);

  const job = await this.prisma.job.findUnique({ where: { id: applications[0].jobId } });
  if (!job) throw new NotFoundException('Job not found');

  const interview = await this.prisma.interview.create({
    data: {
      orgId, jobId: job.id, interviewType: dto.interviewType, candidateIds,
      interviewerIds: dto.interviewerIds, enabledTools: tools,
      scheduledStart: start, scheduledEnd: end, roomId, status: 'scheduled',
    },
  });

  await this.prisma.application.updateMany({
    where: { id: { in: dto.applicationIds } },
    data: { status: 'interview_scheduled' },
  });


  const uniqueApplications = Array.from(new Map(applications.map((a) => [a.candidateId, a])).values());
  for (const application of uniqueApplications) {
  const magicLink = await this.generateCandidateMagicLink(interview.id, application.candidateId);
  await this.emailService.sendCandidateInterviewInvite(
    application.candidate.email, application.candidate.name, job.title, start, magicLink,
  );
}


  const interviewers = await this.prisma.user.findMany({ where: { id: { in: dto.interviewerIds } } });
  for (const interviewer of interviewers) {
  const magicLink = await this.generateInterviewerMagicLink(interview.id, interviewer.id);
  const candidateNames = uniqueApplications.map((a) => a.candidate.name).join(', ');
  await this.emailService.sendInterviewerAssignment(
    interviewer.email, interviewer.name ?? interviewer.email, job.title, candidateNames, start, magicLink,
  );
}

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

  // interview join magic link generation

  async findOneUnscoped(id: string) {
  return this.prisma.interview.findUnique({ where: { id } });
}

  private hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

private signToken(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async generateCandidateMagicLink(interviewId: string, candidateId: string) {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = new Date(Date.now() + Number(process.env.INTERVIEW_TOKEN_EXPIRY_HOURS) * 60 * 60 * 1000);

  const payload = `${interviewId}:${candidateId}:${expiresAt.getTime()}`;
  const rawToken = this.signToken(payload, secret);
  const tokenHash = this.hashToken(rawToken);

  await this.prisma.interviewAccessToken.create({
    data: { interviewId, candidateId, tokenHash, expiresAt },
  });

  return `${process.env.APP_URL}/interview/join/candidate?token=${rawToken}&interviewId=${interviewId}&candidateId=${candidateId}&expires=${expiresAt.getTime()}`;
}

async verifyCandidateMagicLink(interviewId: string, candidateId: string, rawToken: string, expiresParam: string) {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = Number(expiresParam);

  const expectedPayload = `${interviewId}:${candidateId}:${expiresAt}`;
  const expectedToken = this.signToken(expectedPayload, secret);

  if (expectedToken !== rawToken) {
    throw new UnauthorizedException('Invalid interview link');
  }
  if (Date.now() > expiresAt) {
    throw new UnauthorizedException('Interview link has expired');
  }

  const tokenHash = this.hashToken(rawToken);
  const accessToken = await this.prisma.interviewAccessToken.findUnique({ where: { tokenHash } });

  if (!accessToken || accessToken.revokedAt) {
    throw new UnauthorizedException('Interview link is invalid or has been revoked');
  }

  return { interviewId, candidateId };
}

async generateInterviewerMagicLink(interviewId: string, interviewerId: string) {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr, candidate se kam

  const payload = `staff:${interviewId}:${interviewerId}:${expiresAt.getTime()}`;
  const rawToken = this.signToken(payload, secret);

  return `${process.env.APP_URL}/interview/join/staff?token=${rawToken}&interviewId=${interviewId}&interviewerId=${interviewerId}&expires=${expiresAt.getTime()}`;
}

async verifyInterviewerMagicLink(interviewId: string, interviewerId: string, rawToken: string, expiresParam: string) {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = Number(expiresParam);

  const expectedPayload = `staff:${interviewId}:${interviewerId}:${expiresAt}`;
  const expectedToken = this.signToken(expectedPayload, secret);

  if (expectedToken !== rawToken) {
    throw new UnauthorizedException('Invalid interview link');
  }
  if (Date.now() > expiresAt) {
    throw new UnauthorizedException('Interview link has expired');
  }

  const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview || !interview.interviewerIds.includes(interviewerId)) {
    throw new UnauthorizedException('Interviewer is not assigned to this interview');
  }

  return { interviewId, interviewerId };
}
  
}