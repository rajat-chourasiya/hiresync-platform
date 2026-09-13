import { Module } from '@nestjs/common';
import { InterviewChatController } from './interview-chat.controller';

@Module({ controllers: [InterviewChatController] })
export class InterviewChatModule {}