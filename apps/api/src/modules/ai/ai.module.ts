import { Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { GeminiService } from './providers/gemini.service';
import { AiService } from './ai.service';

@Module({
  providers: [GeminiProvider, GeminiService, GroqProvider, AiService],
  exports: [GeminiProvider, GeminiService, GroqProvider, AiService],
})
export class AiModule {}
