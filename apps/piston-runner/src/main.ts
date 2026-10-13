import express from 'express';
import { executeCode, RunnerError } from './executor/execute';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/run', async (req, res) => {
  const { language, version, code, stdin } = req.body ?? {};
  if (typeof language !== 'string' || typeof version !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'language, version and code are required strings' });
  }
  if (stdin !== undefined && typeof stdin !== 'string') {
    return res.status(400).json({ error: 'stdin must be a string' });
  }

  try {
    res.json(await executeCode(language, version, code, stdin ?? ''));
  } catch (err) {
    if (err instanceof RunnerError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Unexpected runner error' });
  }
});

app.listen(4000, () => console.log('🚀 Piston-runner on http://localhost:4000'));