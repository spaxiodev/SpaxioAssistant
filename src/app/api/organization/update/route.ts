/**
 * PATCH /api/organization/update – update business name (owner only).
 * Body: { organization_id: string, name: string }. Updates organizations.name and business_settings.business_name.
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeText } from '@/lib/validation';
import { isUuid } from '@/lib/validation';

export async function PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id.trim() : '';
    const name = typeof body.name === 'string' ? sanitizeText(body.name, 120).trim() : '';

    if (!organizationId || !isUuid(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization id' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can update this business' }, { status: 403 });
    }

    const { error: orgError } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', organizationId);

    if (orgError) {
      console.error('[API] organization/update org', orgError);
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
    }

    const { error: settingsError } = await supabase
      .from('business_settings')
      .update({ business_name: name })
      .eq('organization_id', organizationId);

    if (settingsError) {
      console.error('[API] organization/update business_settings', settingsError);
    }

    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error('[API] organization/update', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
