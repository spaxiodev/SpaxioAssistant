/**
 * Dashboard: publish or unpublish an AI page. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPageById } from '@/lib/ai-pages/config-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const isPublished = typeof body.is_published === 'boolean' ? body.is_published : true;

  const supabase = createAdminClient();
  const page = await getPageById(supabase, id, orgId);
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('ai_pages')
    .update({ is_published: isPublished })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select('id, is_published')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ page: data });
}
