import { Provider } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const GEMINI = 'GEMINI';

export const GeminiProvider: Provider = {
  provide: GEMINI,
  useFactory: () =>
    new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string),
};
