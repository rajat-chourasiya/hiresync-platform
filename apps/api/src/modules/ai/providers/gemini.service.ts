import { Inject, Injectable, Logger } from '@nestjs/common';

import { GoogleGenerativeAI } from '@google/generative-ai';

import { GEMINI } from './gemini.provider';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  private readonly models = [
    process.env.GEMINI_MODEL_PRIMARY,
    process.env.GEMINI_MODEL_SECONDARY,
    process.env.GEMINI_MODEL_TERTIARY,
  ].filter((model): model is string => Boolean(model));

  constructor(
    @Inject(GEMINI)
    private readonly gemini: GoogleGenerativeAI,
  ) {}

  async generate(prompt: string): Promise<string> {
    let lastError: unknown;

    for (const modelName of this.models) {
      try {
        this.logger.log(`Trying Gemini model: ${modelName}`);

        const model = this.gemini.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent(prompt);

        const response = result.response.text();

        if (!response) {
          throw new Error(`${modelName} returned empty response`);
        }

        this.logger.log(`Gemini success: ${modelName}`);

        return response;
      } catch (error) {
        lastError = error;

        const message =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.warn(`Gemini failed: ${modelName}`);

        this.logger.warn(message);

        if (!this.isRetryable(error)) {
          throw error;
        }
      }
    }

    throw new Error(
      `All Gemini models failed. Last error: ${
        lastError instanceof Error ? lastError.message : 'Unknown error'
      }`,
    );
  }

  private isRetryable(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    return (
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('high demand')
    );
  }
}
