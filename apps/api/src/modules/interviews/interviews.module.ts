import { Module } from '@nestjs/common';

import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { VideoModule } from '../video/video.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [VideoModule, EmailModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}