/**
 * Seed system permissions and built-in roles.
 * Run: npx ts-node --project tsconfig.json prisma/seed-permissions.ts
 * Or add to package.json scripts as "seed:permissions"
 *
 * Uses upsert by name so it is idempotent — safe to re-run.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'jobs.create',           resource: 'jobs',         action: 'create' },
  { name: 'jobs.publish',          resource: 'jobs',         action: 'publish' },
  { name: 'jobs.view',             resource: 'jobs',         action: 'view' },
  { name: 'applications.view',     resource: 'applications', action: 'view' },
  { name: 'applications.review',   resource: 'applications', action: 'review' },
  { name: 'interviews.schedule',   resource: 'interviews',   action: 'schedule' },
  { name: 'interviews.view_all',   resource: 'interviews',   action: 'view_all' },
  { name: 'interviews.view_own',   resource: 'interviews',   action: 'view_own' },
  { name: 'interviews.join_own',   resource: 'interviews',   action: 'join_own' },
  { name: 'feedback.submit',       resource: 'feedback',     action: 'submit' },
  { name: 'feedback.view',         resource: 'feedback',     action: 'view' },
  { name: 'users.create',          resource: 'users',        action: 'create' },
  { name: 'users.update',          resource: 'users',        action: 'update' },
  { name: 'roles.manage',          resource: 'roles',        action: 'manage' },
];

async function main() {
  console.log('Seeding permissions…');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { resource: p.resource, action: p.action },
      create: p,
    });
    console.log(`  ✔ ${p.name}`);
  }
  console.log(`Done — ${PERMISSIONS.length} permissions seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
