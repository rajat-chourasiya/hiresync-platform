import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { buildQuestionGenPrompt } from './prompts/question-generator.prompt';
import { inferDifficulty } from './constants/difficulty';
import { canAccessInterviewerChannel } from '../../common/helpers/interview-access';
import {
  asStdin, isTestCase, normalizeOutput, normalizeTestCase, toStoredCase,
} from '../../common/helpers/test-case-utils';

const REFERENCE_LANGUAGES = ['python', 'javascript'];

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private codeExecution: CodeExecutionService,
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
    if (existing) throw new BadRequestException('Question set already exists for this candidate, use edit instead');

    const analysis = await this.prisma.aiResumeAnalysis.findFirst({
      where: { jobId: interview.jobId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) throw new BadRequestException('No resume analysis found for this candidate, cannot generate questions');

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const difficulty = inferDifficulty(analysis.candidateLevel);
    const prompt = buildQuestionGenPrompt(
      analysis.fullAnalysis,
      { title: job.title, skills: job.skills, description: job.description },
      { roundType: dto.roundType, difficulty, durationMinutes: dto.durationMinutes, numQuestions: dto.numQuestions },
    );

    const raw = await this.gemini.generate(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      throw new BadRequestException('AI returned invalid JSON, please try again');
    }

    let problems: any[] = Array.isArray(parsed.questions_or_problems) ? parsed.questions_or_problems : [];
    if (dto.roundType === 'coding') {
      const verified: any[] = [];
      for (const problem of problems) verified.push(await this.verifyProblem(problem));
      problems = verified;
    }

    return this.prisma.aiGeneratedQuestionSet.create({
      data: {
        orgId, jobId: interview.jobId, interviewId, candidateId,
        roundType: dto.roundType, difficulty, status: 'draft',
        questions: problems as any,
        interviewerNote: parsed.interviewer_note ?? null,
      },
    });
  }

  // Reference solution ko Piston me chala ke AI ke expected_output ko asli output se verify karta hai
  private async verifyProblem(problem: any) {
    const examples = (problem?.example_test_cases ?? []).map(normalizeTestCase).filter(isTestCase);
    const hidden = (problem?.hidden_test_cases ?? []).map(normalizeTestCase).filter(isTestCase);
    const withCases = (verification: Record<string, unknown>, ex = examples, hd = hidden) => ({
      ...problem,
      example_test_cases: ex.map(toStoredCase),
      hidden_test_cases: hd.map(toStoredCase),
      verification,
    });

    const all = [...examples, ...hidden];
    if (all.length === 0) {
      return withCases({ status: 'unverified', reason: 'AI did not return usable test cases' });
    }

    const ref = problem?.reference_solution;
    const hasRef = ref && typeof ref.language === 'string' && typeof ref.code === 'string' && ref.code.trim();
    if (!hasRef) {
      return withCases({ status: 'unverified', reason: 'AI did not return a reference solution' });
    }
    if (!REFERENCE_LANGUAGES.includes(ref.language)) {
      return withCases({ status: 'unverified', reason: `Reference solution language "${ref.language}" is not supported` });
    }

    const flags: boolean[] = [];
    try {
      for (const tc of all) {
        const run = await this.codeExecution.run(ref.language, '*', ref.code, asStdin(tc.input));
        flags.push(run.outcome === 'success' && normalizeOutput(run.stdout) === normalizeOutput(tc.expected));
      }
    } catch {
      return withCases({ status: 'unverified', reason: 'Reference solution could not be executed (execution service error)' });
    }

    const keptExamples = examples.filter((_: unknown, i: number) => flags[i]);
    const keptHidden = hidden.filter((_: unknown, i: number) => flags[examples.length + i]);
    const kept = keptExamples.length + keptHidden.length;
    const dropped = all.length - kept;
    const status = kept === 0 ? 'failed' : dropped > 0 ? 'partially_verified' : 'verified';

    return withCases({ status, kept, dropped }, keptExamples, keptHidden);
  }

  async findOne(orgId: string, interviewId: string, candidateId: string, userId: string, role: string) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');
    return set;
  }

  // Magic-link flow ke liye: link verify ho chuka hota hai, isliye orgId/JWT check nahi
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

    return this.prisma.aiGeneratedQuestionSet.update({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      data: {
        ...(dto.questions !== undefined ? { questions: dto.questions as any } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }
}