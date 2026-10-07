import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackSummaryService } from './feedback-summary.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackSummaryService],
})
export class FeedbackModule {}