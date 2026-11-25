export function questionsReadyForReviewTemplate(
  reviewerName: string,
  jobTitle: string,
  candidateName: string,
  roundType: string,
  reviewUrl: string,
): { subject: string; html: string } {
  const roundLabel: Record<string, string> = {
    technical_interview: 'Technical Interview',
    coding: 'Coding Round',
    behavioral: 'Behavioural Round',
    system_design: 'System Design',
    aptitude: 'Aptitude Test',
    english: 'English Test',
    hiring_manager_final: 'Hiring Manager Final',
  };

  const subject = `[HireSync] Questions ready for review — ${candidateName} · ${jobTitle}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#4f46e5">Question Set Ready for Review</h2>
      <p>Hi ${reviewerName},</p>
      <p>An AI-generated question set is ready for your review before the interview.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666;width:140px">Candidate</td><td><strong>${candidateName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Role</td><td><strong>${jobTitle}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Round</td><td><strong>${roundLabel[roundType] ?? roundType}</strong></td></tr>
      </table>
      <p>Please review, edit if needed, and approve the questions before the interview begins.</p>
      <a href="${reviewUrl}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
        Review &amp; Approve Questions →
      </a>
      <p style="font-size:12px;color:#999;margin-top:24px">
        This link is valid for 24 hours. If you have any issues, contact your recruiter.
      </p>
    </div>`;

  return { subject, html };
}
