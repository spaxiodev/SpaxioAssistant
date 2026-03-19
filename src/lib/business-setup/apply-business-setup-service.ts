/**
 * Apply Business Setup: publish approved sections from a draft to live tables.
 * Section-by-section; no duplicates where practical; org-scoped and RLS-safe.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { ingestDocumentBatchEmbed } from '@/lib/knowledge/ingest';
import type {
  BusinessSetupDraftRow,
  SectionApprovals,
  DraftSectionKey,
  PublishSectionResult,
  PublishDraftResult,
  ExtractedBusinessProfile,
  ExtractedService,
  ExtractedKnowledge,
  ExtractedPricing,
  ExtractedAgent,
  ExtractedAutomation,
  ExtractedWidgetConfig,
  ExtractedAIPageSuggestion,
  ExtractedBranding,
} from './types';

// Streamlined: only types with real behavioral logic (deprecated types fallback to website_chatbot)
const ROLE_TYPES = [
  'website_chatbot',
  'support_agent',
  'lead_qualification',
  'sales_agent',
  'quote_assistant',
  'faq_agent',
  'custom',
] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

/**
 * Which sections to apply: those approved or edited in section_approvals.
 */
export function getSectionsToPublish(approvals: SectionApprovals): DraftSectionKey[] {
  const keys: DraftSectionKey[] = [
    'business_profile',
    'services',
    'knowledge',
    'pricing',
    'agents',
    'automations',
    'widget_config',
    'ai_pages',
    'branding',
  ];
  return keys.filter((k) => {
    const v = approvals[k];
    return v === 'approved' || v === 'edited';
  });
}

/**
 * Apply selected sections of a business setup draft to the live org. Returns per-section results.
 */
export async function applyBusinessSetupDraft(
  supabase: SupabaseClient,
  draft: BusinessSetupDraftRow,
  sectionsToPublish: DraftSectionKey[]
): Promise<PublishDraftResult> {
  const orgId = draft.organization_id;
  const results: PublishSectionResult[] = [];
  const errors: string[] = [];

  for (const section of sectionsToPublish) {
    const result: PublishSectionResult = { section, created: [], updated: [], skipped: [] };
    try {
      switch (section) {
        case 'business_profile':
          await applyBusinessProfile(supabase, orgId, draft.extracted_business_profile as ExtractedBusinessProfile | null, result);
          break;
        case 'services':
          await applyServices(supabase, orgId, draft.extracted_services as ExtractedService[] | null, result);
          break;
        case 'knowledge':
          await applyKnowledge(supabase, orgId, draft.extracted_knowledge as ExtractedKnowledge | null, result);
          break;
        case 'pricing':
          await applyPricing(supabase, orgId, draft.extracted_pricing as ExtractedPricing | null, result);
          break;
        case 'agents':
          await applyAgents(supabase, orgId, draft.extracted_agents as ExtractedAgent[] | null, result);
          break;
        case 'automations':
          await applyAutomations(supabase, orgId, draft.extracted_automations as ExtractedAutomation[] | null, result);
          break;
        case 'widget_config':
          await applyWidgetConfig(supabase, orgId, draft.extracted_widget_config as ExtractedWidgetConfig | null, result);
          break;
        case 'ai_pages':
          await applyAIPages(supabase, orgId, draft.extracted_ai_pages as ExtractedAIPageSuggestion[] | null, result);
          break;
        case 'branding':
          await applyBranding(supabase, orgId, draft.extracted_branding as ExtractedBranding | null, result);
          break;
      }
      results.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.error = msg;
      errors.push(`${section}: ${msg}`);
      results.push(result);
    }
  }

  return {
    success: errors.length === 0,
    sections: results,
    errors,
  };
}

async function applyBusinessProfile(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedBusinessProfile | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data) return;
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .eq('organization_id', orgId)
    .single();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    business_name: data.business_name ?? undefined,
    company_description: data.company_description ?? undefined,
    industry: data.industry ?? undefined,
    contact_email: data.contact_email ?? undefined,
    phone: data.phone ?? undefined,
    tone_of_voice: data.tone_of_voice ?? undefined,
    chatbot_welcome_message: data.welcome_message_suggestion ?? undefined,
    lead_notification_email: data.lead_notification_email ?? undefined,
  };
  if (existing?.id) {
    await supabase.from('business_settings').update(payload).eq('organization_id', orgId);
    result.updated.push('business_settings');
  } else {
    await supabase.from('business_settings').insert({ organization_id: orgId, ...payload });
    result.created.push('business_settings');
  }
}

async function applyServices(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedService[] | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data?.length) return;
  const names = data.map((s) => s.name.trim()).filter(Boolean);
  if (names.length === 0) return;
  const { data: existing } = await supabase
    .from('business_settings')
    .select('services_offered')
    .eq('organization_id', orgId)
    .single();
  const existingList = Array.isArray(existing?.services_offered) ? existing.services_offered : [];
  const merged = [...new Set([...existingList, ...names])].slice(0, 50);
  await supabase
    .from('business_settings')
    .update({ services_offered: merged, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId);
  result.updated.push('business_settings.services_offered');
}

