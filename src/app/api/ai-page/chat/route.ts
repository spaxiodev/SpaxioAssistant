/**
 * AI page chat: send message, get reply, update session state. Public (validated by run_id + org from run).
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildSystemPrompt, buildSystemPromptForAgent, buildLanguageInstruction, type BusinessSettingsContext } from '@/lib/assistant/prompt';
import { getChatCompletion } from '@/lib/ai/provider';
import { getClientIp, isUuid, normalizeUuid, sanitizeText } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { hasActiveSubscription, hasExceededMonthlyMessages } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { recordMessageUsage } from '@/lib/billing/usage';
import { getPageRun, updatePageRunState } from '@/lib/ai-pages/session-service';
import { mergeExtractedIntoState } from '@/lib/ai-pages/intake-service';
import type { SessionState, IntakeFieldSchema, SessionStateEstimate } from '@/lib/ai-pages/types';
import { getPricingContext, runEstimate } from '@/lib/quote-pricing/estimate-quote-service';
import type { Agent } from '@/lib/supabase/database.types';
import { searchKnowledge } from '@/lib/knowledge/search';
import { parseActionFromReply } from '@/lib/widget-actions/parse-action-from-reply';
import { parseAndSanitizeAction } from '@/lib/widget-actions/types';

const MAX_KNOWLEDGE_CONTEXT_CHARS = 4000;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function buildPageTypeInstruction(pageType: string, goal?: string): string {
  const goalLine = goal?.trim() ? `\nGoal: ${goal}` : '';
  switch (pageType) {
    case 'quote':
      return `You are on a dedicated Quote Assistant page. Your job is to gather enough information for an accurate quote or estimate.
- Ask clear, conversational questions about project type, scope, dimensions, materials, urgency, location, budget, and contact details.
- Collect: name, email, phone, project/service type, details, dimensions, location, budget, notes.
- Summarize what you've collected before confirming. When you have enough information, tell the user their request will be submitted for a quote.
- If the user asks for a quote, price, estimate, or devis (in any language), add at the very end of your reply a single line: ACTION: open_quote_form. We will show the quote form. Do not add ACTION: unless the user clearly wants to fill out the quote form.
- If automated pricing is not available or you cannot compute a price in chat, still invite them to use the quote form when it appears, or ask for contact details and a short project summary so the business can follow up.${goalLine}`;
    case 'support':
      return `You are on a dedicated Support Assistant page. Your job is to troubleshoot and capture support issues.
- Ask diagnostic questions. Use any provided knowledge to attempt resolution.
- If unresolved, collect: issue summary, name, email, phone, and details so a ticket can be created.
- Be empathetic and clear. When escalating, summarize the issue.${goalLine}`;
    case 'intake':
    case 'booking':
      return `You are on an Intake/Booking Assistant page. Your job is to qualify and gather information before scheduling or onboarding.
- Ask adaptive intake questions. Collect required business-specific fields and contact info.
- Create a lead/contact and intake summary. Optionally direct the user to booking or follow-up.${goalLine}`;
    default:
      return goalLine ? `Page goal: ${goalLine}` : '';
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawRunId = body.run_id ?? body.runId;
  const rawConversationId = body.conversation_id ?? body.conversationId;
  const message = sanitizeText(body.message, 8000);
  const language = typeof body.language === 'string' ? body.language.slice(0, 16) : 'en';
  const conversationLanguage = language.slice(0, 2).toLowerCase() || 'en';

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400, headers: corsHeaders });
  }

  const runId = normalizeUuid(String(rawRunId));
  if (!isUuid(runId)) {
    return NextResponse.json({ error: 'Invalid run_id' }, { status: 400, headers: corsHeaders });
  }

  const convId = rawConversationId && isUuid(normalizeUuid(String(rawConversationId)))
    ? normalizeUuid(String(rawConversationId))
    : null;

  const key = `ai-page-chat:${runId}:ip:${ip}`;
  const rl = rateLimit({ key, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', reply: 'Please slow down and try again.' },
      { status: 429, headers: corsHeaders }
    );
  }

  const supabase = createAdminClient();

  const { data: runRow } = await supabase
    .from('ai_page_runs')
    .select('id, organization_id, ai_page_id, conversation_id, status, session_state, completion_percent')
    .eq('id', runId)
    .maybeSingle();

  if (!runRow || runRow.status !== 'active') {
    return NextResponse.json({ error: 'Session not found or not active' }, { status: 404, headers: corsHeaders });
  }

  const orgId = runRow.organization_id;
  const pageId = runRow.ai_page_id;
  const runConversationId = runRow.conversation_id ?? null;

  if (convId && convId !== runConversationId) {
    return NextResponse.json({ error: 'Conversation does not match session' }, { status: 400, headers: corsHeaders });
  }

  const effectiveConvId = convId ?? runConversationId;
  if (!effectiveConvId) {
    return NextResponse.json({ error: 'No conversation for this session' }, { status: 400, headers: corsHeaders });
  }

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const allowed = await hasActiveSubscription(supabase, orgId, adminAllowed);
  if (!allowed) {
    return NextResponse.json(
      { error: 'subscription_required', reply: 'This assistant is not available right now.' },
      { status: 403, headers: corsHeaders }
    );
  }

  const messageLimitExceeded = await hasExceededMonthlyMessages(supabase, orgId, adminAllowed);
  if (messageLimitExceeded) {
    return NextResponse.json(
      { error: 'message_limit_reached', reply: "This month's message limit has been reached. Please try again later." },
      { status: 403, headers: corsHeaders }
    );
  }

  const { data: page } = await supabase
    .from('ai_pages')
    .select('id, agent_id, page_type, config')
    .eq('id', pageId)
    .single();

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404, headers: corsHeaders });
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', orgId)
    .single();

  let agent: Agent | null = null;
  if (page.agent_id) {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('*')
      .eq('id', page.agent_id)
      .single();
    agent = agentRow ?? null;
  }

  await supabase.from('messages').insert({
    conversation_id: effectiveConvId,
    role: 'user',
    content: message,
  });

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', effectiveConvId)
    .order('created_at', { ascending: true })
    .limit(30);

  const config = (page.config as { goal?: string }) ?? {};
  const pageInstruction = buildPageTypeInstruction(page.page_type, config.goal);
  const systemContent = agent
    ? buildSystemPromptForAgent(agent, settings as BusinessSettingsContext | null)
    : buildSystemPrompt(settings as BusinessSettingsContext | null);
  const languageInstruction = buildLanguageInstruction({
    activeLocale: language,
    supportedLanguages: ['en', 'fr', 'es', 'de', 'pt', 'it'],
    matchAIResponseToWebsiteLanguage: true,
  });

  let pricingPromptBlock = '';
  let hasQuoteVariables = false;
  if (page.page_type === 'quote') {
    try {
      const pricingContext = await getPricingContext(supabase, { organizationId: orgId, aiPageId: pageId });
      hasQuoteVariables = !!(pricingContext && pricingContext.variables.length > 0);
      if (hasQuoteVariables && pricingContext) {
        const varList = pricingContext.variables
          .map((v) => `- ${v.key}: ${v.label}${v.required ? ' (required)' : ''}${v.unit_label ? ` in ${v.unit_label}` : ''}`)
          .join('\n');
        const serviceList =
          pricingContext.services.length > 0
            ? pricingContext.services.map((s) => `${s.name} (slug: ${s.slug})`).join(', ')
            : 'general';
        pricingPromptBlock = `\n\nPricing rules are configured for this quote page. You must collect the following variables from the user; do not invent or guess prices—the system will calculate the estimate from their answers.\nServices offered: ${serviceList}.\nVariables to collect:\n${varList}\nWhen the user provides these details, the system will show an estimate. Do not make up numbers.`;
      }
    } catch {
      // omit block if load fails
    }
  }

  const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    ...(languageInstruction ? [{ role: 'system' as const, content: languageInstruction }] : []),
    { role: 'system', content: systemContent + pricingPromptBlock },
    ...(pageInstruction ? [{ role: 'system' as const, content: pageInstruction }] : []),
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  try {
    const knowledgeMatches = await searchKnowledge(supabase, {
      organizationId: orgId,
      query: message,
      matchCount: 6,
      preferredLanguage: language,
    });
    if (knowledgeMatches.length > 0) {
      let total = 0;
      const parts: string[] = [];
      for (const m of knowledgeMatches) {
        const snippet = m.content.trim().slice(0, 600);
        if (total + snippet.length + 2 > MAX_KNOWLEDGE_CONTEXT_CHARS) break;
        parts.push(snippet);
        total += snippet.length + 2;
      }
      if (parts.length > 0) {
        const block = `Relevant knowledge:\n\n${parts.join('\n\n')}`;
        messagesForApi.splice(messagesForApi.length - (history?.length ?? 0), 0, { role: 'system', content: block });
      }
    }
  } catch {
    // ignore
  }

  const provider = agent?.model_provider ?? 'openai';
  const modelId = agent?.model_id ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const temperature = agent?.temperature ?? 0.7;

  const result = await getChatCompletion(provider, modelId, messagesForApi, {
    max_tokens: 600,
    temperature,
  });
  const rawReply = result.content || 'Sorry, I could not generate a response.';
  const { cleanReply, action } = parseActionFromReply(rawReply);
  const replyToStore = cleanReply || rawReply;

  await supabase.from('messages').insert({
    conversation_id: effectiveConvId,
    role: 'assistant',
    content: replyToStore,
  });

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString(), conversation_language: conversationLanguage })
    .eq('id', effectiveConvId);

  const currentState = (runRow.session_state as SessionState) ?? {};
  const { data: pageFull } = await supabase.from('ai_pages').select('intake_schema').eq('id', pageId).single();
  const intakeSchema = (pageFull?.intake_schema ?? (page.config as { intake_schema?: IntakeFieldSchema[] })?.intake_schema) as IntakeFieldSchema[] | undefined;
  const schema = Array.isArray(intakeSchema) ? intakeSchema : [];

  if (schema.length > 0 && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const keys = schema.map((f) => f.key).join(', ');
      const extract = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `From the conversation so far, extract the following fields if mentioned. Reply with JSON only: {${keys}}. Use null for missing. Strings for text, number for numbers.`,
          },
          {
            role: 'user',
            content: [...(history ?? []).map((m) => `${m.role}: ${m.content}`), `user: ${message}`, `assistant: ${replyToStore}`].join('\n'),
          },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });
      const raw = extract.choices[0]?.message?.content?.trim();
      if (raw) {
        const extracted = JSON.parse(raw) as Record<string, unknown>;
        let nextState = mergeExtractedIntoState(currentState, extracted, schema);

        // Quote pages: run pricing engine when we have a profile and collected inputs
        if (page.page_type === 'quote') {
          try {
            const pricingContext = await getPricingContext(supabase, {
              organizationId: orgId,
              aiPageId: pageId,
            });
            if (pricingContext && pricingContext.rules.length > 0) {
              const collected = nextState.collected_fields ?? {};
              const serviceSlug = typeof collected.service_slug === 'string' ? collected.service_slug.trim() : null;
              const serviceType = typeof collected.service_type === 'string' ? collected.service_type.trim() : null;
              let serviceId: string | null = nextState.selected_service_id ?? null;
              if (!serviceId && (serviceSlug || serviceType)) {
                const match = pricingContext.services.find(
                  (s) => s.slug === serviceSlug || s.name.toLowerCase() === (serviceType ?? '').toLowerCase()
                );
                serviceId = match?.id ?? (pricingContext.services.length === 1 ? pricingContext.services[0]!.id : null);
              }
              if (!serviceId && pricingContext.services.length === 1) {
                serviceId = pricingContext.services[0]!.id;
              }
              const result = runEstimate({
                inputs: collected,
                context: pricingContext,
                serviceId,
              });
              if (result.applied_rules.length > 0) {
                const estimate: SessionStateEstimate = {
                  subtotal: result.subtotal,
                  total: result.total,
                  estimate_low: result.estimate_low,
                  estimate_high: result.estimate_high,
                  line_items: result.applied_rules.map((r) => ({ rule_name: r.rule_name, amount: r.amount, label: r.label })),
                  confidence: result.confidence,
                  human_review_recommended: result.human_review_recommended,
                  output_mode: result.output_mode,
                };
                nextState = {
                  ...nextState,
                  selected_service_id: serviceId,
                  estimate,
                };
              }
            }
          } catch {
            // non-fatal: continue without estimate
          }
        }

        await updatePageRunState(supabase, runId, {
          session_state: nextState,
          completion_percent: nextState.completion_percent ?? runRow.completion_percent ?? 0,
        });
      }
    } catch {
      // non-fatal
    }
  }

  await recordMessageUsage(supabase, orgId);

  const { data: updatedRun } = await supabase
    .from('ai_page_runs')
    .select('session_state, completion_percent')
    .eq('id', runId)
    .single();

  // Resolve open_quote_form action for quote pages (from parsed reply or classifier fallback)
  let resolvedAction: { type: string; payload?: Record<string, unknown> } | null =
    action ? { type: action.type, payload: action.payload as Record<string, unknown> | undefined } : null;
  if (!resolvedAction && page.page_type === 'quote' && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const actionCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `If the user asked for a quote, price, or estimate (in any language), return { "action": { "type": "open_quote_form" } }. Otherwise return {}. Reply with only the JSON.`,
          },
          { role: 'user', content: `User: ${message}\nAssistant: ${replyToStore}` },
        ],
        max_tokens: 60,
        response_format: { type: 'json_object' },
      });
      const actionRaw = actionCompletion.choices[0]?.message?.content?.trim();
      if (actionRaw) {
        const parsed = JSON.parse(actionRaw) as { action?: unknown };
        const sanitized = parseAndSanitizeAction(parsed.action);
        if (sanitized?.type === 'open_quote_form') resolvedAction = { type: sanitized.type, payload: sanitized.payload };
      }
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json(
    {
      reply: replyToStore,
      conversation_id: effectiveConvId,
      run_id: runId,
      session_state: (updatedRun?.session_state as SessionState) ?? currentState,
      completion_percent: updatedRun?.completion_percent ?? runRow.completion_percent ?? 0,
      ...(resolvedAction?.type === 'open_quote_form' && { action: resolvedAction }),
    },
    { headers: corsHeaders }
  );
}
