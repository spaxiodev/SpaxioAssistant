/**
 * GET /api/voice/sessions – List voice sessions for the org. Auth required.
 */
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { canUseVoice } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseVoice(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Voice not enabled for your plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
    const status = searchParams.get('status')?.trim() || undefined;

    let query = supabase
      .from('voice_sessions')
      .select('id, conversation_id, agent_id, widget_id, source_type, status, started_at, ended_at, duration_seconds, transcript_summary, created_at', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data: sessions, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = (sessions ?? []) as Array<{
      id: string;
      conversation_id: string | null;
      agent_id: string | null;
      widget_id: string | null;
      source_type: string;
      status: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number | null;
      transcript_summary: string | null;
      created_at: string;
    }>;

    return NextResponse.json({ sessions: list, total: count ?? list.length });
  } catch (err) {
    return handleApiError(err, 'voice/sessions');
  }
}
