import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from './modules/storage/cloudinary/cloudinary.provider';
import Redis from 'ioredis';
import { REDIS } from './modules/cache/redis.provider';
import { VideoService } from './modules/video/video.service';
import { GEMINI } from './modules/ai/providers/gemini.provider';
import { GROQ } from './modules/ai/providers/groq.provider';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
    private readonly videoService: VideoService,
    @Inject(GEMINI) private readonly gemini: any,
    @Inject(GROQ) private readonly groqClient: any,
    @Inject('RAZORPAY') private readonly razorpay: any
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'OK', database: 'Connected' };
    } catch (err) {
      return { status: 'ERROR', database: 'Disconnected' };
    }
  }

  @Get('health/cloudinary')
  async checkCloudinary() {
    try {
      const result = await this.cloudinary.api.ping();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { status: 'ERROR', message };
    }
  }

  @Get('health/redis')
async checkRedis() {
  const pong = await this.redis.ping();
  return { status: pong === 'PONG' ? 'ok' : 'error' };
}

@Get('health/stream')
checkStream() {
  const token = this.videoService.generateUserToken('test-user-123');
  return { status: 'ok', token };
}

@Get('health/gemini')
async checkGemini() {
  try {
    const model = this.gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL as string,
    });
    const result = await model.generateContent('Say "connected" only');
    return { status: 'ok', response: result.response.text() };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'ERROR', message };
  }
}

@Get('health/groq')
async checkGroq() {
  try {
    const result = await this.groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say "connected" only' }],
    });
    return { status: 'ok', response: result.choices[0].message.content };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'ERROR', message };
  }
}

@Get('health/razorpay')
async checkRazorpay() {
  try {
    const orders = await this.razorpay.orders.all({ count: 1 });
    return { status: 'ok', ordersFetched: orders.items.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'ERROR', message };
  }
}
}