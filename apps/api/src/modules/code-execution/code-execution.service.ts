import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface PistonResponse {
  language?: string;
  version?: string;
  run?: {
    stdout?: string;
    stderr?: string;
    code?: number;
    signal?: string | null;
    output?: string;
  };
}

@Injectable()
export class CodeExecutionService {
  async run(
    language: string,
    version: string,
    code: string,
  ): Promise<PistonResponse> {
    try {
      const response = await axios.post<PistonResponse>(
        `${process.env.PISTON_RUNNER_URL}/run`,
        {
          language,
          version,
          code,
        },
      );

      return response.data;
    } catch {
      throw new BadRequestException('Code execution failed');
    }
  }
}