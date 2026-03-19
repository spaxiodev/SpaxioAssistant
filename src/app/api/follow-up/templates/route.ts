import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseFollowUpEmails } from '@/lib/entitlements';

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const two = v.includes('-') ? v.slice(0, 2) : v;
  return two || null;
}

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const allowed = await canUseFollowUpEmails(supabase, orgId, false);
  if (!allowed) return NextResponse.json({ error: 'Follow-up templates are not available on your plan.' }, { status: 403 });
  const { data, error } = await supabase
    .from('follow_up_templates')
    .select('*')
    .eq('organization_id', orgId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const allowed = await canUseFollowUpEmails(supabase, orgId, false);
  if (!allowed) return NextResponse.json({ error: 'Follow-up templates are not available on your plan.' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const key = typeof body.key === 'string' ? body.key.trim().slice(0, 100) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 80) : 'custom';
  const subjectTemplate = typeof body.subject_template === 'string' ? body.subject_template.slice(0, 300) : null;
  const bodyTemplate = typeof body.body_template === 'string' ? body.body_template.slice(0, 20000) : '';

  const languageCode = normalizeLanguageCode(body.language_code ?? body.languageCode);

  const subjectLocalizedInput = body.subject_template_localized;
  const bodyLocalizedInput = body.body_template_localized;

  const subjectLocalizedParsed: Record<string, string> | null =
    subjectLocalizedInput && typeof subjectLocalizedInput === 'object'
      ? (subjectLocalizedInput as Record<string, string>)
      : typeof subjectLocalizedInput === 'string' && languageCode
        ? { [languageCode]: subjectLocalizedInput }
        : null;

  const bodyLocalizedParsed: Record<string, string> | null =
    bodyLocalizedInput && typeof bodyLocalizedInput === 'object'
      ? (bodyLocalizedInput as Record<string, string>)
      : typeof bodyLocalizedInput === 'string' && languageCode
        ? { [languageCode]: bodyLocalizedInput }
        : null;

  if (!key || !name) {
    return NextResponse.json({ error: 'Missing key or name' }, { status: 400 });
  }

  // Merge localized JSON variants to avoid overwriting other languages.
  const { data: existing } = await supabase
    .from('follow_up_templates')
    .select('subject_template_localized, body_template_localized')
    .eq('organization_id', orgId)
    .eq('key', key)
    .maybeSingle();

  const existingSubject = (existing?.subject_template_localized as Record<string, string> | null) ?? {};
  const existingBody = (existing?.body_template_localized as Record<string, string> | null) ?? {};

  const mergedSubject = subjectLocalizedParsed ? { ...existingSubject, ...subjectLocalizedParsed } : null;
  const mergedBody = bodyLocalizedParsed ? { ...existingBody, ...bodyLocalizedParsed } : null;

  const payload: Record<string, unknown> = {
    organization_id: orgId,
    key,
    name,
    category,
    is_html: body.is_html !== false,
    is_active: body.is_active !== false,
  };

  if (subjectTemplate !== null) payload.subject_template = subjectTemplate;
  if (bodyTemplate !== null) payload.body_template = bodyTemplate;
  if (mergedSubject) payload.subject_template_localized = mergedSubject;
  if (mergedBody) payload.body_template_localized = mergedBody;

  const { data, error } = await supabase.from('follow_up_templates').upsert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
