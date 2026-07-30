import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  defaultModel: process.env.AI_DEFAULT_MODEL ?? 'gemini-2.5-flash',
  maxTokensPerRequest: parseInt(process.env.AI_MAX_TOKENS ?? '4096', 10),
}));
