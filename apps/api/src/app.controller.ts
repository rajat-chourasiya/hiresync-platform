import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from './modules/storage/cloudinary/cloudinary.provider';
import Redis from 'ioredis/built/Redis';
import { REDIS } from './modules/cache/redis.provider';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
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
}