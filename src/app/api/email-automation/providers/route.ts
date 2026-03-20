import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

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
    .select('id,provider_type,display_name,status,status_message,inbound_webhook_token,last_checked_at,connected_at,created_at,updated_at')
    .eq('organization_id', organizationId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ providers: data ?? [] });
}

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

  // Generate a webhook token for inbound providers
  const webhookToken = randomBytes(32).toString('hex');

  const { data, error } = await supabase
    .from('email_providers')
    .insert({
      organization_id: organizationId,
      provider_type,
      display_name: display_name ?? null,
      status: 'disconnected',
      inbound_webhook_token: webhookToken,
    })
    .select('id,provider_type,display_name,status,status_message,inbound_webhook_token,connected_at,created_at,updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ provider: data }, { status: 201 });
}

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

  if (!providerId) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('email_providers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', providerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
