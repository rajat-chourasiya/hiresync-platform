import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantExtension } from './tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
  for (let i = 0; i < 3; i++) {
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL (Prisma) Connected');
      return;
    } catch (err) {
      this.logger.warn(`DB connect attempt ${i + 1} failed, retrying...`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  throw new Error('Failed to connect to database after retries');
}

  async onModuleDestroy() {
    await this.$disconnect();
  }

  withTenant() {
    return this.$extends(tenantExtension);
  }
}
