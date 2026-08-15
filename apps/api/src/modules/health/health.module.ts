import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

import { DatabaseModule } from '../../database/database.module';
import { BillingModule } from '../billing/billing.module';
import { AiModule } from '../ai/ai.module';
import { VideoModule } from '../video/video.module';
import { StorageModule } from '../storage/storage.module';
import { RedisModule } from '../cache/redis.module';
import { EmailModule } from '../email/email.module';


@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    StorageModule,
    VideoModule,
    AiModule,
    BillingModule,
    EmailModule
  ],
  controllers: [HealthController],
})
export class HealthModule {}