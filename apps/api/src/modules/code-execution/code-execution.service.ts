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
        `${process.env.PISTON_URL}/run`,
        {
          language,
          version,
          code,
        },
        { timeout: Number(process.env.PISTON_TIMEOUT_MS) || 10000 },
      );

      return response.data;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data ?? err.message)
        : err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Code execution failed: ${JSON.stringify(message)}`);
    }
  }
}
