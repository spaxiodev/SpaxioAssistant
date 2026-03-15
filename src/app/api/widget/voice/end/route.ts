/**
 * POST /api/widget/voice/end – End voice session, set duration, generate AI summary.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { endVoiceSession } from '@/lib/voice/session-handler';

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

  if (!rawSessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400, headers: corsHeaders });
  }

  const sessionId = normalizeUuid(String(rawSessionId));
  if (!isUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400, headers: corsHeaders });
  }

  const perIpKey = `widget-voice-end:ip:${ip}`;
  if (!rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('voice_sessions')
    .select('id, status')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404, headers: corsHeaders });
  }
  if ((session as { status: string }).status !== 'active') {
    return NextResponse.json(
      { error: 'Session already ended', sessionId },
      { status: 200, headers: corsHeaders }
    );
  }

  const result = await endVoiceSession({
    supabase,
    sessionId,
    generateSummary: true,
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      sessionId,
      durationSeconds: result.durationSeconds,
      transcriptSummary: result.transcriptSummary,
    },
    { headers: corsHeaders }
  );
}
