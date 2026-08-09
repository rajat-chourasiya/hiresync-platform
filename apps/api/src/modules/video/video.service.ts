import { Inject, Injectable } from '@nestjs/common';
import { StreamClient } from '@stream-io/node-sdk';
import { STREAM_CLIENT } from './stream-provider/stream.provider';

@Injectable()
export class VideoService {
  constructor(@Inject(STREAM_CLIENT) private client: StreamClient) {}

  generateUserToken(userId: string) {
    return this.client.generateUserToken({ user_id: userId });
  }
}