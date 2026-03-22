/**
 * POST /api/email-automation/providers/imap/test
 *
 * Tests an IMAP/SMTP connection using the provided credentials.
 * Does NOT save anything — this is a dry-run test before saving.
 *
 * Request body:
 *   { email, password, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure }
 *
 * Response:
 *   { ok: true }                         — both IMAP and SMTP connected successfully
 *   { ok: false, imap_error?, smtp_error? } — one or both failed
 *
 * Security:
 *   - Requires authenticated org session + email_automation plan access.
 *   - Password is never logged or returned in the response.
 *   - Results are safe to display to the user.
 */

import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { testSmtpConnection, testImapConnectivity } from '@/lib/email/providers/imap';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Email automation requires an upgraded plan.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const imapHost = typeof body.imap_host === 'string' ? body.imap_host.trim() : '';
  const imapPort = typeof body.imap_port === 'number' ? body.imap_port : parseInt(String(body.imap_port), 10);
  const imapSecure = Boolean(body.imap_secure);
  const smtpHost = typeof body.smtp_host === 'string' ? body.smtp_host.trim() : '';
  const smtpPort = typeof body.smtp_port === 'number' ? body.smtp_port : parseInt(String(body.smtp_port), 10);
  const smtpSecure = Boolean(body.smtp_secure);

  if (!email || !password || !imapHost || !smtpHost) {
    return NextResponse.json({ error: 'email, password, imap_host, and smtp_host are required.' }, { status: 400 });
  }
  if (isNaN(imapPort) || imapPort < 1 || imapPort > 65535) {
    return NextResponse.json({ error: 'Invalid imap_port.' }, { status: 400 });
  }
  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return NextResponse.json({ error: 'Invalid smtp_port.' }, { status: 400 });
  }

  // Run IMAP connectivity and SMTP auth tests in parallel
  const [imapResult, smtpResult] = await Promise.all([
    testImapConnectivity({ host: imapHost, port: imapPort, secure: imapSecure }),
    testSmtpConnection({ host: smtpHost, port: smtpPort, secure: smtpSecure, email, password }),
  ]);

  const ok = imapResult.ok && smtpResult.ok;

  return NextResponse.json({
    ok,
    imap_ok: imapResult.ok,
    smtp_ok: smtpResult.ok,
    imap_error: imapResult.ok ? null : (imapResult.error ?? 'IMAP connection failed'),
    smtp_error: smtpResult.ok ? null : (smtpResult.error ?? 'SMTP authentication failed'),
  });
}
