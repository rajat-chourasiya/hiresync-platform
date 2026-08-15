import { Module } from '@nestjs/common';
import { RazorpayProvider } from './razorpay/razorpay.provider';

@Module({
  providers: [RazorpayProvider],
  exports: [RazorpayProvider],
})
export class BillingModule {}
