/**
 * GET /api/memories?subjectType=lead|contact|conversation&subjectId=...
 * Returns active memories for the subject (org-scoped via auth).
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_SUBJECT_TYPES = ['conversation', 'lead', 'contact', 'company', 'visitor'];

export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subjectType = searchParams.get('subjectType');
  const subjectId = searchParams.get('subjectId');

  if (!subjectType || !subjectId) {
    return NextResponse.json({ error: 'Missing subjectType or subjectId' }, { status: 400 });
  }

  if (!VALID_SUBJECT_TYPES.includes(subjectType)) {
    return NextResponse.json({ error: 'Invalid subjectType' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('ai_memories')
    .select('id, memory_type, title, summary, structured_facts, confidence, last_used_at, created_at')
    .eq('organization_id', orgId)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rows ?? []);
}
