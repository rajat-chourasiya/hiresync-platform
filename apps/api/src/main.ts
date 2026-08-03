import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getConnectionToken } from '@nestjs/mongoose/dist/common/mongoose.utils';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(5000);

  const connection = app.get<Connection>(getConnectionToken());

  if (connection.readyState === 1) {
  console.log('🚀 Backend Running');
  console.log('🌐 http://localhost:5000');
  console.log('📘 Swagger: http://localhost:5000/docs');

}
}

bootstrap();  