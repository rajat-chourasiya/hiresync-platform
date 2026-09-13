import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function resolveDisplayName(userId: string, type: 'staff' | 'candidate'): Promise<string> {
  if (type === 'staff') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.name || user?.email || 'Interviewer';
  }
  const candidate = await prisma.candidateProfile.findUnique({ where: { id: userId } });
  return candidate?.name || 'Candidate';
}