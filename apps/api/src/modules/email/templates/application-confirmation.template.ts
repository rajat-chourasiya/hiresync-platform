export function applicationConfirmationTemplate(candidateName: string, jobTitle: string) {
  return {
    subject: `Application Received - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#1D4ED8;">Application Received</h2>
        <p>Hi ${candidateName},</p>
        <p>Thank you for applying to <strong>${jobTitle}</strong>. Our team will review your application and get back to you soon.</p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}