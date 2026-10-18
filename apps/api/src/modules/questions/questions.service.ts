import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Interview } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { ProblemVerifierService } from '../code-execution/problem-verifier.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { buildQuestionGenPrompt } from './prompts/question-generator.prompt';
import { inferDifficulty } from './constants/difficulty';
import { canAccessInterviewerChannel } from '../../common/helpers/interview-access';

const FAILED = 'generation_failed';
const isP2002 = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';


export class PermanentGenerationError extends BadRequestException {}

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private verifier: ProblemVerifierService,
  ) {}

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
    if (existing && existing.status !== FAILED) {
      throw new BadRequestException('Question set already exists for this candidate, use edit instead');
    }
    if (existing) await this.prisma.aiGeneratedQuestionSet.delete({ where: { id: existing.id } }); // failed row hata ke dobara

    return this.createSet(interview, candidateId, dto.roundType, {
      durationMinutes: dto.durationMinutes,
      numQuestions: dto.numQuestions,
    });
  }

 
  async autoGenerate(interviewId: string, candidateId: string, roundType: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.status === 'cancelled') {
      throw new PermanentGenerationError('Interview not found or already cancelled');
    }
    if (!interview.candidateIds.includes(candidateId)) {
      throw new PermanentGenerationError('Candidate is not part of this interview');
    }

    const existing = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (existing && existing.status !== FAILED) return existing; // already hai, kuch nahi karna
    if (existing) await this.prisma.aiGeneratedQuestionSet.delete({ where: { id: existing.id } });

    return this.createSet(interview, candidateId, roundType, {});
  }

  async markFailed(interviewId: string, candidateId: string, roundType: string, reason: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) return;

    const existing = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (existing && existing.status !== FAILED) return; // achha set kabhi overwrite nahi karte

    const note = `Automatic generation failed: ${reason}`.slice(0, 500);
    await this.prisma.aiGeneratedQuestionSet.upsert({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      create: {
        orgId: interview.orgId, jobId: interview.jobId, interviewId, candidateId,
        roundType, status: FAILED, questions: [], interviewerNote: note,
      },
      update: { status: FAILED, interviewerNote: note },
    });
  }

  private async createSet(
    interview: Interview,
    candidateId: string,
    roundType: string,
    opts: { durationMinutes?: number; numQuestions?: number },
  ) {
    const analysis = await this.prisma.aiResumeAnalysis.findFirst({
      where: { jobId: interview.jobId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) {
      throw new PermanentGenerationError('No resume analysis found for this candidate, cannot generate questions');
    }

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job) throw new PermanentGenerationError('Job not found');

    const difficulty = inferDifficulty(analysis.candidateLevel);
    const prompt = buildQuestionGenPrompt(
      analysis.fullAnalysis,
      { title: job.title, skills: job.skills, description: job.description },
      { roundType, difficulty, durationMinutes: opts.durationMinutes, numQuestions: opts.numQuestions },
    );

    const raw = await this.gemini.generate(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      throw new BadRequestException('AI returned invalid JSON, please try again'); // retry hoga
    }

    let problems: any[] = Array.isArray(parsed.questions_or_problems) ? parsed.questions_or_problems : [];
    if (roundType === 'coding') {
      const verified: any[] = [];
      for (const problem of problems) verified.push(await this.verifier.verify(problem));
      problems = verified;
    }

    try {
      return await this.prisma.aiGeneratedQuestionSet.create({
        data: {
          orgId: interview.orgId, jobId: interview.jobId, interviewId: interview.id, candidateId,
          roundType, difficulty, status: 'draft',
          questions: problems as any,
          interviewerNote: parsed.interviewer_note ?? null,
        },
      });
    } catch (err) {
      if (!isP2002(err)) throw err; 
      const existing = await this.prisma.aiGeneratedQuestionSet.findUnique({
        where: { interviewId_candidateId: { interviewId: interview.id, candidateId } },
      });
      if (!existing) throw err;
      return existing;
    }
  }

  async findOne(orgId: string, interviewId: string, candidateId: string, userId: string, role: string) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');
    return set;
  }


  async findOneUnscoped(interviewId: string, candidateId: string) {
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
    if (set.status === FAILED) {
      throw new BadRequestException('Generation failed for this set, regenerate it first');
    }

    return this.prisma.aiGeneratedQuestionSet.update({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      data: {
        ...(dto.questions !== undefined ? { questions: dto.questions as any } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }
}