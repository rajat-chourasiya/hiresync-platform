export function paymentReceiptTemplate(orgName: string, planId: string, amount: number, receiptUrl: string) {
  return {
    subject: `Payment Receipt - HireSync ${planId} Plan`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#D97706;">Payment Confirmed</h2>
        <p>Hi ${orgName},</p>
        <p>We've received your payment of <strong>₹${amount}</strong> for the <strong>${planId}</strong> plan.</p>
        <p><a href="${receiptUrl}">Download Receipt</a></p>
        <p>Best,<br/>HireSync Team</p>
      </div>`,
  };
}