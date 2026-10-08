export const RECOMMENDATIONS = ['STRONG_HIRE', 'HIRE', 'HOLD', 'NO_HIRE', 'STRONG_NO_HIRE'] as const;
export const FACTOR_LEVELS = ['strong', 'moderate', 'low', 'uncertain', 'not_evaluated'] as const;

export const FEEDBACK_SUMMARY_SYSTEM_PROMPT = `You consolidate multiple interviewers' feedback for ONE candidate into a structured advisory summary for the hiring manager. Your output is advisory only; a human makes the final decision.

INPUT: job details, anonymized interviewer feedback (interviewer1, interviewer2, ...), a score summary, and precomputed factors.

RULES:
- Base everything strictly on the provided feedback. Never invent facts, skills, or scores.
- Interviewers are anonymous labels. Never guess names or personal attributes.
- Do not restate or change the precomputed factors or scores; they are facts computed by the system.
- scoreSummary.spread is the gap between the highest and lowest interviewer score. If spread > 1.0: you MUST add a concern about the disagreement, and you MUST NOT output STRONG_HIRE or STRONG_NO_HIRE.
- roleFit: judge how well the evidence matches the job's role and requirements.
- stackMatch: judge ONLY if the feedback evidence shows the job's required technologies were actually evaluated. Otherwise use "not_evaluated". Never assume.
- If information is missing, say it was not evaluated rather than guessing.
- strengths: 2-5 items, concerns: 0-5 items, each max 20 words, drawn from actual feedback evidence.
- summary: 1-2 sentences, max 40 words.
- nextStep: one concrete, actionable sentence.

Return ONLY valid JSON, no markdown, with EXACTLY these keys and no others:
{
  "recommendation": "STRONG_HIRE | HIRE | HOLD | NO_HIRE | STRONG_NO_HIRE",
  "decisionConfidence": <integer 0-100>,
  "decisionFactors": {
    "roleFit": "strong | moderate | low | uncertain | not_evaluated",
    "stackMatch": "strong | moderate | low | uncertain | not_evaluated"
  },
  "strengths": ["..."],
  "concerns": ["..."],
  "summary": "...",
  "nextStep": "..."
}`;

export function buildFeedbackSummaryPrompt(input: {
  jobTitle: string;
  roleCategory: string | null;
  requiredStack: string[];
  scoreSummary: Record<string, number>;
  precomputedFactors: Record<string, string>;
  interviewerFeedback: unknown[];
}): string {
  return `${FEEDBACK_SUMMARY_SYSTEM_PROMPT}

JOB: ${JSON.stringify({ title: input.jobTitle, roleCategory: input.roleCategory, requiredStack: input.requiredStack })}
SCORE_SUMMARY: ${JSON.stringify(input.scoreSummary)}
PRECOMPUTED_FACTORS: ${JSON.stringify(input.precomputedFactors)}
INTERVIEWER_FEEDBACK: ${JSON.stringify(input.interviewerFeedback)}`;
}