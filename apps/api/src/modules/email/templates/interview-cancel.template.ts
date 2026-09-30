export function interviewCancelTemplate(recipientName: string, jobTitle: string, reason?: string) {
  return {
    subject: `Interview Cancelled - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#DC2626;">Interview Cancelled</h2>
        <p>Hi ${recipientName},</p>
        <p>Your interview for <strong>${jobTitle}</strong> has been cancelled.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        <p>You will be notified once it is rescheduled.</p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}