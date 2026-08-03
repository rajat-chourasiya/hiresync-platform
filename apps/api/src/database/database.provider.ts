// database.provider.ts

import { InjectConnection } from '@nestjs/mongoose';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseProvider implements OnModuleInit {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  onModuleInit() {
    const state = this.connection.readyState;

    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

   
    console.log(`🗄️ MongoDB: ${states[state]}`);

    if (state === 1) {
      console.log('✅ Database Connected');
    } else {
      console.log('❌ Database Not Connected');
    }

  }
}