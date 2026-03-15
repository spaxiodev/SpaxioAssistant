/**
 * POST /api/widget/voice/turn – Send user utterance, get AI reply. Persists transcript + messages.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { handleVoiceTurn } from '@/lib/voice/session-handler';
import type { Agent } from '@/lib/supabase/database.types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawSessionId = body.sessionId;
  const userText = typeof body.userText === 'string' ? String(body.userText).slice(0, 8000) : '';

  if (!rawSessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400, headers: corsHeaders });
  }

  const sessionId = normalizeUuid(String(rawSessionId));
  if (!isUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400, headers: corsHeaders });
  }

  const perIpKey = `widget-voice-turn:ip:${ip}`;
  if (!rateLimit({ key: perIpKey, limit: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('voice_sessions')
    .select('id, conversation_id, agent_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || (session as { status: string }).status !== 'active') {
    const { data: row } = await supabase.from('voice_sessions').select('id, status').eq('id', sessionId).single();
    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json({ error: 'Session already ended' }, { status: 400, headers: corsHeaders });
  }

  let agent: Agent | null = null;
  const agentId = (session as { agent_id?: string }).agent_id;
  if (agentId) {
    const { data: agentRow } = await supabase.from('agents').select('*').eq('id', agentId).single();
    agent = agentRow ?? null;
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('widget_id')
    .eq('id', (session as { conversation_id: string }).conversation_id)
    .single();

  const widgetId = conv ? (conv as { widget_id: string }).widget_id : null;
  if (!widgetId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404, headers: corsHeaders });
  }

  const { data: widget } = await supabase
    .from('widgets')
    .select('organization_id')
    .eq('id', widgetId)
    .single();

  const { data: settings } = widget
    ? await supabase
        .from('business_settings')
        .select('*')
        .eq('organization_id', (widget as { organization_id: string }).organization_id)
        .single()
    : { data: null };

  const businessSettings = settings
    ? {
        business_name: (settings as { business_name?: string }).business_name,
        industry: (settings as { industry?: string }).industry,
        company_description: (settings as { company_description?: string }).company_description,
        services_offered: (settings as { services_offered?: string[] }).services_offered,
        pricing_notes: (settings as { pricing_notes?: string }).pricing_notes,
      }
    : null;

  const result = await handleVoiceTurn({
    supabase,
    sessionId,
    userText,
    agent,
    businessSettings,
  });

  if (result === null) {
    return NextResponse.json({ error: 'Session not found or ended' }, { status: 400, headers: corsHeaders });
  }

  return NextResponse.json(
    { assistantText: result.assistantText },
    { headers: corsHeaders }
  );
}
