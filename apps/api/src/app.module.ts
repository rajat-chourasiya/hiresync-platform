import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core/constants';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { OtpModule } from './modules/otp/otp.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { UsersModule } from './modules/users/users.module';
import { CandidatePortalModule } from './modules/candidate-portal/candidate-portal.module';
import { CandidateAuthModule } from './modules/candidate-auth/candidate-auth.module';
import { CodeExecutionModule } from './modules/code-execution/code-execution.module';
import { InterviewChatModule } from './modules/interview-chat/interview-chat.module';
import { GatewayModule } from './gateway/gateway.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { HiringPipelineModule } from './modules/hiring-pipeline/hiring-pipeline.module';
import './modules/queue/ai-analysis.worker';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    JobsModule,
    ApplicationsModule,
    OtpModule,
    InterviewsModule,
    UsersModule,
    CandidatePortalModule,
    CandidateAuthModule,
    CodeExecutionModule,
    InterviewChatModule,
    GatewayModule,
    HiringPipelineModule,
    FeedbackModule,
    BillingModule,
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL) * 1000,
      limit: Number(process.env.THROTTLE_LIMIT),
    }]),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard },],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
