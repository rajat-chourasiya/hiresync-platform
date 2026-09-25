export function candidateInterviewInviteTemplate(
  candidateName: string,
  jobTitle: string,
  scheduledStart: Date,
  joinUrl: string,
) {
  return {
    subject: `You're Shortlisted! Interview Scheduled - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#15803D;">Congratulations, you've been shortlisted!</h2>
        <p>Hi ${candidateName},</p>
        <p>Your interview for <strong>${jobTitle}</strong> is scheduled on:</p>
        <p><strong>${scheduledStart.toUTCString()}</strong></p>
        <p><a href="${joinUrl}" style="background:#1D4ED8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Join Interview</a></p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}

export function interviewerAssignmentTemplate(
  interviewerName: string,
  jobTitle: string,
  candidateName: string,
  scheduledStart: Date,
  joinUrl: string,
) {
  return {
    subject: `Interview Assigned - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#7C3AED;">You've been assigned an interview</h2>
        <p>Hi ${interviewerName},</p>
        <p>You are scheduled to interview <strong>${candidateName}</strong> for <strong>${jobTitle}</strong> on:</p>
        <p><strong>${scheduledStart.toUTCString()}</strong></p>
        <p>Please review the AI-generated questions before the interview.</p>
        <p><a href="${joinUrl}" style="background:#1D4ED8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Join Interview</a></p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}