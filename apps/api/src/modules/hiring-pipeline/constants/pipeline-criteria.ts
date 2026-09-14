export interface Criterion { key: string; label: string; weight: number; }

export const STAGE1_INTERVIEWER_CRITERIA: Criterion[] = [
  { key: 'technicalKnowledge', label: 'Technical Knowledge', weight: 25 },
  { key: 'problemSolving', label: 'Problem Solving & Approach', weight: 30 },
  { key: 'codingExecution', label: 'Coding/Practical Execution', weight: 25 },
  { key: 'communication', label: 'Communication', weight: 10 },
  { key: 'requirementUnderstanding', label: 'Requirement Understanding', weight: 10 },
];

export const STAGE2_RECRUITER_CRITERIA: Criterion[] = [
  { key: 'jobRequirementMatch', label: 'Job Requirement Match', weight: 25 },
  { key: 'experienceDepth', label: 'Relevant Experience Depth', weight: 20 },
  { key: 'teamRoleFit', label: 'Team/Role Fit', weight: 15 },
  { key: 'communication', label: 'Communication', weight: 15 },
  { key: 'professionalBehavior', label: 'Professional Behavior', weight: 15 },
  { key: 'careerMotivation', label: 'Career Motivation', weight: 10 },
];

export function getStage3ManagerCriteria(isLeadershipRole: boolean): Criterion[] {
  return isLeadershipRole
    ? [
        { key: 'overallRoleFit', label: 'Overall Role Fit', weight: 30 },
        { key: 'ownershipInitiative', label: 'Ownership & Initiative', weight: 25 },
        { key: 'growthPotential', label: 'Growth Potential', weight: 20 },
        { key: 'leadershipInfluence', label: 'Leadership/Influence', weight: 15 },
        { key: 'riskConcerns', label: 'Risk/Concerns', weight: 10 },
      ]
    : [
        { key: 'overallRoleFit', label: 'Overall Role Fit', weight: 30 },
        { key: 'ownershipInitiative', label: 'Ownership & Initiative', weight: 40 }, // 25 + redistributed 15
        { key: 'growthPotential', label: 'Growth Potential', weight: 20 },
        { key: 'riskConcerns', label: 'Risk/Concerns', weight: 10 },
      ];
}

export const RECOMMENDATIONS = ['strong_hire', 'hire', 'hold', 'no_hire', 'strong_no_hire'];

export function computeWeightedScore(criteria: { key: string; score: number }[], definitions: Criterion[]): number {
  const weightMap = new Map(definitions.map((d) => [d.key, d.weight]));
  const total = criteria.reduce((sum, c) => sum + c.score * ((weightMap.get(c.key) ?? 0) / 100), 0);
  return Math.round(total * 100) / 100;
}

export function mapTier(score: number): string {
  if (score >= 4.5) return 'strong_hire';
  if (score >= 3.5) return 'hire';
  if (score >= 2.5) return 'hold';
  if (score >= 1.5) return 'no_hire';
  return 'strong_no_hire';
}