import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { v2 as CloudinaryType, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary/cloudinary.provider';

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

@Injectable()
export class StorageService {
  constructor(@Inject(CLOUDINARY) private cloudinary: typeof CloudinaryType) {}

  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: 'hiresync-uploads',
          resource_type: 'auto', // auto-detects image/video/raw(pdf)
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}