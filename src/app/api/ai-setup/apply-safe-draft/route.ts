/**
 * POST /api/ai-setup/apply-safe-draft
 * Apply safe draft fields to live business_settings without publishing.
 * Body: { session_id: string }
 * Uses session's planner_config as the draft source.
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { deleteExpiredDraftAiSetupSessions } from '@/lib/ai-setup/session-ttl';
import { executeSetupAction } from '@/lib/ai-setup/setup-actions';
import type { AssistantPlannerConfig } from '@/lib/ai-setup/types';

export async function POST(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    await deleteExpiredDraftAiSetupSessions(supabase, orgId);

    const rl = rateLimit({ key: `ai-setup-apply:${orgId}`, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests', code: 'rate_limit' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null;
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('ai_setup_sessions')
      .select('planner_config')
      .eq('id', sessionId)
      .eq('organization_id', orgId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const draft = session.planner_config as AssistantPlannerConfig | null;
    if (!draft || typeof draft !== 'object') {
      return NextResponse.json({ error: 'No draft to apply' }, { status: 400 });
    }

    const safeDraft: Record<string, unknown> = {};
    if (draft.chatbot_name) safeDraft.chatbot_name = draft.chatbot_name;
    if (draft.primary_goal) safeDraft.company_description = draft.primary_goal;
    if (draft.widget_config?.welcomeMessage) safeDraft.chatbot_welcome_message = draft.widget_config.welcomeMessage;
    if (draft.widget_config?.primaryColor) safeDraft.primary_brand_color = draft.widget_config.primaryColor;
    if (draft.widget_config?.position) safeDraft.widget_position_preset = draft.widget_config.position;
    if (draft.notification_email) safeDraft.lead_notification_email = draft.notification_email;
    if (draft.widget_enabled !== undefined) safeDraft.widget_enabled = draft.widget_enabled;
    if (draft.quote_form_config && typeof draft.quote_form_config === 'object') safeDraft.quote_form_config = draft.quote_form_config;

    const result = await executeSetupAction(supabase, orgId, 'apply_safe_setup_draft', { draft: safeDraft });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const applied = (result.data as { applied?: string[] })?.applied ?? [];
    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    return handleApiError(err, 'ai-setup/apply-safe-draft');
  }
}
