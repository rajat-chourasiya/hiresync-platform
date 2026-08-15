import { Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { GeminiService } from './providers/gemini.service';

@Module({
  providers: [GeminiProvider, GeminiService, GroqProvider],
  exports: [GeminiProvider, GeminiService, GroqProvider],
})
export class AiModule {}
