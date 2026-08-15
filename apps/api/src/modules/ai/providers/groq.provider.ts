import { Provider } from '@nestjs/common';
import Groq from 'groq-sdk';

export const GROQ = 'GROQ';

export const GroqProvider: Provider = {
  provide: GROQ,
  useFactory: () => new Groq({ apiKey: process.env.GROQ_API_KEY }),
};
