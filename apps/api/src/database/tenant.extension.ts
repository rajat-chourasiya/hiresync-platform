import { Prisma } from '@prisma/client';
import { getCurrentOrgId } from '../common/context/tenant-context';

const TENANT_MODELS = [
  'User', 'Job', 'CandidateProfile', 'Application',
  'Interview', 'AiResumeAnalysis', 'AiGeneratedQuestionSet',
  'AiFeedbackSummary', 'AiUsageLog', 'AuditLog',
];

const READ_OPS = ['findMany', 'findFirst', 'count', 'updateMany', 'deleteMany'];

export const tenantExtension = Prisma.defineExtension((prisma) =>
  prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const orgId = getCurrentOrgId();

          if (orgId && model && TENANT_MODELS.includes(model) && READ_OPS.includes(operation)) {
            const scopedArgs = args as { where?: Record<string, unknown> };
            scopedArgs.where = { ...(scopedArgs.where ?? {}), orgId };
          }

          return query(args);
        },
      },
    },
  }),
);