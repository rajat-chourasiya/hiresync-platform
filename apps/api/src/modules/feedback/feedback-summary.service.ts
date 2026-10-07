import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { buildFeedbackSummaryPrompt } from './prompts/feedback-summary.prompt';

@Injectable()
export class FeedbackSummaryService {
  constructor(private prisma: PrismaService, private gemini: GeminiService) {}

  async generate(orgId: string, interviewId: string, candidateId: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!interview.candidateIds.includes(candidateId)) {
      throw new BadRequestException('Candidate is not part of this interview');
    }

    const existing = await this.prisma.aiFeedbackSummary.findFirst({ where: { interviewId, candidateId } });
    if (existing) throw new BadRequestException('Summary already generated for this candidate');

    const feedbacks = await this.prisma.feedback.findMany({ where: { interviewId, candidateId } });
    if (feedbacks.length === 0) {
      throw new BadRequestException('No feedback submitted yet for this candidate');
    }

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    const candidate = await this.prisma.candidateProfile.findUnique({ where: { id: candidateId } });

    const prompt = buildFeedbackSummaryPrompt(
      feedbacks.map((f) => f.scores),
      job?.title ?? '',
      candidate?.name ?? '',
    );

    const raw = await this.gemini.generate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return this.prisma.aiFeedbackSummary.create({
      data: {
        orgId, interviewId, candidateId,
        summary: parsed.summary,
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        riskNotes: parsed.riskNotes ?? [],
        finalRecommendationDraft: parsed.finalRecommendationDraft ?? null,
      },
    });
  }

  async findOne(orgId: string, interviewId: string, candidateId: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');

    const summary = await this.prisma.aiFeedbackSummary.findFirst({ where: { interviewId, candidateId } });
    if (!summary) throw new NotFoundException('No summary found for this candidate');
    return summary;
  }
}