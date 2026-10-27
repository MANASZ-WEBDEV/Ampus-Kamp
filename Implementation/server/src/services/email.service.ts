import nodemailer from 'nodemailer';
import { env } from '@/config/env';

// ── Transporter ──────────────────────────────────────────────────────────────

/**
 * If SMTP env vars are configured, use nodemailer.
 * If not (local dev), fall back to Ethereal / console.log so developers
 * can see OTPs without needing an actual mail server.
 */
function createTransporter() {
  if (env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ?? 587,
      secure: (env.EMAIL_PORT ?? 587) === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
  }
  // No SMTP config → use Ethereal (auto-created test account)
  return null;
}

const transporter = createTransporter();

// ── HTML builder ─────────────────────────────────────────────────────────────

/** Shared HTML wrapper — campus green header, Manrope body, optional CTA button */
function buildHtml(opts: {
  heading:   string;
  body:      string;
  ctaUrl?:   string;
  ctaLabel?: string;
}): string {
  const cta = opts.ctaUrl
    ? `<a href="${opts.ctaUrl}"
         style="display:inline-block;margin-top:20px;padding:12px 24px;
                background:#004541;color:#ffffff;border-radius:8px;
                font-family:Outfit,sans-serif;font-weight:600;
                text-decoration:none;font-size:14px;">
         ${opts.ctaLabel ?? 'Open App'}
       </a>`
    : '';

  return `
<div style="font-family:Manrope,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#faf8ff;border-radius:12px;">
  <div style="margin-bottom:24px;">
    <span style="display:inline-block;background:#004541;color:#ffffff;
                 padding:4px 12px;border-radius:999px;font-size:12px;
                 letter-spacing:0.04em;text-transform:uppercase;">
      Campus Innovation Platform
    </span>
  </div>
  <h2 style="font-family:Outfit,sans-serif;color:#131b2e;margin:0 0 8px;">${opts.heading}</h2>
  <p style="color:#3f4947;margin:0 0 16px;">${opts.body}</p>
  ${cta}
  <p style="color:#6f7977;font-size:12px;margin:24px 0 0;">
    You received this because you have an active account on Campus Innovation Platform.
  </p>
</div>`.trim();
}

// ── OTP emails (F-1) ─────────────────────────────────────────────────────────

interface OtpEmailPayload {
  to:      string;
  name:    string;
  code:    string;
  purpose: 'email_verification' | 'password_reset';
}

export async function sendOtpEmail(payload: OtpEmailPayload): Promise<void> {
  const { to, name, code, purpose } = payload;

  const subject =
    purpose === 'email_verification'
      ? 'Campus Innovation Platform — Verify Your Email'
      : 'Campus Innovation Platform — Password Reset Code';

  const text = `
Hi ${name},

Your ${purpose === 'email_verification' ? 'email verification' : 'password reset'} code is:

  ${code}

This code expires in 10 minutes.
Do not share this code with anyone.

— Campus Innovation Platform
`.trim();

  const html = `
<div style="font-family:Manrope,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#faf8ff;border-radius:12px;">
  <div style="margin-bottom:24px;">
    <span style="display:inline-block;background:#004541;color:#ffffff;padding:4px 12px;border-radius:999px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">
      Campus Innovation Platform
    </span>
  </div>
  <h2 style="font-family:Outfit,sans-serif;color:#131b2e;margin:0 0 8px;">
    ${purpose === 'email_verification' ? 'Verify your email' : 'Reset your password'}
  </h2>
  <p style="color:#3f4947;margin:0 0 24px;">Hi ${name}, use the code below to complete your request.</p>
  <div style="background:#115e59;color:#ffffff;text-align:center;padding:20px;border-radius:8px;letter-spacing:0.2em;font-size:32px;font-family:'JetBrains Mono',monospace;font-weight:600;">
    ${code}
  </div>
  <p style="color:#6f7977;font-size:12px;margin:16px 0 0;">
    Valid for <strong>10 minutes</strong>. Do not share this code.
  </p>
</div>
`.trim();

  if (!transporter) {
    console.info(`\n📧  OTP EMAIL (dev mode — no SMTP configured)
  To:      ${to}
  Subject: ${subject}
  Code:    ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"Campus Innovation Platform" <${env.EMAIL_FROM ?? env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

// ── Notification emails (F-9) ────────────────────────────────────────────────

export interface NotificationEmailPayload {
  to:        string;
  name:      string;
  subject:   string;
  heading:   string;
  body:      string;
  ctaUrl?:   string;
  ctaLabel?: string;
}

/**
 * sendNotificationEmail — transactional notification email (F-9).
 *
 * Conservative use: only called for high-value types where the student needs
 * to act (event_new, deadline-48h, credential_update). In-app notifications
 * are always written regardless of whether this function is called.
 *
 * Uses the same transporter and dev-fallback pattern as sendOtpEmail.
 */
export async function sendNotificationEmail(
  payload: NotificationEmailPayload,
): Promise<void> {
  const { to, name, subject, heading, body, ctaUrl, ctaLabel } = payload;

  const text = `Hi ${name},\n\n${heading}\n\n${body}${ctaUrl ? `\n\n${ctaLabel ?? 'Open App'}: ${ctaUrl}` : ''}\n\n— Campus Innovation Platform`;
  const html = buildHtml({ heading, body: body.replace(/\n/g, '<br>'), ctaUrl, ctaLabel });

  if (!transporter) {
    console.info(`\n📧  NOTIFICATION EMAIL (dev mode — no SMTP configured)
  To:      ${to}
  Subject: ${subject}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"Campus Innovation Platform" <${env.EMAIL_FROM ?? env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
