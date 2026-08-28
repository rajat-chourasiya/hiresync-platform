import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { memoryStorage } from 'multer';
import { IsString } from 'class-validator';

class SignUploadDto {
  @IsString()
  orgId!: string;

  @IsString()
  candidateEmail!: string;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

   @Post('sign-resume-upload')
  signResumeUpload(@Body() dto: SignUploadDto) {
    return this.storageService.generateSignedParams(dto.orgId, dto.candidateEmail);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const result = await this.storageService.uploadFile(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  }
}
