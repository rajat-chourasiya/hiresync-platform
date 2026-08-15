import { Inject, Injectable } from '@nestjs/common';

import { Resend } from 'resend';

import { RESEND } from './resend/resend.provider';

@Injectable()
export class EmailService {
  constructor(
    @Inject(RESEND)
    private readonly resend: Resend,
  ) {}

  async sendEmail(to: string, subject: string, html: string) {
    return this.resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to,
      subject,
      html,
    });
  }

  async verifyConnection(): Promise<void> {
    await this.resend.domains.list();
  }
}
