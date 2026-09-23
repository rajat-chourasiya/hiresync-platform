export function offerDecisionTemplate(candidateName: string, jobTitle: string, status: 'hired' | 'rejected') {
  const isHired = status === 'hired';
  return {
    subject: isHired ? `Congratulations! Offer - ${jobTitle}` : `Update on your application - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:${isHired ? '#15803D' : '#DC2626'};">${isHired ? 'Congratulations!' : 'Application Update'}</h2>
        <p>Hi ${candidateName},</p>
        <p>${isHired
          ? `We are pleased to inform you that you have been selected for the <strong>${jobTitle}</strong> role.`
          : `Thank you for your interest in the <strong>${jobTitle}</strong> role. After careful consideration, we have decided to move forward with other candidates.`
        }</p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}