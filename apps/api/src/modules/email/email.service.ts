import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { RESEND } from './resend/resend.provider';

@Injectable()
export class EmailService {
  constructor(
    @Inject(RESEND)
    private readonly resend: Resend,
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ) {
    return this.resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to,
      subject,
      html,
    });
  }

  async verifyConnection(): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const response = await this.resend.domains.list();

    if (response.error) {
      throw new Error(response.error.message);
    }
  }
}