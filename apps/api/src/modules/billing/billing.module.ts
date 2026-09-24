import { Module } from '@nestjs/common';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, EmailModule],
  controllers: [BillingController],
  providers: [RazorpayProvider, BillingService],
  exports: [RazorpayProvider],
})
export class BillingModule {}
