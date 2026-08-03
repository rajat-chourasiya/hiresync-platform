import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import * as path from 'path';
import { DatabaseProvider } from './database/database.provider';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: path.resolve(process.cwd(), '../../.env'),  
    }),
    DatabaseModule,     
    ],
  controllers: [AppController],
  providers: [AppService, DatabaseProvider],
})
export class AppModule {}
