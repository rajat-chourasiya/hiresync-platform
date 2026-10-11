import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService, private emailService: EmailService) {}

  async send(email: string, purpose: string) {
    const recentOtp = await this.prisma.otpVerification.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });


    if (recentOtp?.lockedUntil && recentOtp.lockedUntil > new Date()) {
      throw new BadRequestException('Too many attempts. Try again later.');
    }
    if (recentOtp && Date.now() - recentOtp.createdAt.getTime() < 60_000) {
      throw new BadRequestException('Please wait before requesting another OTP');
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

   
    await this.prisma.otpVerification.deleteMany({ where: { email, purpose } });
    await this.prisma.otpVerification.create({
      data: {
        email,
        purpose,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.emailService.sendEmail(
      email,
      'Your HireSync OTP',
      `<p>Your OTP is <b>${otp}</b>. Valid for 10 minutes.</p>`,
    );
    return { expiresIn: 600 };
  }

 
  async verify(email: string, purpose: string, otp: string, consume = true) {
    const record = await this.prisma.otpVerification.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new BadRequestException('No OTP requested');

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      throw new BadRequestException('Too many attempts. Try again later.');
    }
    if (record.expiresAt < new Date()) throw new BadRequestException('OTP expired');

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      const attempts = record.attempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts, lockedUntil },
      });
      throw new BadRequestException('Invalid OTP');
    }

    if (consume) {
      await this.prisma.otpVerification.deleteMany({ where: { email, purpose } });
    }
    return { verified: true };
  }
}