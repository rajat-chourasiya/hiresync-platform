import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ResendProvider } from './resend/resend.provider';

@Module({
  controllers: [EmailController],
  providers: [ResendProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}