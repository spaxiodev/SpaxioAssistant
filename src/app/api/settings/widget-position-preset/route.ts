import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const organizationId = await getOrganizationId();
  if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const presetRaw = typeof body.preset === 'string' ? (body.preset as string).toLowerCase().trim() : '';
  if (!presetRaw) {
    return NextResponse.json({ error: 'Missing preset' }, { status: 400 });
  }

  const allowed = new Set([
    'bottom-right',
    'bottom-left',
    'bottom-center',
    'top-right',
    'top-left',
    'top-center',
    'middle-right',
    'middle-left',
    'middle-center',
  ]);

  if (!allowed.has(presetRaw)) {
    return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('business_settings')
    .update({ widget_position_preset: presetRaw })
    .eq('organization_id', organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, preset: presetRaw });
}

