const STAFF_ALWAYS_ALLOWED_ROLES = ['org_admin', 'recruiter', 'hiring_manager'];

export function canAccessCandidateChannel(
  viewer: { id: string; type: 'staff' | 'candidate'; role?: string },
  interview: { candidateIds: string[]; interviewerIds: string[] },
): boolean {
  if (viewer.type === 'candidate') return interview.candidateIds.includes(viewer.id);
  return interview.interviewerIds.includes(viewer.id) || STAFF_ALWAYS_ALLOWED_ROLES.includes(viewer.role ?? '');
}

export function canAccessInterviewerChannel(
  viewer: { id: string; type: 'staff' | 'candidate'; role?: string },
  interview: { interviewerIds: string[] },
): boolean {
  if (viewer.type === 'candidate') return false; 
  return interview.interviewerIds.includes(viewer.id) || STAFF_ALWAYS_ALLOWED_ROLES.includes(viewer.role ?? '');
}