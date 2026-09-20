import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { buildQuestionGenPrompt } from './prompts/question-generator.prompt';
import { inferDifficulty } from './constants/difficulty';
import { canAccessInterviewerChannel } from '../../common/helpers/interview-access';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService, private gemini: GeminiService) {}

  private async authorizeStaff(orgId: string, interviewId: string, userId: string, role: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');

    const allowed = canAccessInterviewerChannel({ id: userId, type: 'staff', role }, interview);
    if (!allowed) throw new ForbiddenException('Not authorized for this interview');

    return interview;
  }

  async generate(orgId: string, interviewId: string, candidateId: string, userId: string, role: string, dto: GenerateQuestionsDto) {
    const interview = await this.authorizeStaff(orgId, interviewId, userId, role);
    if (!interview.candidateIds.includes(candidateId)) {
      throw new BadRequestException('Candidate is not part of this interview');
    }

    const existing = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (existing) throw new BadRequestException('Question set already exists for this candidate — use edit instead');

    const analysis = await this.prisma.aiResumeAnalysis.findFirst({
      where: { jobId: interview.jobId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) throw new BadRequestException('No resume analysis found for this candidate — cannot generate questions');

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const difficulty = inferDifficulty(analysis.candidateLevel);
    const prompt = buildQuestionGenPrompt(
      analysis.fullAnalysis,
      { title: job.title, skills: job.skills, description: job.description },
      { roundType: dto.roundType, difficulty, durationMinutes: dto.durationMinutes, numQuestions: dto.numQuestions },
    );

    const raw = await this.gemini.generate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return this.prisma.aiGeneratedQuestionSet.create({
      data: {
        orgId, jobId: interview.jobId, interviewId, candidateId,
        roundType: dto.roundType, difficulty, status: 'draft',
        questions: parsed.questions_or_problems ?? [],
        interviewerNote: parsed.interviewer_note ?? null,
      },
    });
  }

  async findOne(orgId: string, interviewId: string, candidateId: string, userId: string, role: string) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');
    return set;
  }

  async findAllForInterview(orgId: string, interviewId: string, userId: string, role: string) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    return this.prisma.aiGeneratedQuestionSet.findMany({ where: { interviewId } });
  }

  async update(orgId: string, interviewId: string, candidateId: string, userId: string, role: string, dto: UpdateQuestionSetDto) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');

    return this.prisma.aiGeneratedQuestionSet.update({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      data: {
        ...(dto.questions !== undefined ? { questions: dto.questions as any } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }
}