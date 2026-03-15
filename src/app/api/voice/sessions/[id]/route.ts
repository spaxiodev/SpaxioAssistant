/**
 * GET /api/voice/sessions/[id] – One voice session with transcripts. Auth required, org-scoped.
 */
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseVoice } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const sessionId = normalizeUuid(id);
    if (!isUuid(sessionId)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseVoice(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Voice not enabled' }, { status: 403 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('organization_id', organizationId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: transcripts } = await supabase
      .from('voice_transcripts')
      .select('id, speaker_type, text, timestamp')
      .eq('voice_session_id', sessionId)
      .order('timestamp', { ascending: true });

    return NextResponse.json({
      session,
      transcripts: transcripts ?? [],
    });
  } catch (err) {
    return handleApiError(err, 'voice/sessions/[id]');
  }
}
