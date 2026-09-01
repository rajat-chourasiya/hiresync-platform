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

  const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'auto'; 

  return new Promise((resolve, reject) => {
    const uploadStream = this.cloudinary.uploader.upload_stream(
      {
        folder: 'hiresync-uploads',
        resource_type: resourceType, 
      },
      (error, result) => {
        if (error) return reject(new Error(error.message || JSON.stringify(error)));
        resolve(result as UploadApiResponse);
      },
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
}


  generateSignedParams(orgId: string, candidateEmail: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `resumes/${orgId}/${candidateEmail.replace(/[^a-zA-Z0-9]/g, '_')}/${timestamp}`;

  const signature = this.cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET as string,
  );

  return {
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}
}
