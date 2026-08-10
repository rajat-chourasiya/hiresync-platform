import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CodeExecutionService {
  async run(language: string, version: string, code: string) {
    try {
      const res = await axios.post(`${process.env.PISTON_RUNNER_URL}/run`, {
        language, version, code,
      });
      return res.data;
    } catch (err) {
      throw new BadRequestException('Code execution failed');
    }
  }
}