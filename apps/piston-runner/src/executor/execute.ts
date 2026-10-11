import axios from 'axios';
import { PISTON_API_URL, ALLOWED_LANGUAGES } from '../sandbox-config/languages';
import { TIMEOUT_MS } from '../security/limits';

export class RunnerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function executeCode(language: string, version: string, code: string) {
  if (!ALLOWED_LANGUAGES.includes(language)) {
    throw new RunnerError(400, `Language "${language}" is not allowed. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`);
  }

  try {
    const res = await axios.post(
      `${PISTON_API_URL}/api/v2/execute`,
      { language, version, files: [{ content: code }] },
      { timeout: TIMEOUT_MS },
    );
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        throw new RunnerError(504, 'Execution timed out');
      }
      if (err.response) {
        const upstream = err.response.data?.message ?? JSON.stringify(err.response.data);
        throw new RunnerError(err.response.status === 400 ? 400 : 502, `Piston rejected the request: ${upstream}`);
      }
      throw new RunnerError(
        503,
        'Piston engine is unreachable or crashed (it may have exceeded its memory limit). It restarts automatically, retry in a few seconds.',
      );
    }
    throw err;
  }
}