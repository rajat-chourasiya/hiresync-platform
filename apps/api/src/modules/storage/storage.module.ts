import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { CloudinaryProvider } from './cloudinary/cloudinary.provider';

@Module({
  controllers: [StorageController],
  providers: [CloudinaryProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}