import { Inject, Injectable } from '@nestjs/common';
import { StreamClient } from '@stream-io/node-sdk';
import { STREAM_CLIENT } from './stream-provider/stream.provider';

@Injectable()
export class VideoService {
  constructor(
    @Inject(STREAM_CLIENT)
    private readonly client: StreamClient,
  ) {}

  generateUserToken(userId: string): string {
    return this.client.generateUserToken({
      user_id: userId,
    });
  }

  // Health check
  async checkConnection(): Promise<void> {
    await this.client.upsertUsers([
      {
        id: 'health-check-user',
        name: 'Health Check',
      },
    ]);
  }
}
