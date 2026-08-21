import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());


  const config = new DocumentBuilder()
    .setTitle('HireSync API')
    .setDescription('HireSync backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(5000);

  const prisma = app.get(PrismaService);
  await prisma.$queryRaw`SELECT 1`;

  console.log('🚀 Backend Running');
  console.log('🌐 http://localhost:5000');
  console.log('📘 Swagger: http://localhost:5000/docs');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});