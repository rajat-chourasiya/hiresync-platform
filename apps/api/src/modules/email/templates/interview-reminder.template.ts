// ─── Shared helper ────────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  return d.toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

function baseTemplate(
  recipientName: string,
  badgeText: string,
  badgeColor: string,
  heading: string,
  bodyHtml: string,
): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <span style="display:inline-block;background:${badgeColor};color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:12px">${badgeText}</span>
      <h2 style="margin:0 0 8px">${heading}</h2>
      <p>Hi ${recipientName},</p>
      ${bodyHtml}
      <p style="font-size:12px;color:#999;margin-top:28px">— HireSync</p>
    </div>`;
}

// ─── 1. Questions not yet reviewed (sent to reviewer if still draft) ───────────
export function questionsNotReviewedTemplate(
  reviewerName: string,
  jobTitle: string,
  candidateName: string,
  interviewStart: Date,
  reviewUrl: string,
) {
  const body = `
    <p>The interview for <strong>${candidateName}</strong> (<em>${jobTitle}</em>) is scheduled for
    <strong>${formatDate(interviewStart)}</strong>.</p>
    <p>The AI-generated question set has <strong>not been reviewed yet</strong>. Please review and approve it before the interview begins.</p>
    <a href="${reviewUrl}"
       style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
      Review Questions →
    </a>`;

  return {
    subject: `[Action Required] Review questions before interview — ${candidateName} · ${jobTitle}`,
    html: baseTemplate(reviewerName, 'Action Required', '#dc2626', 'Questions Not Yet Reviewed', body),
  };
}

// ─── 2. One day before ────────────────────────────────────────────────────────
export function oneDayBeforeTemplate(
  recipientName: string,
  jobTitle: string,
  interviewStart: Date,
  joinUrl: string,
  recipientType: 'candidate' | 'staff',
  candidateName?: string,
) {
  const who = recipientType === 'candidate'
    ? `your interview for <strong>${jobTitle}</strong>`
    : `the interview with <strong>${candidateName}</strong> for <em>${jobTitle}</em>`;

  const body = `
    <p>This is a reminder that ${who} is <strong>tomorrow</strong>
    at <strong>${formatDate(interviewStart)}</strong>.</p>
    <a href="${joinUrl}"
       style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
      ${recipientType === 'candidate' ? 'View Interview Details →' : 'Join Interview →'}
    </a>`;

  return {
    subject: `[Tomorrow] Interview reminder — ${jobTitle}`,
    html: baseTemplate(recipientName, '1 Day Before', '#d97706', 'Interview Tomorrow', body),
  };
}

// ─── 3. Day-of ───────────────────────────────────────────────────────────────
export function dayOfTemplate(
  recipientName: string,
  jobTitle: string,
  interviewStart: Date,
  joinUrl: string,
  recipientType: 'candidate' | 'staff',
  candidateName?: string,
) {
  const who = recipientType === 'candidate'
    ? `your interview for <strong>${jobTitle}</strong>`
    : `the interview with <strong>${candidateName}</strong> for <em>${jobTitle}</em>`;

  const body = `
    <p>${who} is <strong>today</strong> at <strong>${formatDate(interviewStart)}</strong>.</p>
    <a href="${joinUrl}"
       style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
      Join Interview →
    </a>`;

  return {
    subject: `[Today] Interview at ${formatDate(interviewStart)} — ${jobTitle}`,
    html: baseTemplate(recipientName, 'Today', '#059669', 'Your Interview is Today', body),
  };
}

// ─── 4. One hour before ───────────────────────────────────────────────────────
export function oneHourBeforeTemplate(
  recipientName: string,
  jobTitle: string,
  interviewStart: Date,
  joinUrl: string,
  recipientType: 'candidate' | 'staff',
  candidateName?: string,
) {
  const who = recipientType === 'candidate'
    ? `your interview for <strong>${jobTitle}</strong>`
    : `the interview with <strong>${candidateName}</strong> for <em>${jobTitle}</em>`;

  const body = `
    <p>${who} starts in <strong>approximately 1 hour</strong>
    at <strong>${formatDate(interviewStart)}</strong>. Get ready!</p>
    <a href="${joinUrl}"
       style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
      Join Now →
    </a>`;

  return {
    subject: `[1 Hour] Interview starting soon — ${jobTitle}`,
    html: baseTemplate(recipientName, '1 Hour Before', '#7c3aed', 'Interview Starting Soon', body),
  };
}

// ─── Legacy export (backward compat — used by EmailService.sendInterviewReminder) ──
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
