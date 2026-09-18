import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { RAZORPAY } from './razorpay/razorpay.provider';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { getPlanAmount } from './constants/plans';

@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  constructor(
    @Inject(RAZORPAY) private razorpay: Razorpay,
    private prisma: PrismaService,
  ) {}

  async createOrder(orgId: string, dto: CreateOrderDto) {
    const amount = getPlanAmount(dto.planId, dto.billingCycle);

    const order = await this.razorpay.orders.create({
      amount: amount * 100, // paise me
      currency: 'INR',
      notes: { orgId, planId: dto.planId, billingCycle: dto.billingCycle },
    });

    await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        planId: dto.planId,
        orderId: order.id,
        amount,
        currency: 'INR',
        status: 'created',
      },
    });

    return { orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID };
  }

  async verifyPayment(orgId: string, dto: VerifyPaymentDto) {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${dto.orderId}|${dto.paymentId}`)
      .digest('hex');

    if (generatedSignature !== dto.signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findUnique({ where: { orderId: dto.orderId } });
    if (!payment || payment.organizationId !== orgId) {
      throw new BadRequestException('Payment record not found');
    }

    await this.prisma.payment.update({
      where: { orderId: dto.orderId },
      data: { paymentId: dto.paymentId, status: 'captured' },
    });

    const periodDays = 30; // simplification — monthly cycle assumed here
    await this.prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId: payment.planId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
      update: {
        planId: payment.planId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: 'active', planId: payment.planId },
    });

    return { success: true, subscriptionId: orgId };
  }

  async handleWebhook(rawBody: string, signature: string) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id ?? `${event.event}-${Date.now()}`;

    // Idempotency check
    const existing = await this.prisma.payment.findFirst({ where: { webhookEventId: eventId } });
    if (existing) {
      this.logger.log(`Webhook ${eventId} already processed — skipping`);
      return { status: 'ok' };
    }

    if (event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: { webhookEventId: eventId, status: 'captured' },
        });
      }
    }

    return { status: 'ok' };
  }
}