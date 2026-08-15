import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(5000);

  const prisma = app.get(PrismaService);
  await prisma.$queryRaw`SELECT 1`; // real round-trip check

  console.log('🚀 Backend Running');
  console.log('🌐 http://localhost:5000');
  console.log('📘 Swagger: http://localhost:5000/docs');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
