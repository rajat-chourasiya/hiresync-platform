import express from 'express';
import { executeCode } from './executor/execute';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/run', async (req, res) => {
  try {
    const { language, version, code } = req.body;
    const result = await executeCode(language, version, code);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(4000, () => console.log('🚀 Piston-runner on http://localhost:4000'));