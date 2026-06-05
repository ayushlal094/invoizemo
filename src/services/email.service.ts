import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// ── Create transporter ────────────────────────────────────────────────────────
// Uses SMTP credentials from .env. In development with no SMTP set,
// falls back to Ethereal (fake SMTP — emails are captured, not delivered).

async function getTransporter() {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? 465),
      secure: Number(env.SMTP_PORT ?? 465) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }

  // Dev fallback — Ethereal fake SMTP
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('📧 Using Ethereal test email account:', testAccount.user);
  return transport;
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.EMAIL_FROM ?? '"Invoizemo" <noreply@invoizemo.app>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  // In dev, log the preview URL for Ethereal
  if (!env.SMTP_HOST) {
    console.log('📧 Email preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}

// ── Email templates ───────────────────────────────────────────────────────────

function baseHtml(body: string) {
  return `
    <div style="font-family:DM Sans,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#0d0d0f;color:#f0efe8;">
      <div style="font-size:22px;font-weight:700;color:#c9a96e;margin-bottom:32px;letter-spacing:-0.02em;">
        invoizemo
      </div>
      ${body}
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#5a5958;">
        If you did not request this, you can safely ignore this email.
      </div>
    </div>
  `;
}

// ── Welcome email (sent after register) ──────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  await sendMail({
    to,
    subject: 'Welcome to Invoizemo 🎉',
    html: baseHtml(`
      <h2 style="color:#f0efe8;margin-bottom:16px;">Welcome, ${name}!</h2>
      <p style="color:#9b9a95;line-height:1.6;margin-bottom:24px;">
        Your account is ready. Start creating professional invoices and tracking payments in minutes.
      </p>
      <a href="${env.CLIENT_URL}/dashboard"
         style="display:inline-block;background:#c9a96e;color:#1a1208;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
        Go to Dashboard
      </a>
    `),
    text: `Welcome to Invoizemo, ${name}! Visit ${env.CLIENT_URL}/dashboard to get started.`,
  });
}

// ── Password reset email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendMail({
    to,
    subject: 'Reset your Invoizemo password',
    html: baseHtml(`
      <h2 style="color:#f0efe8;margin-bottom:16px;">Reset your password</h2>
      <p style="color:#9b9a95;line-height:1.6;margin-bottom:8px;">
        We received a request to reset your password. Click the button below.
        This link expires in <strong style="color:#f0efe8;">1 hour</strong>.
      </p>
      <p style="color:#9b9a95;margin-bottom:24px;font-size:13px;">
        If you didn't request this, ignore this email — your password won't change.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#c9a96e;color:#1a1208;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
        Reset password
      </a>
      <p style="margin-top:20px;font-size:12px;color:#5a5958;word-break:break-all;">
        Or copy this link: ${resetUrl}
      </p>
    `),
    text: `Reset your Invoizemo password: ${resetUrl}\nThis link expires in 1 hour.`,
  });
}

// ── Password changed confirmation ─────────────────────────────────────────────
export async function sendPasswordChangedEmail(to: string) {
  await sendMail({
    to,
    subject: 'Your Invoizemo password was changed',
    html: baseHtml(`
      <h2 style="color:#f0efe8;margin-bottom:16px;">Password changed</h2>
      <p style="color:#9b9a95;line-height:1.6;">
        Your password was successfully changed. If you did not do this, please
        <a href="${env.CLIENT_URL}/forgot-password" style="color:#c9a96e;">reset your password immediately</a>.
      </p>
    `),
    text: `Your Invoizemo password was changed. If this wasn't you, visit ${env.CLIENT_URL}/forgot-password`,
  });
}
