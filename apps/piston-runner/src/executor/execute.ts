import axios from 'axios';
import { PISTON_API_URL, ALLOWED_LANGUAGES } from '../sandbox-config/languages';
import { TIMEOUT_MS } from '../security/limits';

export async function executeCode(language: string, version: string, code: string) {
  if (!ALLOWED_LANGUAGES.includes(language)) {
    throw new Error('Language not allowed');
  }
  const res = await axios.post(
    `${PISTON_API_URL}/api/v2/execute`,
    { language, version, files: [{ content: code }] },
    { timeout: TIMEOUT_MS },
  );
  return res.data;
}