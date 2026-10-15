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

// ── Public API ───────────────────────────────────────────────────────────────

interface OtpEmailPayload {
  to: string;
  name: string;
  code: string;
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
    // Dev fallback — print to console so the developer can use the code
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
