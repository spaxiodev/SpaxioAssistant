import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/api-org-auth';
import { getPlanAccess } from '@/lib/plan-access';

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
    .from('email_automation_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return defaults if no row yet
  if (!data) {
    return NextResponse.json({
      organization_id: organizationId,
      enabled: false,
      fallback_language: 'en',
      ai_enhancement_enabled: false,
      tone_preset: 'professional',
      business_hours_enabled: false,
      business_hours_json: null,
      away_message_enabled: false,
      away_message_text: null,
      away_message_language: 'en',
      max_auto_replies_per_thread: 1,
      cooldown_hours: 24,
      ai_translate_enabled: true,
    });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
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

  const allowed = [
    'enabled',
    'fallback_language',
    'ai_enhancement_enabled',
    'tone_preset',
    'business_hours_enabled',
    'business_hours_json',
    'away_message_enabled',
    'away_message_text',
    'away_message_language',
    'max_auto_replies_per_thread',
    'cooldown_hours',
    'ai_translate_enabled',
  ];

  const updates: Record<string, unknown> = { organization_id: organizationId };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('email_automation_settings')
    .upsert(updates, { onConflict: 'organization_id' })
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
