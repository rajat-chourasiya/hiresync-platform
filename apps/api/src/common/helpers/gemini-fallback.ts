import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '@nestjs/common';

const logger = new Logger('GeminiFallback');

const MODELS = [
  process.env.GEMINI_MODEL_PRIMARY,
  process.env.GEMINI_MODEL_SECONDARY,
  process.env.GEMINI_MODEL_TERTIARY,
].filter((m): m is string => Boolean(m));

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('503') || message.includes('500') || message.includes('502') ||
    message.includes('504') || message.includes('429') ||
    message.includes('quota') || message.includes('rate limit') || message.includes('overloaded') ||
    message.includes('unavailable')
  );
}

export async function generateWithFallback(gemini: GoogleGenerativeAI, promptParts: (string | { text: string } | { inlineData: { mimeType: string; data: string } })[]): Promise<string> {
  let lastError: unknown;

  for (const modelName of MODELS) {
    try {
      logger.log(`Trying model: ${modelName}`);
      const model = gemini.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptParts as any);
      const text = result.response.text();
      if (!text) throw new Error(`${modelName} returned empty response`);
      logger.log(`Success with model: ${modelName}`);
      return text;
    } catch (error) {
      lastError = error;
      logger.warn(`Model ${modelName} failed: ${error instanceof Error ? error.message : error}`);
      if (!isRetryable(error)) throw error;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown'}`);
}