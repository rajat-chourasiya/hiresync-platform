import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { tenantPlugin } from './tenant.plugin';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('DATABASE_NAME'),
        connectionFactory: (connection) => {
  connection.plugin(tenantPlugin);
  return connection;
},
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}