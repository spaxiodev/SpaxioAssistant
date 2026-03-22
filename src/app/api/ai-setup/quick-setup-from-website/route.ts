/**
 * POST /api/ai-setup/quick-setup-from-website
 * Infer → draft → apply (safe) flow in one call.
 * Body: { url: string, session_id?: string, business_type?: string, description?: string }
 * Returns: draft (planner config), applied (fields written to business_settings), knowledge
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { deleteExpiredDraftAiSetupSessions } from '@/lib/ai-setup/session-ttl';
import { sanitizeText } from '@/lib/validation';
import { fetchWebsiteText } from '@/lib/website-auto-setup/fetch-and-extract';
import { analyzeWebsiteWithAI } from '@/lib/website-auto-setup/analyze-website';
import { buildPlannerDraftFromAnalysis, executeSetupAction } from '@/lib/ai-setup/setup-actions';
import { mergePlannerConfig } from '@/lib/ai-setup/planner';
import type { AssistantPlannerConfig } from '@/lib/ai-setup/types';
import { DEFAULT_PLANNER_CONFIG } from '@/lib/ai-setup/types';

function isValidUrl(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length > 2000) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    await deleteExpiredDraftAiSetupSessions(supabase, orgId);

    const rl = rateLimit({ key: `ai-setup-quick:${orgId}`, limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many setup attempts. Please wait.', code: 'rate_limit' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() || undefined : undefined;
    const businessType = typeof body.business_type === 'string' ? sanitizeText(body.business_type, 200) || undefined : undefined;
    const description = typeof body.description === 'string' ? sanitizeText(body.description, 1000) || undefined : undefined;

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Valid website URL is required (https://...)' }, { status: 400 });
    }

    // 1. Fetch and analyze
    const websiteText = await fetchWebsiteText(url);
    const analysis = await analyzeWebsiteWithAI(websiteText, businessType, description);

    // 2. Build draft
    const draftPartial = buildPlannerDraftFromAnalysis(analysis, businessType ?? undefined);
    let currentConfig: AssistantPlannerConfig = { ...DEFAULT_PLANNER_CONFIG };
    if (sessionId) {
      const { data: session } = await supabase
        .from('ai_setup_sessions')
        .select('planner_config')
        .eq('id', sessionId)
        .eq('organization_id', orgId)
        .single();
      if (session?.planner_config && typeof session.planner_config === 'object') {
        currentConfig = { ...DEFAULT_PLANNER_CONFIG, ...session.planner_config } as AssistantPlannerConfig;
      }
    }
    const draftUpdate: Record<string, unknown> = {
      ...draftPartial,
      business_type: businessType ?? draftPartial.business_type,
    };
    const mergedDraft = mergePlannerConfig(currentConfig, draftUpdate) ?? currentConfig;

    // 3. Apply safe changes to business_settings
    const safeDraft = {
      business_name: analysis.business_name ?? undefined,
      company_description: analysis.company_description ?? undefined,
      services_offered: analysis.services_offered ?? undefined,
      faq: analysis.faq ?? undefined,
      tone_of_voice: analysis.tone_of_voice ?? undefined,
      contact_email: analysis.contact_email ?? undefined,
      phone: analysis.phone ?? undefined,
      chatbot_welcome_message: mergedDraft.widget_config?.welcomeMessage ?? undefined,
    };
    const applyResult = await executeSetupAction(supabase, orgId, 'apply_safe_setup_draft', { draft: safeDraft });

    // 4. Update website_url and learned content in business_settings
    await supabase
      .from('business_settings')
      .update({
        website_url: url,
        website_learned_content: websiteText.slice(0, 12_000),
        website_learned_at: new Date().toISOString(),
        last_learn_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId);

    // 5. Ingest to knowledge
    const ingestResult = await executeSetupAction(supabase, orgId, 'ingest_website_source', {
      url,
      content: websiteText.slice(0, 100_000),
    });

    // 6. Update session planner_config if session_id provided
    if (sessionId) {
      await supabase
        .from('ai_setup_sessions')
        .update({
          planner_config: mergedDraft,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('organization_id', orgId);
    }

    return NextResponse.json({
      ok: true,
      draft: mergedDraft,
      applied: applyResult.ok ? (applyResult.data as { applied?: string[] })?.applied ?? [] : [],
      knowledge: ingestResult.ok
        ? { sourceId: (ingestResult.data as { sourceId?: string })?.sourceId, chunksCreated: (ingestResult.data as { chunksCreated?: number })?.chunksCreated ?? 0 }
        : null,
      analysis: {
        business_name: analysis.business_name,
        services_count: analysis.services_offered?.length ?? 0,
        faq_count: analysis.faq?.length ?? 0,
      },
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/quick-setup-from-website');
  }
}
