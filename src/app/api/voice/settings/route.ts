/**
 * GET /api/voice/settings – List voice_agent_settings for org, or one agent when ?agentId=...
 * PATCH /api/voice/settings – Upsert voice settings for an agent. Body: { agentId, voice_enabled?, greeting_text?, max_session_duration_seconds?, provider? }
 */
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseVoice } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseVoice(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Voice not enabled' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentIdParam = searchParams.get('agentId')?.trim();

    if (agentIdParam) {
      const agentId = normalizeUuid(agentIdParam);
      if (!isUuid(agentId)) return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 });
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agentId)
        .eq('organization_id', organizationId)
        .single();
      if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      const { data: settings, error } = await supabase
        .from('voice_agent_settings')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ settings: settings ?? null });
    }

    const { data: settingsList, error } = await supabase
      .from('voice_agent_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: settingsList ?? [] });
  } catch (err) {
    return handleApiError(err, 'voice/settings GET');
  }
}

export async function PATCH(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseVoice(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Voice not enabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const rawAgentId = body.agentId;
    if (!rawAgentId) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });

    const agentId = normalizeUuid(String(rawAgentId));
    if (!isUuid(agentId)) return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 });

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('organization_id', organizationId)
      .single();
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (typeof body.voice_enabled === 'boolean') updates.voice_enabled = body.voice_enabled;
    if (typeof body.greeting_text === 'string') updates.greeting_text = body.greeting_text.slice(0, 2000);
    if (body.greeting_text === null) updates.greeting_text = null;
    if (typeof body.max_session_duration_seconds === 'number') {
      updates.max_session_duration_seconds = Math.min(7200, Math.max(60, body.max_session_duration_seconds));
    }
    if (typeof body.provider === 'string' && ['browser', 'vapi', 'deepgram', 'openai_realtime'].includes(body.provider)) {
      updates.provider = body.provider;
    }
    if (typeof body.allow_actions_during_voice === 'boolean') updates.allow_actions_during_voice = body.allow_actions_during_voice;
    if (typeof body.auto_create_lead === 'boolean') updates.auto_create_lead = body.auto_create_lead;
    if (typeof body.auto_escalate_to_human_on_end === 'boolean') updates.auto_escalate_to_human_on_end = body.auto_escalate_to_human_on_end;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('voice_agent_settings')
      .select('id')
      .eq('agent_id', agentId)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('voice_agent_settings')
        .update(updates)
        .eq('agent_id', agentId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      result = data;
    } else {
      const { data, error } = await supabase
        .from('voice_agent_settings')
        .insert({
          agent_id: agentId,
          organization_id: organizationId,
          voice_enabled: false,
          ...updates,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, 'voice/settings PATCH');
  }
}
