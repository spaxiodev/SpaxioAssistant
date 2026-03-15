import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';

type Params = { params: Promise<{ id: string }> };

/** GET /api/ai-setup/sessions/[id] – get session with messages */
export async function GET(_request: Request, { params }: Params) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;
    const { id } = await params;

    const { data: session, error: sessionError } = await supabase
      .from('ai_setup_sessions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from('ai_setup_messages')
      .select('id, role, content, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[API] ai-setup session messages', messagesError);
    }

    return NextResponse.json({
      ...session,
      messages: messages ?? [],
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/sessions/[id]/GET');
  }
}
