/**
 * Send team invitation email via Resend.
 * Branded Spaxio Assistant invite email with secure accept link.
 *
 * Resend does not allow Gmail/Yahoo etc. as "from"; we fall back to onboarding@resend.dev.
 * With that sender, Resend only delivers to the account's signup email. To send to any
 * invitee, verify a domain in Resend and set RESEND_FROM_EMAIL (e.g. noreply@yourdomain.com).
 */

import { Resend } from 'resend';
import { getPublicAppUrl } from '@/lib/app-url';

function getResend() {
  // Optional: use a dedicated key for team invites (e.g. restricted scope). Falls back to main key.
  const key =
    process.env.RESEND_API_KEY_TEAM_INVITES?.trim() ||
    process.env.RESEND_API_KEY?.trim();
  return key ? new Resend(key) : null;
}

function getFrom(): string {
  const raw = process.env.RESEND_FROM_EMAIL || '';
  const free = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
  const domain = raw.includes('@') ? raw.split('@')[1]?.toLowerCase() : '';
  const isFree = domain ? free.some((d) => domain === d || domain.endsWith('.' + d)) : false;
  return raw && !isFree ? raw : 'Spaxio Assistant <onboarding@resend.dev>';
}

/** Build accept invite URL (default locale en). */
export function buildInviteAcceptUrl(token: string, baseUrl: string, locale = 'en'): string {
  const clean = baseUrl.replace(/\/$/, '');
  return `${clean}/${locale}/invite/accept?token=${encodeURIComponent(token)}`;
}

/** Send team invitation email. Returns { sent: true } or { sent: false, error }. */
export async function sendTeamInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  token: string;
  expiresAt: Date;
  request?: Request;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { sent: false, error: 'Email not configured' };
  }

  const baseUrl = getPublicAppUrl({ request: params.request });
  const acceptUrl = buildInviteAcceptUrl(params.token, baseUrl);
  const expiresInDays = Math.max(1, Math.ceil((params.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to Spaxio Assistant</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;min-height:100vh;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f8fafc;">You've been invited to join Spaxio Assistant</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#94a3b8;">
                <strong style="color:#e2e8f0;">${escapeHtml(params.inviterName)}</strong> has invited you to join their team workspace${params.organizationName ? ` (${escapeHtml(params.organizationName)})` : ''} on Spaxio Assistant.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#fff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.4);">
                Accept invitation
              </a>
              <p style="margin:20px 0 0;font-size:13px;color:#64748b;">
                This link expires in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}. If you don't have an account, you'll be able to create one after clicking.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #334155;">
              <p style="margin:0;font-size:12px;color:#64748b;">
                If you didn't expect this invite, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const from = getFrom();
  const { error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: `You're invited to join Spaxio Assistant`,
    html,
  });

  if (error) {
    console.error('[team-invite-email] Resend error:', error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