async function applyKnowledge(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedKnowledge | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data) return;
  const parts: string[] = [];
  if (data.faqs?.length) {
    parts.push('## FAQs\n\n' + data.faqs.map((f) => `**Q:** ${f.q}\n**A:** ${f.a}`).join('\n\n'));
  }
  if (data.business_facts?.length) {
    parts.push('## Business facts\n\n' + data.business_facts.join('\n'));
  }
  if (data.support_topics?.length) {
    parts.push('## Support topics\n\n' + data.support_topics.join('\n'));
  }
  if (data.website_derived_summary) {
    parts.push('## Summary\n\n' + data.website_derived_summary);
  }
  const content = parts.join('\n\n---\n\n').trim();
  if (!content) return;

  let knowledgeBaseId: string | null = null;
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle();
  if (kb?.id) knowledgeBaseId = kb.id;
  else {
    const { data: newKb } = await supabase
      .from('knowledge_bases')
      .insert({ organization_id: orgId, name: 'Default', description: 'Business knowledge' })
      .select('id')
      .single();
    knowledgeBaseId = newKb?.id ?? null;
  }

  const { data: source, error: srcErr } = await supabase
    .from('knowledge_sources')
    .insert({
      organization_id: orgId,
      knowledge_base_id: knowledgeBaseId,
      name: 'AI Business Setup',
      source_type: 'pasted_content',
      config: {},
    })
    .select('id')
    .single();

  if (srcErr || !source?.id) {
    throw new Error(srcErr?.message ?? 'Failed to create knowledge source');
  }
  result.created.push(`knowledge_sources:${source.id}`);

  await ingestDocumentBatchEmbed(supabase, {
    sourceId: source.id,
    title: 'Business Setup Knowledge',
    content,
    embed: true,
  });
  result.created.push('knowledge_documents');
}

