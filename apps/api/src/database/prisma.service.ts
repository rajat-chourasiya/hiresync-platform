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
    await this.$connect();
    this.logger.log('✅ PostgreSQL (Prisma) Connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  withTenant() {
    return this.$extends(tenantExtension);
  }
}
