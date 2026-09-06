import { Module } from '@nestjs/common';

import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}