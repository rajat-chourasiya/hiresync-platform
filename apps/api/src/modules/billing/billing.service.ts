import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { v2 as CloudinaryType } from 'cloudinary';
import { RAZORPAY } from './razorpay/razorpay.provider';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { getPlanAmount } from './constants/plans';
import { CLOUDINARY } from '../storage/cloudinary/cloudinary.provider';
import { EmailService } from '../email/email.service';
import { generateInvoicePdfBuffer } from './invoice/invoice-generator';

@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  constructor(
    @Inject(RAZORPAY) private razorpay: Razorpay,
    @Inject(CLOUDINARY) private cloudinary: typeof CloudinaryType,
    private prisma: PrismaService,
    private emailService: EmailService,
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

    this.generateAndUploadReceipt(orgId, dto.orderId, dto.paymentId, payment.planId, Number(payment.amount)).catch((err) => {
      this.logger.error(`Receipt generation failed for order ${dto.orderId}: ${err.message}`);
    });

    return { success: true, subscriptionId: orgId };
  }

  private async generateAndUploadReceipt(
    orgId: string, orderId: string, paymentId: string, planId: string, amount: number,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return;

    const pdfBuffer = await generateInvoicePdfBuffer({
      orgName: org.name, planId, amount, currency: 'INR', orderId, paymentId, paidAt: new Date(),
    });

    let uploadedUrl: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await new Promise<any>((resolve, reject) => {
          const stream = this.cloudinary.uploader.upload_stream(
            { folder: `receipts/${orgId}`, resource_type: 'raw', public_id: `receipt-${orderId}`, format: 'pdf' },
            (error, result) => (error ? reject(error) : resolve(result)),
          );
          stream.end(pdfBuffer);
        });
        uploadedUrl = result.secure_url;
        break;
      } catch (err) {
        this.logger.warn(`Receipt upload attempt ${attempt} failed for order ${orderId}`);
        if (attempt === 3) throw err;
      }
    }

    if (uploadedUrl) {
      await this.prisma.payment.update({ where: { orderId }, data: { pdfUrl: uploadedUrl } });

      const admin = await this.prisma.user.findFirst({ where: { orgId, role: 'org_admin' } });
      if (admin) {
        await this.emailService.sendPaymentReceipt(admin.email, org.name, planId, amount, uploadedUrl);
      }
    }
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