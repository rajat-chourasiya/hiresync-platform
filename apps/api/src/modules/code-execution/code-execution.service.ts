import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CodeExecutionService {
  async run(language: string, version: string, code: string) {

    const timeout = (Number(process.env.PISTON_TIMEOUT_MS) || 10000) + 2000;

    let data: any;
    try {
      const res = await axios.post(`${process.env.PISTON_URL}/run`, { language, version, code }, { timeout });
      data = res.data;
    } catch (err) {
      throw this.toHttpException(err);
    }

    return { ...data, ...this.classify(data) };
  }

  private toHttpException(err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        return new GatewayTimeoutException('Code execution timed out');
      }
      if (err.response) {
        const message = err.response.data?.error ?? err.response.data?.message ?? 'Code execution failed';
        if (err.response.status === 400) return new BadRequestException(message);
        if (err.response.status === 504) return new GatewayTimeoutException(message);
        if (err.response.status === 503) return new ServiceUnavailableException(message);
        return new BadGatewayException(message);
      }
      return new ServiceUnavailableException('Code execution service is unavailable. Please try again shortly.');
    }
    return new BadGatewayException('Unexpected error while running code');
  }


  private classify(result: any): { outcome: string; errorMessage: string | null } {
    const compile = result?.compile;
    const run = result?.run;

    if (compile && compile.code != null && compile.code !== 0) {
      return { outcome: 'compile_error', errorMessage: String(compile.stderr || compile.output || 'Compilation failed').trim() };
    }
    if (!run) return { outcome: 'unknown', errorMessage: 'No execution result returned' };

    if (run.status === 'TO') return { outcome: 'timeout', errorMessage: 'Time limit exceeded' };
    if (run.status === 'OL' || run.status === 'EL') return { outcome: 'output_limit', errorMessage: 'Output is too large' };
    if (run.signal === 'SIGKILL') {
      return { outcome: 'killed', errorMessage: 'Process was killed (most likely it exceeded the memory limit)' };
    }
    if (run.signal) return { outcome: 'signal', errorMessage: `Process terminated by ${run.signal}` };
    if (run.code != null && run.code !== 0) {
      return { outcome: 'runtime_error', errorMessage: String(run.stderr || run.output || 'Runtime error').trim() };
    }
    return { outcome: 'success', errorMessage: null };
  }
}