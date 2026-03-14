import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth-server';

type Params = { params: Promise<{ id: string; mappingId: string }> };

/** DELETE: remove a field mapping */
export async function DELETE(_request: Request, { params }: Params) {
  const { id: endpointId, mappingId } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', endpointId)
    .eq('organization_id', orgId)
    .single();

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('webhook_field_mappings')
    .delete()
    .eq('id', mappingId)
    .eq('endpoint_id', endpointId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
