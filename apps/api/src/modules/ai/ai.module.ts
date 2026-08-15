import { Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';

@Module({
  providers: [GeminiProvider, GroqProvider],
  exports: [GeminiProvider, GroqProvider],
})
export class AiModule {}
