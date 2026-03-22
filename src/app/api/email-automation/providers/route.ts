/**
 * /api/email-automation/providers
 *
 * GET    – list all providers for the org (no config_json / secrets)
 * POST   – create a new provider (webhook, resend, or imap with credentials)
 * PATCH  – update provider fields (status, display_name, is_default, enabled/disabled)
 * DELETE – remove a provider
 */

import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { randomBytes } from 'crypto';
import { buildImapConfig, testSmtpConnection, testImapConnectivity } from '@/lib/email/providers/imap';
import { isEncryptionConfigured } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';

// Columns safe to return to the client (no encrypted secrets).
const SAFE_SELECT =
  'id,provider_type,display_name,status,status_message,inbound_webhook_token,connected_email,connected_name,last_verified_at,is_default,last_checked_at,connected_at,created_at,updated_at';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('email_providers')
    .select(SAFE_SELECT)
    .eq('organization_id', organizationId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { provider_type, display_name } = body as {
    provider_type: string;
    display_name?: string;
  };

  const ALLOWED_TYPES = ['gmail', 'outlook', 'imap', 'resend', 'webhook_inbound'];
  if (!provider_type || !ALLOWED_TYPES.includes(provider_type)) {
    return NextResponse.json({ error: 'Invalid provider_type' }, { status: 400 });
  }

  // Count existing providers
  const { count } = await supabase
    .from('email_providers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Maximum of 3 email providers allowed. Remove an existing provider first.' },
      { status: 400 }
    );
  }

  // ── IMAP: validate + encrypt credentials ─────────────────────────────────
  if (provider_type === 'imap') {
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: 'Credential encryption is not configured on this server (EMAIL_ENCRYPTION_KEY missing).' },
        { status: 503 }
      );
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const imapHost = typeof body.imap_host === 'string' ? body.imap_host.trim() : '';
    const imapPort = typeof body.imap_port === 'number' ? body.imap_port : parseInt(String(body.imap_port), 10);
    const imapSecure = Boolean(body.imap_secure);
    const smtpHost = typeof body.smtp_host === 'string' ? body.smtp_host.trim() : '';
    const smtpPort = typeof body.smtp_port === 'number' ? body.smtp_port : parseInt(String(body.smtp_port), 10);
    const smtpSecure = Boolean(body.smtp_secure);
    const fromName = typeof body.from_name === 'string' ? body.from_name.trim() : null;

    if (!email || !password || !imapHost || !smtpHost) {
      return NextResponse.json(
        { error: 'email, password, imap_host, and smtp_host are required for IMAP providers.' },
        { status: 400 }
      );
    }
    if (isNaN(imapPort) || imapPort < 1 || imapPort > 65535) {
      return NextResponse.json({ error: 'Invalid imap_port.' }, { status: 400 });
    }
    if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return NextResponse.json({ error: 'Invalid smtp_port.' }, { status: 400 });
    }

    // Test the connection before saving
    const [imapResult, smtpResult] = await Promise.all([
      testImapConnectivity({ host: imapHost, port: imapPort, secure: imapSecure }),
      testSmtpConnection({ host: smtpHost, port: smtpPort, secure: smtpSecure, email, password }),
    ]);

    if (!imapResult.ok || !smtpResult.ok) {
      return NextResponse.json(
        {
          error: 'Connection test failed.',
          imap_ok: imapResult.ok,
          smtp_ok: smtpResult.ok,
          imap_error: imapResult.ok ? null : imapResult.error,
          smtp_error: smtpResult.ok ? null : smtpResult.error,
        },
        { status: 422 }
      );
    }

    const configJson = buildImapConfig({
      email,
      from_name: fromName,
      password,
      imap_host: imapHost,
      imap_port: imapPort,
      imap_secure: imapSecure,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_secure: smtpSecure,
    });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('email_providers')
      .insert({
        organization_id: organizationId,
        provider_type: 'imap',
        display_name: display_name ?? email,
        status: 'connected',
        config_json: configJson,
        connected_email: email,
        connected_name: fromName,
        last_verified_at: now,
        connected_at: now,
        inbound_webhook_token: null, // IMAP providers don't use webhook tokens
      })
      .select(SAFE_SELECT)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ provider: data }, { status: 201 });
  }

  // ── Webhook / Resend: generate webhook token ──────────────────────────────
  const webhookToken =
    provider_type === 'webhook_inbound' || provider_type === 'resend'
      ? randomBytes(32).toString('hex')
      : null;

  const { data, error } = await supabase
    .from('email_providers')
    .insert({
      organization_id: organizationId,
      provider_type,
      display_name: display_name ?? null,
      status: 'disconnected',
      inbound_webhook_token: webhookToken,
    })
    .select(SAFE_SELECT)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ provider: data }, { status: 201 });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('id');
  if (!providerId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist of patchable fields
  const allowed: Record<string, unknown> = {};
  if (typeof body.display_name === 'string') allowed.display_name = body.display_name;
  if (body.status === 'disabled' || body.status === 'connected' || body.status === 'disconnected') {
    allowed.status = body.status;
  }
  if (typeof body.is_default === 'boolean') {
    allowed.is_default = body.is_default;

    // If setting as default, unset any other defaults for this org first
    if (body.is_default) {
      await supabase
        .from('email_providers')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .neq('id', providerId);
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_providers')
    .update(allowed)
    .eq('organization_id', organizationId)
    .eq('id', providerId)
    .select(SAFE_SELECT)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
  return NextResponse.json({ provider: data });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  const auth = await requireOrg();
  if (!auth.ok) return auth.response;
  const { organizationId, supabase, adminAllowed } = auth;

  const planAccess = await getPlanAccess(supabase, organizationId, adminAllowed);
  if (!planAccess.featureAccess.email_automation) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('id');
  if (!providerId) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { error } = await supabase
    .from('email_providers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', providerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
