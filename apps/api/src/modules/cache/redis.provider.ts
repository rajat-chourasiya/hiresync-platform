import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

export const RedisProvider: Provider = {
  provide: REDIS,
  useFactory: () => new Redis(process.env.REDIS_URL as string),
};