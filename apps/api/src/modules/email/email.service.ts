import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { RESEND } from './resend/resend.provider';

@Injectable()
export class EmailService {
  constructor(@Inject(RESEND) private resend: Resend) {}

  async sendEmail(to: string, subject: string, html: string) {
  return this.resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject,
    html,
  });
  }
}