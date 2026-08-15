import { Injectable } from '@nestjs/common';

export type AiTask =
  | 'INTERVIEW_QUESTION'
  | 'CODE_ANALYSIS'
  | 'RESUME_ANALYSIS'
  | 'FEEDBACK'
  | 'GENERAL';

@Injectable()
export class ModelRouterService {
  getGeminiModels(task: AiTask): string[] {
    switch (task) {
      case 'CODE_ANALYSIS':
        return [
          process.env.GEMINI_MODEL_PRIMARY!,
          process.env.GEMINI_MODEL_SECONDARY!,
          process.env.GEMINI_MODEL_TERTIARY!,
        ];

      case 'RESUME_ANALYSIS':
        return [
          process.env.GEMINI_MODEL_PRIMARY!,
          process.env.GEMINI_MODEL_TERTIARY!,
          process.env.GEMINI_MODEL_SECONDARY!,
        ];

      default:
        return [
          process.env.GEMINI_MODEL_PRIMARY!,
          process.env.GEMINI_MODEL_SECONDARY!,
          process.env.GEMINI_MODEL_TERTIARY!,
        ];
    }
  }
}
