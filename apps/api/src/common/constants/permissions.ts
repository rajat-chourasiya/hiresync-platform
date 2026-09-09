export const ROLE_PERMISSIONS: Record<string, string[]> = {
  org_admin: ['*'], 
  recruiter: [
    'jobs.create', 'jobs.publish', 'jobs.view',
    'applications.view', 'applications.review',
    'interviews.schedule', 'interviews.view_all',
  ],
  interviewer: [
    'interviews.view_own', 'interviews.join_own',
    'feedback.submit',
  ],
  hiring_manager: [
    'applications.view', 'feedback.view',
    'interviews.view_all',
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}