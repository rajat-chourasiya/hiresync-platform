import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { serializeFeedbackSummary } from '../feedback/feedback-summary.helpers';

type Cell = string | number | null;
type Row = {
  section: string;
  metric: string;
  label: string;
  values: Record<string, Cell>;
  differs: boolean;
};

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

@Injectable()
export class ComparisonService {
  constructor(private prisma: PrismaService) {}

  async compare(orgId: string, jobId: string, candidateIds: string[]) {
    if (new Set(candidateIds).size !== candidateIds.length) {
      throw new BadRequestException('candidateIds must be unique');
    }

    const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
    if (!job) throw new NotFoundException('Job not found');

    const applications = await this.prisma.application.findMany({
      where: { orgId, jobId, candidateId: { in: candidateIds } },
      include: { candidate: { select: { id: true, name: true } }, aiResumeAnalysis: true },
    });


    const found = new Set(applications.map((a) => a.candidateId));
    const missing = candidateIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`These candidates have no application for this job: ${missing.join(', ')}`);
    }

    const applicationIds = applications.map((a) => a.id);

    const [decisions, interviews] = await Promise.all([
      this.prisma.hiringDecision.findMany({ where: { applicationId: { in: applicationIds } } }),
      this.prisma.interview.findMany({
        where: { orgId, jobId, candidateIds: { hasSome: candidateIds } },
        select: { id: true },
      }),
    ]);

    const summaries = await this.prisma.aiFeedbackSummary.findMany({
      where: { orgId, candidateId: { in: candidateIds }, interviewId: { in: interviews.map((i) => i.id) } },
      orderBy: { createdAt: 'desc' },
    });

    const decisionByApp = new Map(decisions.map((d) => [d.applicationId, d]));
    const appByCandidate = new Map(applications.map((a) => [a.candidateId, a]));


    const latestSummary = new Map<string, (typeof summaries)[number]>();
    for (const s of summaries) {
      if (!latestSummary.has(s.candidateId)) latestSummary.set(s.candidateId, s);
    }

    const candidates = candidateIds.map((cid) => {
      const app = appByCandidate.get(cid)!;
      const ra = app.aiResumeAnalysis;
      const skillMatch = (ra?.fullAnalysis as any)?.skillMatch;
      const decision = decisionByApp.get(app.id);
      const summary = latestSummary.get(cid);

      return {
        candidateId: cid,
        name: app.candidate.name,
        application: { id: app.id, status: app.status },
        resumeAnalysis: ra
          ? {
              matchScore: num(ra.matchScore),
              tier: ra.tier,
              candidateLevel: ra.candidateLevel,
              relevantExperienceMonths: ra.relevantExperienceMonths,
              totalExperienceMonths: ra.totalExperienceMonths,
              matchedSkills: skillMatch?.matched ?? [],
              missingSkills: skillMatch?.missing ?? [],
            }
          : null,
        interviewFeedback: summary ? serializeFeedbackSummary(summary) : null,
        hiringDecision: decision
          ? {
              interviewScore: num(decision.interviewScore),
              recruiterScore: num(decision.recruiterScore),
              preManagerScore: num(decision.preManagerScore),
              gatePassed: decision.gatePassed,
              managerScore: num(decision.managerScore),
              finalScore: num(decision.finalScore),
              tier: decision.overriddenTier ?? decision.tier,
              status: decision.status,
            }
          : null,
      };
    });

    const row = (
      section: string,
      metric: string,
      label: string,
      pick: (c: (typeof candidates)[number]) => Cell | undefined,
    ): Row => {
      const values: Record<string, Cell> = {};
      candidates.forEach((c) => (values[c.candidateId] = pick(c) ?? null));
      const present = Object.values(values).filter((v) => v !== null);
      return { section, metric, label, values, differs: new Set(present).size > 1 };
    };

    const comparison: Row[] = [
      row('resume', 'matchScore', 'Resume match score', (c) => c.resumeAnalysis?.matchScore),
      row('resume', 'tier', 'Resume tier', (c) => c.resumeAnalysis?.tier),
      row('resume', 'candidateLevel', 'Candidate level', (c) => c.resumeAnalysis?.candidateLevel),
      row('resume', 'relevantExperienceMonths', 'Relevant experience (months)', (c) => c.resumeAnalysis?.relevantExperienceMonths),
      row('resume', 'totalExperienceMonths', 'Total experience (months)', (c) => c.resumeAnalysis?.totalExperienceMonths),

      row('interview', 'recommendation', 'Panel recommendation', (c) => c.interviewFeedback?.recommendation),
      row('interview', 'confidence', 'Confidence', (c) => c.interviewFeedback?.confidence),
      row('interview', 'decisionConfidence', 'Decision confidence', (c) => c.interviewFeedback?.decisionConfidence),
      row('interview', 'averageScore', 'Average interviewer score', (c) => c.interviewFeedback?.averageScore),
      row('interview', 'technicalFit', 'Technical fit', (c) => c.interviewFeedback?.decisionFactors?.technicalFit),
      row('interview', 'roleFit', 'Role fit', (c) => c.interviewFeedback?.decisionFactors?.roleFit),
      row('interview', 'problemSolving', 'Problem solving', (c) => c.interviewFeedback?.decisionFactors?.problemSolving),
      row('interview', 'communication', 'Communication', (c) => c.interviewFeedback?.decisionFactors?.communication),
      row('interview', 'codingAbility', 'Coding ability', (c) => c.interviewFeedback?.decisionFactors?.codingAbility),
      row('interview', 'stackMatch', 'Stack match', (c) => c.interviewFeedback?.decisionFactors?.stackMatch),

      row('hiring', 'interviewScore', 'Interview score', (c) => c.hiringDecision?.interviewScore),
      row('hiring', 'recruiterScore', 'Recruiter score', (c) => c.hiringDecision?.recruiterScore),
      row('hiring', 'preManagerScore', 'Pre-manager score', (c) => c.hiringDecision?.preManagerScore),
      row('hiring', 'managerScore', 'Manager score', (c) => c.hiringDecision?.managerScore),
      row('hiring', 'finalScore', 'Final score', (c) => c.hiringDecision?.finalScore),
      row('hiring', 'tier', 'Final tier', (c) => c.hiringDecision?.tier),
      row('hiring', 'status', 'Decision status', (c) => c.hiringDecision?.status),
    ];

    return { jobId, jobTitle: job.title, candidates, comparison };
  }
}