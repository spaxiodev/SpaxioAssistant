/**
 * POST /api/widget/voice/start – Start a browser voice session. Creates conversation + voice_session, returns sessionId + conversationId + optional greeting.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { canUseVoice, hasActiveSubscription, hasExceededMonthlyVoiceMinutes } from '@/lib/entitlements';
import { startVoiceSession } from '@/lib/voice/session-handler';
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
  const rawWidgetId = body.widgetId;

  if (!rawWidgetId) {
    return NextResponse.json({ error: 'Missing widgetId' }, { status: 400, headers: corsHeaders });
  }

  const widgetId = normalizeUuid(String(rawWidgetId));
  if (!isUuid(widgetId)) {
    return NextResponse.json({ error: 'Invalid widgetId' }, { status: 400, headers: corsHeaders });
  }

  const perIpKey = `widget-voice-start:${widgetId}:ip:${ip}`;
  if (!rateLimit({ key: perIpKey, limit: 20, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
  }

  const supabase = createAdminClient();

  const { data: widget, error: widgetError } = await supabase
    .from('widgets')
    .select('id, organization_id, agent_id')
    .eq('id', widgetId)
    .single();

  if (widgetError || !widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404, headers: corsHeaders });
  }

  const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
  if (!(await hasActiveSubscription(supabase, widget.organization_id, adminAllowed))) {
    return NextResponse.json(
      { error: 'Voice is not available. Please contact the business.' },
      { status: 403, headers: corsHeaders }
    );
  }
  if (!(await canUseVoice(supabase, widget.organization_id, adminAllowed))) {
    return NextResponse.json(
      { error: 'Voice is not enabled for this plan.' },
      { status: 403, headers: corsHeaders }
    );
  }
  if (await hasExceededMonthlyVoiceMinutes(supabase, widget.organization_id, adminAllowed)) {
    return NextResponse.json(
      { error: 'Monthly voice minutes limit reached. Upgrade or try again next month.' },
      { status: 403, headers: corsHeaders }
    );
  }

  let agent: Agent | null = null;
  if (widget.agent_id) {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('*')
      .eq('id', widget.agent_id)
      .single();
    agent = agentRow ?? null;
  }

  const { data: voiceAgentSettings } =
    agent
      ? await supabase
          .from('voice_agent_settings')
          .select('greeting_text, voice_enabled')
          .eq('agent_id', agent.id)
          .maybeSingle()
      : { data: null };

  if (agent && voiceAgentSettings && !(voiceAgentSettings as { voice_enabled?: boolean }).voice_enabled) {
    return NextResponse.json(
      { error: 'Voice is not enabled for this agent.' },
      { status: 403, headers: corsHeaders }
    );
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', widget.organization_id)
    .single();

  const businessSettings = settings
    ? {
        business_name: (settings as { business_name?: string }).business_name,
        industry: (settings as { industry?: string }).industry,
        company_description: (settings as { company_description?: string }).company_description,
        services_offered: (settings as { services_offered?: string[] }).services_offered,
        pricing_notes: (settings as { pricing_notes?: string }).pricing_notes,
      }
    : null;

  const result = await startVoiceSession({
    supabase,
    widgetId,
    organizationId: widget.organization_id,
    agentId: widget.agent_id ?? null,
    agent,
    businessSettings,
    voiceSettings: voiceAgentSettings ?? null,
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to start voice session' }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      sessionId: result.sessionId,
      conversationId: result.conversationId,
      greeting: result.greeting,
    },
    { headers: corsHeaders }
  );
}
