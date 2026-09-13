import { Module } from '@nestjs/common';
import { InterviewGateway } from './interview.gateway';

@Module({
  providers: [InterviewGateway],  
})
export class GatewayModule {}