import { Module } from '@nestjs/common';
import { StreamProvider } from './stream-provider/stream.provider';
import { VideoService } from './video.service';

@Module({
  providers: [StreamProvider, VideoService],
  exports: [StreamProvider, VideoService],
})
export class VideoModule {}
