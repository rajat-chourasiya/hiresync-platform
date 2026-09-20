const LEVEL_DIFFICULTY: Record<string, string> = {
  FRESHER: 'Easy', L1: 'Easy-Medium', L2: 'Medium',
  L3: 'Medium', L4: 'Medium-Hard', L5: 'Hard', L6: 'Hard',
};

export function inferDifficulty(candidateLevel: string | null): string {
  return LEVEL_DIFFICULTY[candidateLevel ?? 'FRESHER'] ?? 'Medium';
}

export const VALID_ROUND_TYPES = [
  'coding', 'aptitude', 'english', 'technical_interview',
  'system_design', 'behavioral', 'hiring_manager_final',
];