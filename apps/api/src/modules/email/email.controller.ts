import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('send')
  send(@Body() body: { to: string; subject: string; html: string }) {
    return this.emailService.sendEmail(body.to, body.subject, body.html);
  }
}
