import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';
import { REDIS } from '../cache/redis.provider';
import { v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from '../storage/cloudinary/cloudinary.provider';
import { VideoService } from '../video/video.service';
import { GEMINI } from '../ai/providers/gemini.provider';
import { GROQ } from '../ai/providers/groq.provider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import Razorpay from 'razorpay';
import { RAZORPAY } from '../billing/razorpay/razorpay.provider';
import { EmailService } from '../email/email.service';

interface HealthResponse {
  status: 'ok' | 'ERROR';
  message?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(REDIS)
    private readonly redis: Redis,

    @Inject(CLOUDINARY)
    private readonly cloudinary: typeof CloudinaryType,

    private readonly videoService: VideoService,

    @Inject(GEMINI)
    private readonly gemini: GoogleGenerativeAI,

    @Inject(GROQ)
    private readonly groqClient: Groq,

    @Inject(RAZORPAY)
    private readonly razorpay: Razorpay,

  ) {}

  @Get()
  async checkHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
    };
  }

  @Get('database')
  async checkDatabase(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

@Get('email')
async checkEmail(): Promise<HealthResponse> {
  try {
    await this.emailService.verifyConnection();

    return {
      status: 'ok',
    };
  } catch (err) {
    return {
      status: 'ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

  @Get('cloudinary')
  async checkCloudinary(): Promise<HealthResponse> {
    try {
      await this.cloudinary.api.ping();

      return {
        status: 'ok',
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('redis')
  async checkRedis(): Promise<HealthResponse> {
    try {
      const pong = await this.redis.ping();

      return {
        status: pong === 'PONG' ? 'ok' : 'ERROR',
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('stream')
  checkStream(): HealthResponse & { token?: string } {
    try {
      const token = this.videoService.generateUserToken('health-check-user');

      return {
        status: 'ok',
        token,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('gemini')
  async checkGemini(): Promise<HealthResponse & { response?: string }> {
    try {
      const model = this.gemini.getGenerativeModel({
        model: process.env.GEMINI_MODEL as string,
      });

      const result = await model.generateContent('Say "connected" only');

      return {
        status: 'ok',
        response: result.response.text(),
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('groq')
  async checkGroq(): Promise<HealthResponse & { response?: string }> {
    try {
      const result = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say "connected" only',
          },
        ],
      });

      return {
        status: 'ok',
        response: result.choices[0]?.message?.content ?? '',
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  @Get('razorpay')
  async checkRazorpay(): Promise<
    HealthResponse & { ordersFetched?: number }
  > {
    try {
      const orders = await this.razorpay.orders.all({
        count: 1,
      });

      return {
        status: 'ok',
        ordersFetched: orders.items.length,
      };
    } catch (err) {
      return {
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}