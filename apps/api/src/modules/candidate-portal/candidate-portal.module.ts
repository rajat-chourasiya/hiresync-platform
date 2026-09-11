import { Module } from '@nestjs/common';
import { CandidatePortalController } from './candidate-portal.controller';

@Module({
  controllers: [CandidatePortalController],
})
export class CandidatePortalModule {}