import { Controller, Get, Inject } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import Redis from 'ioredis';
import { REDIS } from '../cache/redis.provider';

import { v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from '../storage/cloudinary/cloudinary.provider';

import { VideoService } from '../video/video.service';

import { GROQ } from '../ai/providers/groq.provider';

import Groq from 'groq-sdk';

import Razorpay from 'razorpay';
import { RAZORPAY } from '../billing/razorpay/razorpay.provider';

import { EmailService } from '../email/email.service';
import { GeminiService } from '../ai/providers/gemini.service';

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

    private readonly geminiService: GeminiService,

    @Inject(GROQ)
    private readonly groqClient: Groq,

    @Inject(RAZORPAY)
    private readonly razorpay: Razorpay,
  ) {}

  // =========================
  // Basic Health
  // =========================

  @Get()
  checkHealth(): HealthResponse {
    return {
      status: 'ok',
    };
  }

  // =========================
  // PostgreSQL
  // =========================

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

  // =========================
  // Redis
  // =========================

  @Get('redis')
  async checkRedis(): Promise<HealthResponse> {
    try {
      const pong = await this.redis.ping();

      if (pong !== 'PONG') {
        throw new Error('Redis did not respond with PONG');
      }

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

  // =========================
  // Cloudinary
  // =========================

  @Get('cloudinary')
  async checkCloudinary(): Promise<HealthResponse> {
    try {
      const result = await this.cloudinary.api.ping();

      if (result?.status !== 'ok') {
        throw new Error('Cloudinary ping failed');
      }

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

  // =========================
  // Email / Resend
  // =========================

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

  // =========================
  // Stream
  // =========================

  @Get('stream')
  async checkStream(): Promise<HealthResponse> {
    try {
      await this.videoService.checkConnection();

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

  // =========================
  // Gemini
  // =========================

  @Get('gemini')
  async checkGemini(): Promise<HealthResponse> {
    try {
      await this.geminiService.generate('Say "connected" only');

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

  // =========================
  // Groq
  // =========================

  @Get('groq')
  async checkGroq(): Promise<HealthResponse> {
    try {
      const result = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say "connected" only',
          },
        ],
        max_tokens: 10,
      });

      const response = result.choices[0]?.message?.content;

      if (!response) {
        throw new Error('Groq returned an empty response');
      }

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

  // =========================
  // Razorpay
  // =========================

  @Get('razorpay')
  async checkRazorpay(): Promise<HealthResponse> {
    try {
      const orders = await this.razorpay.orders.all({
        count: 1,
      });

      if (!orders) {
        throw new Error('Razorpay API request failed');
      }

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
}
