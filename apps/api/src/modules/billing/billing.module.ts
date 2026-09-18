import { Module } from '@nestjs/common';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController],
  providers: [RazorpayProvider, BillingService],
  exports: [RazorpayProvider],
})
export class BillingModule {}
