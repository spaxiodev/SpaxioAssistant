/**
 * DELETE /api/memories/[id] - Archive a memory (set status to archived). Org-scoped.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: row, error: fetchErr } = await supabase
    .from('ai_memories')
    .select('id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from('ai_memories')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
