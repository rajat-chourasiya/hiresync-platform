import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';
import axios from 'axios';

export interface ExecutionSummary {
  outcome: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  cpuTimeMs: number | null;
  wallTimeMs: number | null;
  memoryBytes: number | null;
  errorMessage: string | null;
}

const MEMORY_ERROR_PATTERN = /MemoryError|OutOfMemoryError|std::bad_alloc|Cannot allocate memory|heap out of memory/i;

@Injectable()
export class CodeExecutionService {
  async run(language: string, version: string, code: string, stdin?: string): Promise<ExecutionSummary> {
    const timeout = (Number(process.env.PISTON_TIMEOUT_MS) || 10000) + 2000;

    let data: any;
    try {
      const res = await axios.post(`${process.env.PISTON_URL}/run`, { language, version, code, stdin }, { timeout });
      data = res.data;
    } catch (err) {
      throw this.toHttpException(err);
    }

    return this.summarize(data);
  }

  private toHttpException(err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') return new GatewayTimeoutException('Code execution timed out');
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

  // Piston ka raw result -> clean "execution" object
  private summarize(result: any): ExecutionSummary {
    const compile = result?.compile;
    const run = result?.run;
    const compileFailed = compile && compile.code != null && compile.code !== 0;
    const stage = compileFailed ? compile : run;
    const { outcome, errorMessage } = this.classify(compileFailed, compile, run);

    return {
      outcome,
      stdout: stage?.stdout ?? '',
      stderr: stage?.stderr ?? '',
      exitCode: stage?.code ?? null,
      cpuTimeMs: stage?.cpu_time ?? null,
      wallTimeMs: stage?.wall_time ?? null,
      memoryBytes: stage?.memory ?? null,
      errorMessage,
    };
  }

  private classify(compileFailed: boolean, compile: any, run: any): { outcome: string; errorMessage: string | null } {
    const limitBytes = (Number(process.env.PISTON_MAX_MEMORY_MB) || 256) * 1024 * 1024;

    if (compileFailed) {
      return { outcome: 'compile_error', errorMessage: String(compile.stderr || compile.output || 'Compilation failed').trim() };
    }
    if (!run) return { outcome: 'unknown', errorMessage: 'No execution result returned' };

    if (run.status === 'TO') return { outcome: 'timeout', errorMessage: 'Time limit exceeded' };
    if (run.status === 'OL' || run.status === 'EL') return { outcome: 'output_limit', errorMessage: 'Output is too large' };

    const text = `${run.stderr ?? ''} ${run.output ?? ''}`;
    const hitMemory =
      MEMORY_ERROR_PATTERN.test(text) || (run.signal === 'SIGKILL' && (run.memory ?? 0) >= limitBytes * 0.9);
    if (hitMemory) {
      return { outcome: 'memory_limit_exceeded', errorMessage: `Memory limit exceeded (${Math.round(limitBytes / 1048576)} MB)` };
    }

    if (run.signal === 'SIGKILL') {
      return { outcome: 'killed', errorMessage: 'Process was killed (most likely a resource limit)' };
    }
    if (run.signal) return { outcome: 'signal', errorMessage: `Process terminated by ${run.signal}` };
    if (run.code != null && run.code !== 0) {
      return { outcome: 'runtime_error', errorMessage: String(run.stderr || run.output || 'Runtime error').trim() };
    }
    return { outcome: 'success', errorMessage: null };
  }
}