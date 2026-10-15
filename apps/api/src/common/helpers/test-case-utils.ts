export type TestCase = { input: string; expected: string };

const toText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));


export function normalizeTestCase(tc: any): TestCase | null {
  if (!tc || typeof tc !== 'object') return null;
  const input = tc.input ?? tc.stdin;
  const expected = tc.expected_output ?? tc.expectedOutput ?? tc.output ?? tc.expected;
  if (input === undefined || expected === undefined) return null;
  return { input: toText(input), expected: toText(expected) };
}

export const isTestCase = (tc: TestCase | null): tc is TestCase => tc !== null;

export const toStoredCase = (tc: TestCase) => ({ input: tc.input, expected_output: tc.expected });

export const asStdin = (input: string) => (input.endsWith('\n') ? input : `${input}\n`);

export const normalizeOutput = (s: string) =>
  s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();

export const clip = (s: string, max = 200) => (s.length > max ? `${s.slice(0, max)}…` : s);