async function applyPricing(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedPricing | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data) return;
  const { data: existingProfile } = await supabase
    .from('quote_pricing_profiles')
    .select('id')
    .eq('organization_id', orgId)
    .eq('is_default', true)
    .maybeSingle();

  let profileId: string;
  if (existingProfile?.id) {
    profileId = existingProfile.id;
    await supabase
      .from('quote_pricing_profiles')
      .update({
        name: data.industry_hint ? `Profile (${data.industry_hint})` : 'Default',
        currency: data.currency ?? 'USD',
        description: data.pricing_notes ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);
    result.updated.push(`quote_pricing_profiles:${profileId}`);
  } else {
    const { data: newProfile, error: profileErr } = await supabase
      .from('quote_pricing_profiles')
      .insert({
        organization_id: orgId,
        name: data.industry_hint ? `Profile (${data.industry_hint})` : 'Default',
        industry_type: data.industry_hint ?? undefined,
        is_default: true,
        currency: data.currency ?? 'USD',
        description: data.pricing_notes ?? undefined,
      })
      .select('id')
      .single();
    if (profileErr || !newProfile?.id) throw new Error(profileErr?.message ?? 'Failed to create pricing profile');
    profileId = newProfile.id;
    result.created.push(`quote_pricing_profiles:${profileId}`);
  }

  for (const svc of data.services ?? []) {
    const slug = svc.slug || slugify(svc.name);
    const { data: existingSvc } = await supabase
      .from('quote_services')
      .select('id')
      .eq('pricing_profile_id', profileId)
      .eq('slug', slug)
      .maybeSingle();
    if (existingSvc?.id) {
      await supabase
        .from('quote_services')
        .update({
          name: svc.name,
          description: svc.description ?? null,
          base_price: svc.base_price ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSvc.id);
      result.updated.push(`quote_services:${existingSvc.id}`);
    } else {
      const { data: newSvc, error: svcErr } = await supabase
        .from('quote_services')
        .insert({
          organization_id: orgId,
          pricing_profile_id: profileId,
          name: svc.name,
          slug,
          description: svc.description ?? null,
          base_price: svc.base_price ?? null,
        })
        .select('id')
        .single();
      if (!svcErr && newSvc?.id) result.created.push(`quote_services:${newSvc.id}`);
    }
  }

  for (const rule of data.rules ?? []) {
    const { data: newRule, error: ruleErr } = await supabase
      .from('quote_pricing_rules')
      .insert({
        organization_id: orgId,
        pricing_profile_id: profileId,
        service_id: null,
        rule_type: rule.rule_type,
        name: rule.name,
        config: rule.config ?? {},
        sort_order: rule.sort_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();
    if (!ruleErr && newRule?.id) result.created.push(`quote_pricing_rules:${newRule.id}`);
  }
}

async function applyAgents(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedAgent[] | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data?.length) return;
  const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  let firstAgentId: string | null = null;
  for (const a of data.slice(0, 5)) {
    const roleType = ROLE_TYPES.includes(a.role_type as (typeof ROLE_TYPES)[number]) ? a.role_type : 'website_chatbot';
    const systemPrompt = a.system_prompt_snippet
      ? a.system_prompt_snippet
      : `You are a helpful assistant for this business. ${a.description ?? ''}`.trim();
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .insert({
        organization_id: orgId,
        name: a.name,
        description: (a.description ?? '').slice(0, 500),
        role_type: roleType,
        system_prompt: systemPrompt.slice(0, 8000),
        model_provider: 'openai',
        model_id: modelId,
        temperature: 0.7,
        enabled_tools: (a.suggested_tools?.length ? a.suggested_tools : ['capture_contact_info']).slice(0, 20),
        widget_enabled: roleType === 'website_chatbot',
        webhook_enabled: false,
        memory_short_term_enabled: true,
        memory_long_term_enabled: false,
        created_by_ai_setup: true,
      })
      .select('id')
      .single();
    if (!agentErr && agent?.id) {
      result.created.push(`agents:${agent.id}`);
      if (!firstAgentId) firstAgentId = agent.id;
    }
  }
  if (firstAgentId) {
    const { data: widget } = await supabase
      .from('widgets')
      .select('id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (widget?.id) {
      await supabase.from('widgets').update({ agent_id: firstAgentId }).eq('id', widget.id);
      result.updated.push(`widgets:${widget.id}`);
    }
  }
}

async function applyAutomations(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedAutomation[] | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data?.length) return;
  const { data: settings } = await supabase
    .from('business_settings')
    .select('lead_notification_email, contact_email')
    .eq('organization_id', orgId)
    .single();
  const toEmail = settings?.lead_notification_email ?? settings?.contact_email ?? null;

  for (const a of data.slice(0, 10)) {
    const triggerType = (TRIGGER_TYPES as readonly string[]).includes(a.trigger_type) ? a.trigger_type : 'manual_test';
    const actionType = (ACTION_TYPES as readonly string[]).includes(a.action_type) ? a.action_type : 'send_email_notification';
    const actionConfig =
      actionType === 'send_email_notification' && toEmail
        ? { ...(a.action_config ?? {}), to_email: toEmail }
        : (a.action_config ?? {});

    const { data: auto, error: autoErr } = await supabase
      .from('automations')
      .insert({
        organization_id: orgId,
        name: a.name,
        description: (a.description ?? '').slice(0, 500),
        status: 'active',
        trigger_type: triggerType,
        trigger_config: a.trigger_config ?? {},
        action_type: actionType,
        action_config: actionConfig,
        agent_id: null,
        template_key: null,
      })
      .select('id')
      .single();
    if (!autoErr && auto?.id) result.created.push(`automations:${auto.id}`);
  }
}

async function applyWidgetConfig(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedWidgetConfig | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data) return;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.welcome_message) payload.chatbot_welcome_message = data.welcome_message;
  if (data.primary_color) payload.primary_brand_color = data.primary_color;
  if (Object.keys(payload).length <= 1) return;
  await supabase.from('business_settings').update(payload).eq('organization_id', orgId);
  result.updated.push('business_settings');
}

async function applyAIPages(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedAIPageSuggestion[] | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data?.length) return;
  for (const p of data.slice(0, 3)) {
    const slug = p.slug || slugify(p.title);
    const { data: existing } = await supabase
      .from('ai_pages')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', slug)
      .maybeSingle();
    if (existing?.id) result.skipped.push(`ai_pages:${slug}`);
    else {
      const pageType = ['quote', 'support', 'booking', 'intake', 'sales', 'general', 'custom'].includes(p.page_type) ? p.page_type : 'general';
      const { data: page, error: pageErr } = await supabase
        .from('ai_pages')
        .insert({
          organization_id: orgId,
          title: p.title,
          slug,
          description: p.description ?? null,
          page_type: pageType,
          deployment_mode: 'page_only',
          welcome_message: p.welcome_message ?? null,
          is_published: false,
          is_enabled: true,
        })
        .select('id')
        .single();
      if (!pageErr && page?.id) result.created.push(`ai_pages:${page.id}`);
    }
  }
}

async function applyBranding(
  supabase: SupabaseClient,
  orgId: string,
  data: ExtractedBranding | null,
  result: PublishSectionResult
): Promise<void> {
  if (!data) return;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.tone_of_voice) payload.tone_of_voice = data.tone_of_voice;
  if (data.welcome_message) payload.chatbot_welcome_message = data.welcome_message;
  if (Object.keys(payload).length <= 1) return;
  await supabase.from('business_settings').update(payload).eq('organization_id', orgId);
  result.updated.push('business_settings');
}
