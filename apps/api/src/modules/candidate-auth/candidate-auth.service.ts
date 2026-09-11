import { Injectable, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { OtpService } from '../otp/otp.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CandidateAuthService {
  constructor(private otpService: OtpService, private prisma: PrismaService) {}

  async requestLogin(orgId: string, email: string) {
  const candidate = await this.prisma.candidateProfile.findFirst({
    where: {
      orgId,
      email,
    },
  });

  if (!candidate) {
    throw new NotFoundException(
      'No profile found for this email in this organization',
    );
  }

  return this.otpService.send(email, 'candidate_login');
}

  async verifyLogin(orgId: string, email: string, otp: string) {
    await this.otpService.verify(email, 'candidate_login', otp);

    const candidate = await this.prisma.candidateProfile.findFirst({ where: { orgId, email } });
    if (!candidate) {
      throw new NotFoundException('No profile found for this email in this organization');
    }

    const candidateToken = jwt.sign(
      { candidateId: candidate.id, orgId, type: 'candidate' },
      process.env.CANDIDATE_SESSION_SECRET as string,
      { expiresIn: '30m' },
    );

    return { candidateToken, candidate };
  }
}