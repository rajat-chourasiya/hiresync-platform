import { Injectable, Logger } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import {
  asStdin, isTestCase, normalizeOutput, normalizeTestCase, toStoredCase,
} from '../../common/helpers/test-case-utils';

const REFERENCE_LANGUAGES = ['python', 'javascript'];

@Injectable()
export class ProblemVerifierService {
  private logger = new Logger(ProblemVerifierService.name);

  constructor(private codeExecution: CodeExecutionService) {}

  // Reference solution Piston me chala ke AI ke expected_output ko asli output se verify karta hai
  async verify(problem: any) {
    const examples = (problem?.example_test_cases ?? []).map(normalizeTestCase).filter(isTestCase);
    const hidden = (problem?.hidden_test_cases ?? []).map(normalizeTestCase).filter(isTestCase);
    const withCases = (verification: Record<string, unknown>, ex = examples, hd = hidden) => ({
      ...problem,
      example_test_cases: ex.map(toStoredCase),
      hidden_test_cases: hd.map(toStoredCase),
      verification,
    });

    const all = [...examples, ...hidden];
    if (all.length === 0) {
      return withCases({ status: 'unverified', reason: 'AI did not return usable test cases' });
    }

    const ref = problem?.reference_solution;
    const hasRef = ref && typeof ref.language === 'string' && typeof ref.code === 'string' && ref.code.trim();
    if (!hasRef) return withCases({ status: 'unverified', reason: 'AI did not return a reference solution' });
    if (!REFERENCE_LANGUAGES.includes(ref.language)) {
      return withCases({ status: 'unverified', reason: `Reference solution language "${ref.language}" is not supported` });
    }

    const flags: boolean[] = [];
    try {
      for (const tc of all) {
        const run = await this.codeExecution.run(ref.language, '*', ref.code, asStdin(tc.input));
        flags.push(run.outcome === 'success' && normalizeOutput(run.stdout) === normalizeOutput(tc.expected));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`Reference solution could not be executed: ${detail}`);
      return withCases({
        status: 'unverified',
        reason: `Reference solution could not be executed: ${detail}`.slice(0, 300),
      });
    }

    const keptExamples = examples.filter((_, i) => flags[i]);
    const keptHidden = hidden.filter((_, i) => flags[examples.length + i]);
    const kept = keptExamples.length + keptHidden.length;
    const dropped = all.length - kept;
    const status = kept === 0 ? 'failed' : dropped > 0 ? 'partially_verified' : 'verified';

    return withCases({ status, kept, dropped }, keptExamples, keptHidden);
  }
}