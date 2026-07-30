import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10),
}));
