import { BadRequestException } from '@nestjs/common';
import type { AiFeedbackSummary } from '@prisma/client';
import { RECOMMENDATIONS, FACTOR_LEVELS } from './prompts/feedback-summary.prompt';

const round1 = (n: number) => Math.round(n * 10) / 10;


export const FACTOR_LABELS: Record<string, string> = {
  strong: 'Strong',
  moderate: 'Average',
  low: 'Weak',
  uncertain: 'Unclear',
  not_evaluated: 'Not tested',
};
export const labelFactor = (level: string) => FACTOR_LABELS[level] ?? 'Unclear';

export function buildInterviewerView(feedbacks: any[]) {
  return feedbacks.map((f, i) => ({
    key: `interviewer${i + 1}`, // submission order ka anonymous label
    weightedScore: Number(f.scores?.weightedScore ?? 0),
    recommendation: (f.recommendation ?? null) as string | null,
    criteria: (f.scores?.criteria ?? []) as { key: string; score: number; evidence: string }[],
    strengths: f.scores?.strengths ?? null,
    weaknesses: f.scores?.weaknesses ?? null,
    behavioralNotes: f.scores?.behavioralNotes ?? null,
  }));
}

export function computeInterviewerScores(view: ReturnType<typeof buildInterviewerView>) {
  const scores: Record<string, number> = {};
  view.forEach((v) => (scores[v.key] = round1(v.weightedScore)));
  const values = view.map((v) => v.weightedScore);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return { interviewerScores: { ...scores, average: round1(average) }, spread: round1(spread) };
}

const FACTOR_TO_CRITERION: Record<string, string> = {
  technicalFit: 'technicalKnowledge',
  problemSolving: 'problemSolving',
  communication: 'communication',
  codingAbility: 'codingExecution',
};

function levelFromScores(scores: number[]): string {
  if (scores.length === 0) return 'not_evaluated';
  if (Math.max(...scores) - Math.min(...scores) >= 1.5) return 'uncertain';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return avg >= 4 ? 'strong' : avg >= 3 ? 'moderate' : 'low';
}


export function computeFactors(view: ReturnType<typeof buildInterviewerView>) {
  const out: Record<string, string> = {};
  for (const [factor, criterionKey] of Object.entries(FACTOR_TO_CRITERION)) {
    const scores = view
      .map((v) => v.criteria.find((c) => c.key === criterionKey)?.score)
      .filter((s): s is number => typeof s === 'number');
    out[factor] = levelFromScores(scores);
  }
  return out;
}


export function buildDecisionFactors(
  computed: Record<string, string>,
  ai: { roleFit: string; stackMatch: string },
) {
  return {
    technicalFit: labelFactor(computed.technicalFit),
    roleFit: labelFactor(ai.roleFit),
    problemSolving: labelFactor(computed.problemSolving),
    communication: labelFactor(computed.communication),
    codingAbility: labelFactor(computed.codingAbility),
    stackMatch: labelFactor(ai.stackMatch),
  };
}

export function confidenceFromScore(decisionConfidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (decisionConfidence < 50) return 'LOW';
  if (decisionConfidence < 85) return 'MEDIUM';
  return 'HIGH';
}

const isStringArray = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.trim().length > 0);

export function validateAiOutput(data: any) {
  if (!data || typeof data !== 'object') throw new BadRequestException('AI output must be an object');
  if (!(RECOMMENDATIONS as readonly string[]).includes(data.recommendation)) {
    throw new BadRequestException('Invalid recommendation value from AI');
  }
  if (!Number.isInteger(data.decisionConfidence) || data.decisionConfidence < 0 || data.decisionConfidence > 100) {
    throw new BadRequestException('decisionConfidence must be an integer 0-100');
  }
  for (const k of ['roleFit', 'stackMatch']) {
    if (!(FACTOR_LEVELS as readonly string[]).includes(data.decisionFactors?.[k])) {
      throw new BadRequestException(`decisionFactors.${k} is invalid`);
    }
  }
  if (!isStringArray(data.strengths, 5) || data.strengths.length < 1) throw new BadRequestException('strengths invalid');
  if (!isStringArray(data.concerns, 5)) throw new BadRequestException('concerns invalid');
  if (typeof data.summary !== 'string' || !data.summary.trim()) throw new BadRequestException('summary invalid');
  if (typeof data.nextStep !== 'string' || !data.nextStep.trim()) throw new BadRequestException('nextStep invalid');
  return data as {
    recommendation: string;
    decisionConfidence: number;
    decisionFactors: { roleFit: string; stackMatch: string };
    strengths: string[];
    concerns: string[];
    summary: string;
    nextStep: string;
  };
}

export interface SerializedFeedbackSummary {
  id: string;
  orgId: string;
  interviewId: string;
  candidateId: string;
  recommendation: string | null;
  confidence: string | null;
  decisionConfidence: number | null;
  averageScore: number | null;
  interviewerScores: Record<string, number> | null;
  summary: string | null;
  strengths: string[];
  concerns: string[];
  decisionFactors: Record<string, string> | null;
  nextStep: string | null;
  createdAt: Date;
}

export function serializeFeedbackSummary(row: AiFeedbackSummary): SerializedFeedbackSummary {
  const a = (row.analysis ?? {}) as Record<string, any>;
  return {
    id: row.id,
    orgId: row.orgId,
    interviewId: row.interviewId,
    candidateId: row.candidateId,
    recommendation: row.recommendation,
    confidence: row.confidence,
    decisionConfidence: row.decisionConfidence,
    averageScore: row.averageScore != null ? Number(row.averageScore) : null,
    interviewerScores: a.interviewerScores ?? null,
    summary: a.summary ?? null,
    strengths: Array.isArray(a.strengths) ? a.strengths : [],
    concerns: Array.isArray(a.concerns) ? a.concerns : [],
    decisionFactors: a.decisionFactors ?? null,
    nextStep: a.nextStep ?? null,
    createdAt: row.createdAt,
  };
}