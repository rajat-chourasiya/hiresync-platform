import { Module } from '@nestjs/common';

import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [VideoModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}