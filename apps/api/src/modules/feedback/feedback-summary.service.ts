import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { buildFeedbackSummaryPrompt } from './prompts/feedback-summary.prompt';
import {
  buildInterviewerView,
  computeInterviewerScores,
  computeFactors,
  buildDecisionFactors,
  confidenceFromScore,
  validateAiOutput,
  serializeFeedbackSummary,
} from './feedback-summary.helpers';

@Injectable()
export class FeedbackSummaryService {
  constructor(private prisma: PrismaService, private gemini: GeminiService) {}

  async generate(orgId: string, interviewId: string, candidateId: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!interview.candidateIds.includes(candidateId)) {
      throw new BadRequestException('Candidate is not part of this interview');
    }

    const existing = await this.prisma.aiFeedbackSummary.findFirst({ where: { orgId, interviewId, candidateId } });
    if (existing) throw new BadRequestException('Summary already generated for this candidate');

    const feedbacks = await this.prisma.feedback.findMany({
      where: { interviewId, candidateId },
      orderBy: { submittedAt: 'asc' },
    });
    if (feedbacks.length === 0) throw new BadRequestException('No feedback submitted yet for this candidate');

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const view = buildInterviewerView(feedbacks);
    const { interviewerScores, spread } = computeInterviewerScores(view);
    const factors = computeFactors(view);

    const prompt = buildFeedbackSummaryPrompt({
      jobTitle: job.title,
      roleCategory: job.roleCategory,
      requiredStack: [...job.skills, ...job.requiredTechStack],
      scoreSummary: { ...interviewerScores, spread },
      precomputedFactors: factors,
      interviewerFeedback: view, // view me koi user ID hai hi nahi
    });

    const raw = await this.gemini.generate(prompt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      throw new BadRequestException('AI returned invalid JSON, please try again');
    }
    const ai = validateAiOutput(parsed);

    // Panel me bada disagreement ho to confidence ko HIGH tak jaane nahi dete
    const decisionConfidence = spread > 1.0 ? Math.min(ai.decisionConfidence, 84) : ai.decisionConfidence;
    const confidence = confidenceFromScore(decisionConfidence);

    const analysis = {
      summary: ai.summary,
      strengths: ai.strengths,
      concerns: ai.concerns,
      decisionFactors: buildDecisionFactors(factors, ai.decisionFactors),
      interviewerScores,
      nextStep: ai.nextStep,
    };

    const created = await this.prisma.aiFeedbackSummary.create({
      data: {
        orgId,
        interviewId,
        candidateId,
        recommendation: ai.recommendation,
        confidence,
        decisionConfidence,
        averageScore: interviewerScores.average,
        analysis: analysis as any,
      },
    });

    return serializeFeedbackSummary(created);
  }

  async findOne(orgId: string, interviewId: string, candidateId: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');

    const summary = await this.prisma.aiFeedbackSummary.findFirst({
      where: { orgId, interviewId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
    if (!summary) throw new NotFoundException('No summary found for this candidate');

    return serializeFeedbackSummary(summary);
  }
}