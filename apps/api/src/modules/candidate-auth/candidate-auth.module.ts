import { Module } from '@nestjs/common';
import { CandidateAuthController } from './candidate-auth.controller';
import { CandidateAuthService } from './candidate-auth.service';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [OtpModule],
  controllers: [CandidateAuthController],
  providers: [CandidateAuthService],
})
export class CandidateAuthModule {}