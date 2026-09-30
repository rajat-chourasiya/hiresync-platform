export function candidateRescheduleTemplate(candidateName: string, jobTitle: string, newStart: Date, joinUrl: string) {
  return {
    subject: `Interview Rescheduled - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#D97706;">Your Interview Has Been Rescheduled</h2>
        <p>Hi ${candidateName},</p>
        <p>Your interview for <strong>${jobTitle}</strong> has a new time:</p>
        <p><strong>${newStart.toUTCString()}</strong></p>
        <p><a href="${joinUrl}" style="background:#1D4ED8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Join Interview</a></p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}

export function interviewerRescheduleTemplate(interviewerName: string, jobTitle: string, candidateName: string, newStart: Date, joinUrl: string, questionsUrl: string) {
  return {
    subject: `Interview Rescheduled - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#D97706;">Interview Rescheduled</h2>
        <p>Hi ${interviewerName},</p>
        <p>Your interview with <strong>${candidateName}</strong> for <strong>${jobTitle}</strong> has a new time:</p>
        <p><strong>${newStart.toUTCString()}</strong></p>
        <p><a href="${questionsUrl}" style="background:#D97706;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Review Questions</a></p>
        <p><a href="${joinUrl}" style="background:#1D4ED8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Join Interview</a></p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}