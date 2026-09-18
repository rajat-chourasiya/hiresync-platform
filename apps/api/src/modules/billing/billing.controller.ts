import { Controller, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { RawBodyRequest } from '@nestjs/common';


@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.billingService.createOrder(req.user.orgId, dto);
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  verifyPayment(@Req() req: any, @Body() dto: VerifyPaymentDto) {
    return this.billingService.verifyPayment(req.user.orgId, dto);
  }

  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature: string) {
    return this.billingService.handleWebhook(req.rawBody!.toString(), signature);
  }
}