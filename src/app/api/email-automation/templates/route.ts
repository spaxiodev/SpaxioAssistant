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
    .from('email_reply_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('language_code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
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

  const { language_code, language_name, subject_template, body_template, is_active } = body as {
    language_code: string;
    language_name: string;
    subject_template?: string;
    body_template: string;
    is_active?: boolean;
  };

  if (!language_code || typeof language_code !== 'string') {
    return NextResponse.json({ error: 'language_code is required' }, { status: 400 });
  }
  if (!body_template || typeof body_template !== 'string') {
    return NextResponse.json({ error: 'body_template is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_reply_templates')
    .upsert(
      {
        organization_id: organizationId,
        language_code: language_code.toLowerCase().slice(0, 10),
        language_name: language_name ?? language_code,
        subject_template: subject_template ?? null,
        body_template,
        is_active: is_active !== false,
      },
      { onConflict: 'organization_id,language_code' }
    )
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
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
  const languageCode = searchParams.get('language_code');

  if (!languageCode) {
    return NextResponse.json({ error: 'language_code query param required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('email_reply_templates')
    .delete()
    .eq('organization_id', organizationId)
    .eq('language_code', languageCode);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
