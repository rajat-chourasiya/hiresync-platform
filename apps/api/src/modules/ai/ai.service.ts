import { Injectable } from '@nestjs/common';

import { GeminiService } from './providers/gemini.service';

@Injectable()
export class AiService {
  constructor(private readonly geminiService: GeminiService) {}

  async generate(prompt: string): Promise<string> {
    return this.geminiService.generate(prompt);
  }
}
