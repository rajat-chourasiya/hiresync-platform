import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { RESEND } from './resend/resend.provider';
import { paymentReceiptTemplate } from './templates/payment-receipt.template';
import { offerDecisionTemplate } from './templates/offer-decision.template';
import { interviewReminderTemplate } from './templates/interview-reminder.template';
import { candidateInterviewInviteTemplate, interviewerAssignmentTemplate } from './templates/interview-invite.template';
import { applicationConfirmationTemplate } from './templates/application-confirmation.template';

@Injectable()
export class EmailService {
  constructor(
    @Inject(RESEND)
    private readonly resend: Resend,
  ) {}

  private async send(to: string, subject: string, html: string) {
  const result = await this.resend.emails.send({ from: process.env.EMAIL_FROM as string, to, subject, html });
  console.log(`📧 Email sent to ${to} | Subject: "${subject}"`);
  return result;
}

  async sendApplicationConfirmation(to: string, candidateName: string, jobTitle: string) {
    const { subject, html } = applicationConfirmationTemplate(candidateName, jobTitle);
    return this.send(to, subject, html);
  }

  async sendCandidateInterviewInvite(to: string, candidateName: string, jobTitle: string, scheduledStart: Date, joinUrl: string) {
  const { subject, html } = candidateInterviewInviteTemplate(candidateName, jobTitle, scheduledStart, joinUrl);
  return this.send(to, subject, html);
}

async sendInterviewerAssignment(to: string, interviewerName: string, jobTitle: string, candidateName: string, scheduledStart: Date, joinUrl: string) {
  const { subject, html } = interviewerAssignmentTemplate(interviewerName, jobTitle, candidateName, scheduledStart, joinUrl);
  return this.send(to, subject, html);
}

  async sendInterviewReminder(to: string, candidateName: string, jobTitle: string, joinUrl: string) {
    const { subject, html } = interviewReminderTemplate(candidateName, jobTitle, joinUrl);
    return this.send(to, subject, html);
  }

  async sendOfferDecision(to: string, candidateName: string, jobTitle: string, status: 'hired' | 'rejected') {
    const { subject, html } = offerDecisionTemplate(candidateName, jobTitle, status);
    return this.send(to, subject, html);
  }

  async sendPaymentReceipt(to: string, orgName: string, planId: string, amount: number, receiptUrl: string) {
    const { subject, html } = paymentReceiptTemplate(orgName, planId, amount, receiptUrl);
    return this.send(to, subject, html);
  }

  async sendEmail(to: string, subject: string, html: string) {
    return this.resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to,
      subject,
      html,
    });
  }

  async verifyConnection(): Promise<void> {
    await this.resend.domains.list();
  }
}
