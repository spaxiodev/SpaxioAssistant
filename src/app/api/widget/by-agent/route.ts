import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/**
 * GET /api/widget/by-agent?agentId=UUID
 * Returns { widgetId } for the first widget linked to this agent.
 * Used when embed uses data-agent-id instead of data-widget-id (backward compat: data-widget-id still works).
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const rawAgentId = searchParams.get('agentId');

  if (!rawAgentId || typeof rawAgentId !== 'string') {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400, headers: corsHeaders });
  }

  const agentId = normalizeUuid(rawAgentId);
  if (!isUuid(agentId)) {
    return NextResponse.json({ error: 'Invalid agentId' }, { status: 400, headers: corsHeaders });
  }

  const perIpKey = `widget-by-agent:ip:${ip}`;
  const perIp = rateLimit({ key: perIpKey, limit: 60, windowMs: 60_000 });
  if (!perIp.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();
  const { data: widget, error } = await supabase
    .from('widgets')
    .select('id, organization_id')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !widget) {
    return NextResponse.json({ error: 'No widget found for this agent' }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json({ widgetId: widget.id }, { headers: corsHeaders });
}
