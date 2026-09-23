export function interviewReminderTemplate(candidateName: string, jobTitle: string, joinUrl: string) {
  return {
    subject: `Reminder: Interview Tomorrow - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#D97706;">Interview Reminder</h2>
        <p>Hi ${candidateName},</p>
        <p>This is a reminder that your interview for <strong>${jobTitle}</strong> is coming up.</p>
        <p><a href="${joinUrl}" style="background:#1D4ED8;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Join Interview</a></p>
      </div>`,
  };
}