/**
 * AI Website Scanner & Auto-Setup: orchestration pipeline.
 * Scrapes URL, extracts business info with AI, populates settings, knowledge, agents, automations, widget.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ingestDocumentBatchEmbed } from '@/lib/knowledge/ingest';
import type { WebsiteExtraction, AiSetupStep, AiSetupRunResult } from './website-scanner-types';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { generateWebhookToken, generateWebhookSecret } from '@/lib/automations/webhook-url';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 500_000;
const MAX_TEXT_CHARS = 30_000;

function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const s = urlStr.trim();
  if (s.length > 2000) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('0.0.0.0')) {
      if (process.env.NODE_ENV === 'production') return false;
    }
    return true;
  } catch {
    return false;
  }
}

function stripHtmlToText(html: string): string {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

async function fetchAndExtractText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'SpaxioBot/1.0 (Website learning for AI assistant)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('URL did not return HTML');
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) throw new Error('Page too large');
  const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  const text = stripHtmlToText(html);
  if (text.length < 100) throw new Error('Too little text on page');
  return text;
}

const EXTRACTION_SYSTEM = `You extract structured business information from website text.
Return a JSON object with exactly these keys (use null or empty array when not found):
- business_name: string or null
- services: array of strings (services or products offered)
- faqs: array of { "q": "question", "a": "answer" } (max 10)
- contact_email: string or null
- contact_phone: string or null
- tone_of_voice: string or null (e.g. professional, friendly, casual)
- company_description: string or null (1-3 sentences)
- key_pages: array of short page names or topics (e.g. "Pricing", "About") (max 8)
Reply with only the JSON, no markdown.`;

async function extractWithAi(
  webpageText: string,
  businessType?: string | null,
  description?: string | null
): Promise<WebsiteExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const userContent = [
    webpageText.slice(0, 14_000),
    businessType ? `\nBusiness type: ${businessType}` : '',
    description ? `\nAdditional context: ${description}` : '',
  ].join('');
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      { role: 'user', content: userContent },
    ],
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('No extraction result');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const faqs = Array.isArray(parsed.faqs)
    ? (parsed.faqs as Array<{ q?: string; a?: string }>)
        .filter((x) => x && typeof x.q === 'string' && typeof x.a === 'string')
        .map((x) => ({ q: String(x.q).slice(0, 500), a: String(x.a).slice(0, 1000) }))
        .slice(0, 10)
    : [];
  return {
    business_name: typeof parsed.business_name === 'string' ? parsed.business_name.slice(0, 500) : null,
    services: Array.isArray(parsed.services)
      ? (parsed.services as string[]).filter((s) => typeof s === 'string').map((s) => s.slice(0, 300)).slice(0, 20)
      : [],
    faqs,
    contact_email: typeof parsed.contact_email === 'string' ? parsed.contact_email.slice(0, 255) : null,
    contact_phone: typeof parsed.contact_phone === 'string' ? parsed.contact_phone.slice(0, 50) : null,
    tone_of_voice: typeof parsed.tone_of_voice === 'string' ? parsed.tone_of_voice.slice(0, 100) : null,
    company_description: typeof parsed.company_description === 'string' ? parsed.company_description.slice(0, 2000) : null,
    key_pages: Array.isArray(parsed.key_pages)
      ? (parsed.key_pages as string[]).filter((s) => typeof s === 'string').map((s) => s.slice(0, 100)).slice(0, 8)
      : [],
  };
}

export type RunPipelineOptions = {
  runId: string;
  organizationId: string;
  websiteUrl: string;
  businessType?: string | null;
  description?: string | null;
  onStep?: (step: AiSetupStep) => Promise<void>;
};

export async function runWebsiteScanPipeline(
  supabase: SupabaseClient,
  options: RunPipelineOptions
): Promise<AiSetupRunResult> {
  const { runId, organizationId, websiteUrl, businessType, description, onStep } = options;

  const updateRun = async (updates: { step?: AiSetupStep; result_json?: AiSetupRunResult; error_message?: string }) => {
    await supabase
      .from('ai_setup_runs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('organization_id', organizationId);
  };

  let extraction: WebsiteExtraction | undefined;
  const result: AiSetupRunResult = { step: 'scanning_website' };

  try {
    // 1. Scan website
    await onStep?.('scanning_website');
    await updateRun({ step: 'scanning_website' });
    const webpageText = await fetchAndExtractText(websiteUrl);

    // 2. Extract with AI
    await onStep?.('extracting_info');
    await updateRun({ step: 'extracting_info' });
    extraction = await extractWithAi(webpageText, businessType, description);
    result.extraction = extraction;

    // 3. Update business settings
    await onStep?.('updating_settings');
    await updateRun({ step: 'updating_settings', result_json: result });
    const faqJson = extraction.faqs.length > 0 ? extraction.faqs : [];
    const { error: settingsError } = await supabase
      .from('business_settings')
      .update({
        website_url: websiteUrl,
        website_learned_content: webpageText.slice(0, 12_000),
        website_learned_at: new Date().toISOString(),
        last_learn_attempt_at: new Date().toISOString(),
        business_name: extraction.business_name ?? undefined,
        company_description: extraction.company_description ?? undefined,
        services_offered: extraction.services.length > 0 ? extraction.services : undefined,
        faq: faqJson,
        tone_of_voice: extraction.tone_of_voice ?? undefined,
        contact_email: extraction.contact_email ?? undefined,
        phone: extraction.contact_phone ?? undefined,
        chatbot_welcome_message: `Hi! I'm here to help with ${extraction.business_name || 'your business'}. What can I do for you today?`,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);
    if (settingsError) throw new Error(settingsError.message);
    result.businessSettingsUpdated = true;

    // 4. Knowledge base: create source and ingest
    await onStep?.('building_knowledge');
    await updateRun({ step: 'building_knowledge', result_json: result });
    let knowledgeBaseId: string | null = null;
    const { data: existingBase } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle();
    if (existingBase) knowledgeBaseId = existingBase.id;
    else {
      const { data: newBase } = await supabase
        .from('knowledge_bases')
        .insert({ organization_id: organizationId, name: 'Default', description: 'Website and documents' })
        .select('id')
        .single();
      knowledgeBaseId = newBase?.id ?? null;
    }
    const { data: newSource, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({
        organization_id: organizationId,
        knowledge_base_id: knowledgeBaseId,
        name: `Website: ${new URL(websiteUrl).hostname}`,
        source_type: 'website_crawl',
        config: { url: websiteUrl },
      })
      .select('id')
      .single();
    if (sourceError || !newSource) throw new Error(sourceError?.message ?? 'Failed to create knowledge source');
    const ingestResult = await ingestDocumentBatchEmbed(supabase, {
      sourceId: newSource.id,
      title: websiteUrl,
      content: webpageText,
      externalId: websiteUrl,
      metadata: { url: websiteUrl },
      embed: true,
    });
    await supabase
      .from('knowledge_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', newSource.id);
    result.knowledgeSourceId = newSource.id;
    result.knowledgeChunksCreated = ingestResult.chunksCreated;

    // 5. Create default agents (one main website chatbot; link to widget)
    await onStep?.('creating_agents');
    await updateRun({ step: 'creating_agents', result_json: result });
    const agentIds: string[] = [];
    const roleTypes = ['website_chatbot', 'sales_agent', 'support_agent', 'lead_qualification', 'faq_agent'] as const;
    const names: Record<(typeof roleTypes)[number], string> = {
      website_chatbot: 'Website Assistant',
      sales_agent: 'Sales Agent',
      support_agent: 'Support Agent',
      lead_qualification: 'Lead Qualification',
      faq_agent: 'FAQ Agent',
    };
    const systemPrompts: Record<(typeof roleTypes)[number], string> = {
      website_chatbot: `You are the friendly assistant for ${extraction.business_name || 'this business'}. Answer questions based on the provided context. Be helpful and ${extraction.tone_of_voice || 'professional'}.`,
      sales_agent: `You help qualify leads and move prospects toward a sale for ${extraction.business_name || 'this business'}. Be professional and consultative.`,
      support_agent: `You provide support and help resolve issues for ${extraction.business_name || 'this business'}. Be empathetic and clear.`,
      lead_qualification: `You qualify leads by understanding needs, budget, and timeline for ${extraction.business_name || 'this business'}. Ask concise questions.`,
      faq_agent: `You answer frequently asked questions for ${extraction.business_name || 'this business'}. Use the provided FAQ and knowledge.`,
    };
    for (const roleType of roleTypes) {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .insert({
          organization_id: organizationId,
          name: names[roleType],
          role_type: roleType,
          system_prompt: systemPrompts[roleType],
          model_provider: 'openai',
          model_id: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.7,
          enabled_tools: roleType === 'website_chatbot' ? ['capture_contact_info'] : [],
          widget_enabled: roleType === 'website_chatbot',
          webhook_enabled: false,
          memory_short_term_enabled: true,
          memory_long_term_enabled: false,
          created_by_ai_setup: true,
        })
        .select('id')
        .single();
      if (!agentError && agent) agentIds.push(agent.id);
    }
    result.agentIds = agentIds;
    const mainAgentId = agentIds[0] ?? null;
    if (mainAgentId) {
      const { data: widget } = await supabase
        .from('widgets')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (widget) {
        await supabase.from('widgets').update({ agent_id: mainAgentId }).eq('id', widget.id);
      }
    }

    // 6. Create default automations
    await onStep?.('creating_automations');
    await updateRun({ step: 'creating_automations', result_json: result });
    const automationIds: string[] = [];
    const toEmail = extraction.contact_email ?? null;
    const automationsToCreate: Array<{
      name: string;
      trigger_type: string;
      action_type: string;
      action_config: Record<string, unknown>;
    }> = [
      {
        name: 'New lead – notify',
        trigger_type: 'lead_form_submitted',
        action_type: 'send_email_notification',
        action_config: toEmail ? { to_email: toEmail, subject: 'New lead from website', body: 'Name: {{lead.name}}\nEmail: {{lead.email}}\nMessage: {{lead.message}}' } : {},
      },
      {
        name: 'Quote request – notify',
        trigger_type: 'quote_request_submitted',
        action_type: 'send_email_notification',
        action_config: toEmail ? { to_email: toEmail, subject: 'New quote request', body: 'A visitor requested a quote. Check your dashboard.' } : {},
      },
    ];
    for (const a of automationsToCreate) {
      if (!TRIGGER_TYPES.includes(a.trigger_type as (typeof TRIGGER_TYPES)[number])) continue;
      if (!ACTION_TYPES.includes(a.action_type as (typeof ACTION_TYPES)[number])) continue;
      const { data: auto, error: autoError } = await supabase
        .from('automations')
        .insert({
          organization_id: organizationId,
          name: a.name,
          description: `Created by AI setup`,
          status: 'active',
          trigger_type: a.trigger_type,
          trigger_config: {},
          action_type: a.action_type,
          action_config: a.action_config,
          agent_id: null,
        })
        .select('id')
        .single();
      if (!autoError && auto) automationIds.push(auto.id);
    }
    result.automationIds = automationIds;

    // 7. Widget already has welcome message from business_settings update
    await onStep?.('configuring_widget');
    await updateRun({ step: 'configuring_widget', result_json: result });
    result.widgetConfigured = true;
    result.step = 'done';

    await supabase
      .from('ai_setup_runs')
      .update({
        status: 'completed',
        step: 'done',
        result_json: result as unknown as Record<string, unknown>,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('organization_id', organizationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.error = message;
    result.step = result.step ?? 'scanning_website';
    await supabase
      .from('ai_setup_runs')
      .update({
        status: 'failed',
        error_message: message.slice(0, 500),
        result_json: result as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('organization_id', organizationId);
    throw err;
  }
}
