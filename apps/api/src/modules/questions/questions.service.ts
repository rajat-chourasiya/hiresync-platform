import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../ai/providers/gemini.service';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { EmailService } from '../email/email.service';
import { InterviewsService } from '../interviews/interviews.service';
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
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private codeExecution: CodeExecutionService,
    private emailService: EmailService,
    private interviewsService: InterviewsService,
  ) {}

  private async authorizeStaff(orgId: string, interviewId: string, userId: string, role: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');

    const allowed = canAccessInterviewerChannel({ id: userId, type: 'staff', role }, interview);
    if (!allowed) throw new ForbiddenException('Not authorized for this interview');

    return interview;
  }

  // ─── Readiness Check ───────────────────────────────────────────────────────
  // Frontend isko call karega taaki pata chale ki:
  //   1. Resume analysis complete hai ya nahi (canGenerate)
  //   2. Question set pehle se exist karta hai ya nahi
  //   3. Agar exist karta hai to uska current status kya hai
  async getReadiness(orgId: string, interviewId: string, candidateId: string, userId: string, role: string) {
    const interview = await this.authorizeStaff(orgId, interviewId, userId, role);

    // Resume analysis status check
    const analysis = await this.prisma.aiResumeAnalysis.findFirst({
      where: { jobId: interview.jobId, candidateId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, candidateLevel: true, tier: true, matchScore: true },
    });

    // Application ka aiAnalysisStatus bhi check karo (more reliable)
    const application = await this.prisma.application.findFirst({
      where: { jobId: interview.jobId, candidateId, orgId },
      select: { aiAnalysisStatus: true },
    });

    // Existing question set check
    const existingSet = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      select: {
        id: true, roundType: true, difficulty: true,
        status: true, reviewerId: true, reviewerType: true, reviewedAt: true,
      },
    });

    const analysisStatus = application?.aiAnalysisStatus ?? 'not_found';
    const canGenerate = analysisStatus === 'done' && !!analysis && !existingSet;

    return {
      roundType: interview.roundType,
      analysisStatus,              // 'queued' | 'processing' | 'done' | 'failed' | 'on_hold' | 'not_found'
      analysisReady: analysisStatus === 'done' && !!analysis,
      candidateLevel: analysis?.candidateLevel ?? null,
      tier: analysis?.tier ?? null,
      matchScore: analysis?.matchScore ? Number(analysis.matchScore) : null,
      canGenerate,                 // true sirf tab jab analysis done ho AND set exist na kare
      questionSet: existingSet ?? null,  // null agar abhi tak generate nahi kiya
    };
  }

  // ─── Generate ──────────────────────────────────────────────────────────────
  async generate(orgId: string, interviewId: string, candidateId: string, userId: string, role: string, dto: GenerateQuestionsDto) {
    const interview = await this.authorizeStaff(orgId, interviewId, userId, role);
    if (!interview.candidateIds.includes(candidateId)) {
      throw new BadRequestException('Candidate is not part of this interview');
    }

    // ── Reviewer validation ──────────────────────────────────────────────────
    // reviewerType = 'interviewer' hone pe reviewerId mandatory hai
    // aur wo interviewer is interview ka assigned member hona chahiye
    if (dto.reviewerType === 'interviewer') {
      if (!dto.reviewerId) {
        throw new BadRequestException('reviewerId is required when reviewerType is "interviewer"');
      }
      if (!interview.interviewerIds.includes(dto.reviewerId)) {
        throw new BadRequestException('reviewerId must be one of the interviewers assigned to this interview');
      }
    }
    // 'self' ke case mein reviewer recruiter khud hai
    const resolvedReviewerId = dto.reviewerType === 'interviewer' ? dto.reviewerId! : userId;
    const resolvedReviewerType = dto.reviewerType ?? null;

    // ── Guard: existing set ──────────────────────────────────────────────────
    const existing = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (existing) throw new BadRequestException('Question set already exists for this candidate, use edit instead');

    // ── Guard: analysis must be done ────────────────────────────────────────
    const analysis = await this.prisma.aiResumeAnalysis.findFirst({
      where: { jobId: interview.jobId, candidateId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) {
      throw new BadRequestException(
        'Resume analysis is not complete yet. Please wait for analysis to finish before generating questions.',
      );
    }

    const job = await this.prisma.job.findUnique({ where: { id: interview.jobId } });
    if (!job) throw new NotFoundException('Job not found');

    // ── AI generation ────────────────────────────────────────────────────────
    // Recruiter ko dubara roundType select na karna pade: interview.roundType se auto-pick
    const roundType = dto.roundType ?? interview.roundType ?? 'technical_interview';
    const difficulty = inferDifficulty(analysis.candidateLevel);
    const prompt = buildQuestionGenPrompt(
      analysis.fullAnalysis,
      { title: job.title, skills: job.skills, description: job.description },
      { roundType, difficulty, durationMinutes: dto.durationMinutes, numQuestions: dto.numQuestions },
    );

    const raw = await this.gemini.generate(prompt, { jsonMode: true });
    let parsed: any;
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (firstErr) {
      // Fallback: extract outermost { ... } object in case Gemini added prose around JSON
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(raw.slice(start, end + 1));
        } catch (secondErr) {
          this.logger.error(
            `AI returned invalid JSON (${secondErr instanceof Error ? secondErr.message : 'parse error'}). Raw output:\n${raw}`,
          );
          throw new BadRequestException('AI returned invalid JSON, please try again');
        }
      } else {
        this.logger.error(
          `AI returned invalid JSON (${firstErr instanceof Error ? firstErr.message : 'parse error'}). Raw output:\n${raw}`,
        );
        throw new BadRequestException('AI returned invalid JSON, please try again');
      }
    }

    let problems: any[] = Array.isArray(parsed.questions_or_problems) ? parsed.questions_or_problems : [];
    if (roundType === 'coding') {
      const verified: any[] = [];
      for (const problem of problems) verified.push(await this.verifyProblem(problem));
      problems = verified;
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    const questionSet = await this.prisma.aiGeneratedQuestionSet.create({
      data: {
        orgId, jobId: interview.jobId, interviewId, candidateId,
        roundType, difficulty, status: 'draft',
        questions: problems as any,
        interviewerNote: parsed.interviewer_note ?? null,
        reviewerId: resolvedReviewerId,
        reviewerType: resolvedReviewerType,
      },
    });

    // ── Notify reviewer (fire-and-forget) ───────────────────────────────────
    // Reviewer ko email bhejo with magic-link to review questions
    this.notifyReviewer(
      interviewId, resolvedReviewerId, candidateId,
      job.title, roundType, dto.reviewerType ?? 'self',
    ).catch(() => {/* email failure interview scheduling ko affect nahi karegi */});

    return questionSet;
  }

  // Reviewer ko question review ka link bhejta hai
  private async notifyReviewer(
    interviewId: string,
    reviewerId: string,
    candidateId: string,
    jobTitle: string,
    roundType: string,
    reviewerType: string,
  ) {
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      select: { email: true, name: true },
    });
    if (!reviewer) return;

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      select: { name: true },
    });

    const reviewUrl = await this.interviewsService.generateQuestionsReviewLink(
      interviewId, reviewerId, candidateId,
    );

    await this.emailService.sendQuestionsReadyForReview(
      reviewer.email,
      reviewer.name ?? reviewer.email,
      jobTitle,
      candidate?.name ?? 'Candidate',
      roundType,
      reviewUrl,
    );
  }

  // ─── Approve (Reviewer approves) ───────────────────────────────────────────
  // Sirf assigned reviewer hi approve kar sakta hai
  async approve(orgId: string, interviewId: string, candidateId: string, userId: string) {
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');
    if (set.orgId !== orgId) throw new ForbiddenException('Not authorized');

    if (set.reviewerId && set.reviewerId !== userId) {
      throw new ForbiddenException('Only the assigned reviewer can approve this question set');
    }
    if (set.status === 'approved') {
      throw new BadRequestException('Question set is already approved');
    }

    return this.prisma.aiGeneratedQuestionSet.update({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      data: { status: 'approved', reviewedAt: new Date() },
    });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────
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

  // ─── Update (edit questions / change status) ───────────────────────────────
  async update(orgId: string, interviewId: string, candidateId: string, userId: string, role: string, dto: UpdateQuestionSetDto) {
    await this.authorizeStaff(orgId, interviewId, userId, role);
    const set = await this.prisma.aiGeneratedQuestionSet.findUnique({
      where: { interviewId_candidateId: { interviewId, candidateId } },
    });
    if (!set) throw new NotFoundException('No question set found for this candidate');

    if (dto.status === 'approved' && set.reviewerId && set.reviewerId !== userId) {
      throw new ForbiddenException('Only the assigned reviewer can approve this question set');
    }

    return this.prisma.aiGeneratedQuestionSet.update({
      where: { interviewId_candidateId: { interviewId, candidateId } },
      data: {
        ...(dto.questions !== undefined ? { questions: dto.questions as any } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.status === 'approved' ? { reviewedAt: new Date() } : {}),
      },
    });
  }

  // ─── Coding problem verifier (unchanged) ──────────────────────────────────
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
}
