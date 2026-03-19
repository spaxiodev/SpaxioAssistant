import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt, buildSystemPromptForAgent, buildLanguageInstruction, type BusinessSettingsContext } from '@/lib/assistant/prompt';
import { getChatCompletion } from '@/lib/ai/provider';
import { buildOpenAIToolsSchema, runChatWithToolsLoop } from '@/lib/ai/chat-with-tools';
import { getClientIp, isUuid, normalizeUuid, sanitizeText } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { recordMessageUsage, recordAiActionUsage } from '@/lib/billing/usage';
import { hasActiveSubscription, hasExceededMonthlyMessages, hasExceededMonthlyAiActions, canUseAiActions, canUseAutomation, canUseToolCalling } from '@/lib/entitlements';
import { searchKnowledge } from '@/lib/knowledge/search';
import type { Agent } from '@/lib/supabase/database.types';
import { parseAndSanitizeAction } from '@/lib/widget-actions/types';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { parseActionFromReply } from '@/lib/widget-actions/parse-action-from-reply';
import { getRelevantMemories, formatMemoriesForPrompt } from '@/lib/ai-memory/retrieve-memory';
import { extractMemoriesFromTranscript, persistMemories } from '@/lib/ai-memory/extract-memory';

/** Max characters of retrieved knowledge to inject into the prompt (avoids token overflow). */
const MAX_KNOWLEDGE_CONTEXT_CHARS = 4000;

/** Map tool id (from registry) to action_key for action_invocations log. */
const TOOL_TO_ACTION_KEY: Record<string, string> = {
  capture_contact_info: 'create_lead',
  handoff_to_human: 'escalate_to_human',
  create_ticket: 'create_ticket',
  send_email: 'send_email',
  call_webhook: 'call_webhook',
  schedule_booking: 'schedule_booking',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  // Normalize "fr-CA" -> "fr"
  const two = v.includes('-') ? v.slice(0, 2) : v;
  const code = two.slice(0, 2);
  return code || null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const rawWidgetId = body.widgetId;
  const rawConversationId = body.conversationId;
  const message = sanitizeText(body.message, 8000);
  const languageRaw = typeof body.language === 'string' ? body.language : null;
  const language = languageRaw ? String(languageRaw).slice(0, 16) : null;
  const detectedLocale = typeof body.detectedLocale === 'string' ? body.detectedLocale.slice(0, 16) : null;
  const activeLocale = typeof body.activeLocale === 'string' ? body.activeLocale.slice(0, 16) : language;
  const supportedLanguages = Array.isArray(body.supportedLanguages)
    ? (body.supportedLanguages as unknown[]).filter((l: unknown): l is string => typeof l === 'string').map((l) => l.slice(0, 8))
    : undefined;
  const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 2048) : undefined;
  const browserLocale = typeof body.browserLocale === 'string' ? body.browserLocale.slice(0, 32) : undefined;
  const manualLanguageOverride = typeof body.manualLanguageOverride === 'string' ? body.manualLanguageOverride.slice(0, 16) : undefined;
  const normalizedIncomingLanguage = normalizeLanguageCode(activeLocale ?? language ?? manualLanguageOverride) ?? 'en';

  if (!rawWidgetId || !message) {
    return NextResponse.json({ error: 'Missing widgetId or message' }, { status: 400, headers: corsHeaders });
  }

  const widgetId = normalizeUuid(String(rawWidgetId));
  if (!isUuid(widgetId)) {
    console.warn('Invalid widgetId in chat route', { ipSample: ip.slice(0, 16), widgetIdSample: String(rawWidgetId).slice(0, 8) });
    return NextResponse.json({ error: 'Invalid widgetId' }, { status: 400, headers: corsHeaders });
  }

  let convId: string | null = null;
  if (rawConversationId && typeof rawConversationId === 'string') {
    const candidate = normalizeUuid(rawConversationId);
    if (isUuid(candidate)) {
      convId = candidate;
    }
  }

  const keyBase = `widget-chat:${widgetId}`;
  const perIpKey = `${keyBase}:ip:${ip}`;

  const perIp = rateLimit({ key: perIpKey, limit: 20, windowMs: 60_000 });
  if (!perIp.allowed) {
    console.warn('Rate limit hit on widget chat route', { ipSample: ip.slice(0, 16) });
    return NextResponse.json(
      {
        error: 'rate_limited',
        reply: 'You are sending messages too quickly. Please slow down and try again.',
      },
      { status: 429, headers: corsHeaders }
    );
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

  // Resolve effective agent when widget is linked to one (backward compat: agent_id can be null)
  let agent: Agent | null = null;
  if (widget.agent_id) {
    const { data: agentRow } = await supabase
      .from('agents')
      .select('*')
      .eq('id', widget.agent_id)
      .single();
    agent = agentRow ?? null;
  }

  const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
  const allowed = await hasActiveSubscription(supabase, widget.organization_id, adminAllowed);
  if (!allowed) {
    return NextResponse.json(
      {
        reply: "Chat is not available right now. Please contact the business directly.",
        error: 'subscription_required',
      },
      { headers: corsHeaders }
    );
  }

  const messageLimitExceeded = await hasExceededMonthlyMessages(supabase, widget.organization_id, adminAllowed);
  if (messageLimitExceeded) {
    const { getPlanForOrg } = await import('@/lib/entitlements');
    const { getNextPlanSlug, normalizePlanSlug } = await import('@/lib/plan-config');
    const plan = await getPlanForOrg(supabase, widget.organization_id);
    const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
    return NextResponse.json(
      {
        reply: "This month's message limit has been reached. Please upgrade your plan or try again next month.",
        error: 'message_limit_reached',
        code: 'PLAN_UPGRADE_REQUIRED',
        currentPlan: currentSlug,
        requiredPlan: getNextPlanSlug(currentSlug),
        feature: 'messages',
      },
      { status: 403, headers: corsHeaders }
    );
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', widget.organization_id)
    .single();

  const matchAIResponseToWebsiteLanguage = (settings as { match_ai_response_to_website_language?: boolean } | null)?.match_ai_response_to_website_language !== false;

  // Ensure conversation, and ensure any reused conversation belongs to this widget
  if (convId) {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, widget_id')
      .eq('id', convId)
      .maybeSingle();

    if (!existingConv || existingConv.widget_id !== widgetId) {
      convId = null;
    }
  }

  let createdNewConversation = false;
  if (!convId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        widget_id: widgetId,
        visitor_id: null,
        metadata: {},
        conversation_language: normalizedIncomingLanguage,
      })
      .select('id')
      .single();
    convId = newConv?.id ?? null;
    createdNewConversation = !!newConv?.id;
  }

  if (!convId) {
    console.error('Failed to create conversation for widget', { widgetIdSample: widgetId.slice(0, 8) });
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: corsHeaders });
  }

  if (createdNewConversation) {
    const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
    const automationsAllowed = await canUseAutomation(supabase, widget.organization_id, adminAllowed);
    if (automationsAllowed) {
      emitAutomationEvent(supabase, {
        organization_id: widget.organization_id,
        event_type: 'conversation_started',
        payload: {
          trigger_type: 'conversation_started',
          conversation_id: convId,
        },
        trace_id: `conversation-${convId}`,
        source: 'widget_chat',
        actor: { type: 'conversation', id: convId },
      }).catch((err) => console.warn('[widget/chat] conversation_started emit failed', err));
    }
  }

  // Simple abuse guard: cap recent messages per conversation
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', convId)
    .gte('created_at', tenMinutesAgo);

  if ((recentCount ?? 0) > 50) {
    console.warn('Message flood detected for conversation', { convIdSample: convId.slice(0, 8) });
    return NextResponse.json(
      {
        error: 'too_many_messages',
        reply: 'There have been too many messages in a short time. Please wait a bit before sending more.',
      },
      { status: 429, headers: corsHeaders }
    );
  }

  await supabase.from('messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
  });

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(30);

  const systemContent =
    agent != null
      ? buildSystemPromptForAgent(agent, settings as BusinessSettingsContext | null)
      : buildSystemPrompt(settings as BusinessSettingsContext | null);

  const effectiveLocale = activeLocale || language;
  const resolvedCustomerLanguage = normalizeLanguageCode(effectiveLocale) ?? normalizedIncomingLanguage;
  const languageInstruction = effectiveLocale && matchAIResponseToWebsiteLanguage
    ? buildLanguageInstruction({
        activeLocale: effectiveLocale,
        supportedLanguages: supportedLanguages?.length ? supportedLanguages : undefined,
        matchAIResponseToWebsiteLanguage,
      })
    : language
      ? `The website visitor is currently viewing the site in "${language}". Always respond in this language unless they clearly ask to switch.`
      : null;

  const widgetActionInstruction = `If the user clearly wants to open a contact form, quote form, booking form, see pricing, scroll to a section, or open a link, you may add at the very end of your reply a single line: ACTION: <type> or ACTION: <type> <json payload>. Allowed types: open_contact_form, open_quote_form, open_booking_form, show_pricing, scroll_to_section, open_link. For scroll_to_section use payload {"section_id":"#id"}. For open_link use {"url":"https://..."}. We will strip this line and trigger the action on the website. Do not add ACTION: unless the user intent clearly matches.
If the user clearly wants a detailed quote, support ticket, or intake/booking form and would benefit from a full-page assistant, you may instead (or in addition) add a single line: HANDOFF: quote or HANDOFF: support or HANDOFF: intake or HANDOFF: booking. We will show a button to continue in the full assistant page. Use HANDOFF only when the task is complex enough for a dedicated page.`;
  const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    ...(languageInstruction ? [{ role: 'system' as const, content: languageInstruction }] : []),
    { role: 'system', content: systemContent },
    { role: 'system', content: widgetActionInstruction },
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // Inject relevant knowledge from crawled/uploaded content (e.g. FAQ page) so the AI can answer from it
  // even when the agent doesn't use the search_knowledge_base tool or the model doesn't call it
  try {
    const knowledgeMatches = await searchKnowledge(supabase, {
      organizationId: widget.organization_id,
      query: message,
      matchCount: 8,
      preferredLanguage: effectiveLocale ?? undefined,
    });
    if (knowledgeMatches.length > 0) {
      const seen = new Set<string>();
      let total = 0;
      const parts: string[] = [];
      for (const m of knowledgeMatches) {
        const key = m.content.slice(0, 80);
        if (seen.has(key) || !m.content.trim()) continue;
        seen.add(key);
        const snippet = m.content.trim().slice(0, 800);
        if (total + snippet.length + 2 > MAX_KNOWLEDGE_CONTEXT_CHARS) break;
        parts.push(snippet);
        total += snippet.length + 2;
      }
      if (parts.length > 0) {
        const knowledgeBlock = `Relevant knowledge from the business website/FAQ (use this to answer the user):\n\n${parts.join('\n\n')}`;
        const insertIdx = languageInstruction ? 2 : 1;
        messagesForApi.splice(insertIdx, 0, { role: 'system', content: knowledgeBlock });
      }
    }
  } catch (knowledgeErr) {
    console.warn('Widget chat: knowledge retrieval failed', { error: (knowledgeErr as Error).message });
  }

  let leadByConv: { id: string } | null = null;
  const { data: leadByConvRow } = await supabase
    .from('leads')
    .select('id')
    .eq('conversation_id', convId)
    .limit(1)
    .maybeSingle();
  leadByConv = leadByConvRow;

  // Inject AI memory for this conversation/lead so the AI has continuity
  try {
    const memories = await getRelevantMemories(supabase, {
      organizationId: widget.organization_id,
      conversationId: convId,
      leadId: leadByConv?.id ?? null,
      visitorId: null,
    });
    if (memories.length > 0) {
      const memoryBlock = formatMemoriesForPrompt(memories);
      const insertIdx = languageInstruction ? 2 : 1;
      messagesForApi.splice(insertIdx, 0, { role: 'system', content: memoryBlock });
    }
  } catch (memoryErr) {
    console.warn('Widget chat: memory retrieval failed', { error: (memoryErr as Error).message });
  }

  const provider = agent?.model_provider ?? 'openai';
  const modelId = agent?.model_id ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const temperature = agent?.temperature ?? 0.7;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && provider === 'openai') {
    return NextResponse.json(
      { error: 'OpenAI not configured', reply: 'Assistant is not configured. Please try again later.' },
      { status: 503, headers: corsHeaders }
    );
  }

  const runStartedAt = new Date();
  let agentRunId: string | null = null;

  try {
    if (agent) {
      const { data: runRow } = await supabase
        .from('agent_runs')
        .insert({
          organization_id: widget.organization_id,
          agent_id: agent.id,
          status: 'running',
          trigger_type: 'chat',
          trigger_metadata: { conversation_id: convId, widget_id: widgetId },
          conversation_id: convId,
          model_used: modelId,
        })
        .select('id')
        .single();
      agentRunId = runRow?.id ?? null;
      if (agentRunId) {
        await supabase.from('agent_messages').insert({
          agent_run_id: agentRunId,
          role: 'user',
          content: message,
        });
      }
    }

    let reply: string;

    const enabledTools = agent?.enabled_tools ?? [];
    const toolCallingAllowed = await canUseToolCalling(supabase, widget.organization_id, adminAllowed);
    const useTools =
      Array.isArray(enabledTools) &&
      enabledTools.length > 0 &&
      toolCallingAllowed &&
      provider === 'openai';

    if (useTools) {
      const aiActionLimitExceeded = await hasExceededMonthlyAiActions(supabase, widget.organization_id, adminAllowed);
      if (aiActionLimitExceeded) {
        const { getPlanForOrg } = await import('@/lib/entitlements');
        const { getNextPlanSlug, normalizePlanSlug } = await import('@/lib/plan-config');
        const plan = await getPlanForOrg(supabase, widget.organization_id);
        const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
        return NextResponse.json(
          {
            reply: "This month's AI action limit has been reached. Please upgrade your plan or try again next month.",
            error: 'ai_action_limit_reached',
            code: 'usage_limit',
            feature: 'ai_actions',
            reason: 'limit_reached',
            current_plan: currentSlug,
            recommended_plan: getNextPlanSlug(currentSlug),
            message: "You've used your AI actions for this month. Upgrade to get more.",
          },
          { status: 403, headers: corsHeaders }
        );
      } else {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const toolsSchema = buildOpenAIToolsSchema(enabledTools);
        const toolContext = {
          organizationId: widget.organization_id,
          supabase,
          conversationId: convId,
          agentId: agent?.id ?? null,
          widgetId,
        };
        const messagesParam = messagesForApi.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const logActionInvocations = await canUseAiActions(supabase, widget.organization_id, adminAllowed);
        reply = await runChatWithToolsLoop({
          openai,
          modelId,
          messages: messagesParam,
          tools: toolsSchema,
          toolContext,
          maxTokens: 500,
          temperature,
          onToolRun: () => recordAiActionUsage(supabase, widget.organization_id),
          onBeforeToolExecute: logActionInvocations
            ? async (toolName, input) => {
                const actionKey = TOOL_TO_ACTION_KEY[toolName] ?? toolName;
                const { data: row } = await supabase
                  .from('action_invocations')
                  .insert({
                    organization_id: widget.organization_id,
                    agent_id: agent?.id ?? null,
                    conversation_id: convId,
                    message_id: null,
                    action_key: actionKey,
                    input_json: input,
                    status: 'pending',
                    initiated_by_type: 'ai',
                    initiated_by_user_id: null,
                    started_at: new Date().toISOString(),
                  })
                  .select('id')
                  .single();
                return row?.id ?? null;
              }
            : undefined,
          onToolInvocation: async (params) => {
            if (params.invocationId) {
              const outputJson =
                typeof params.output === 'object' && params.output !== null
                  ? params.output
                  : { value: String(params.output) };
              await supabase
                .from('action_invocations')
                .update({
                  status: params.status,
                  output_json: outputJson as Record<string, unknown>,
                  error_text: params.status === 'failed' ? String((params.output as { error?: string })?.error ?? 'Failed') : null,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', params.invocationId);
            }
            if (agentRunId) {
              const outputJson =
                typeof params.output === 'object' && params.output !== null
                  ? params.output
                  : { value: String(params.output) };
              await supabase.from('agent_tool_invocations').insert({
                agent_run_id: agentRunId,
                tool_name: params.toolName,
                input_json: params.input,
                output_json: outputJson as Record<string, unknown>,
                status: params.status,
              });
            }
          },
        });
      }
    } else {
      const result = await getChatCompletion(provider, modelId, messagesForApi, {
        max_tokens: 500,
        temperature,
      });
      reply = result.content || 'Sorry, I could not generate a response.';
    }

    const { cleanReply, action, handoffType } = parseActionFromReply(reply);
    const replyToStore = cleanReply;

    if (agentRunId) {
      await supabase.from('agent_messages').insert({
        agent_run_id: agentRunId,
        role: 'assistant',
        content: replyToStore,
      });
      const completedAt = new Date();
      const durationMs = Math.round(completedAt.getTime() - runStartedAt.getTime());
      await supabase
        .from('agent_runs')
        .update({
          status: 'success',
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', agentRunId);
    }

    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: replyToStore,
    });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString(), conversation_language: resolvedCustomerLanguage })
      .eq('id', convId);

    await supabase.from('conversation_events').insert({
      conversation_id: convId,
      event_type: 'ai_replied',
      metadata: {},
    });

    // AI memory extraction (fire-and-forget): store reusable memory from this conversation
    const fullHistory = [...(history ?? []), { role: 'user' as const, content: message }, { role: 'assistant' as const, content: replyToStore }];
    const transcriptForMemory = fullHistory.map((m) => `${m.role}: ${m.content}`).join('\n').slice(0, 6000);
    const leadIdForMemory = leadByConv?.id ?? null;
    if (process.env.OPENAI_API_KEY && transcriptForMemory.length > 100) {
      extractMemoriesFromTranscript(transcriptForMemory)
        .then(async (extracted) => {
          if (extracted.length === 0) return;
          await persistMemories(supabase, {
            organizationId: widget.organization_id,
            subjectType: 'conversation',
            subjectId: convId,
            sourceConversationId: convId,
            sourceMessageIds: null,
            memories: extracted,
          });
          if (leadIdForMemory) {
            await persistMemories(supabase, {
              organizationId: widget.organization_id,
              subjectType: 'lead',
              subjectId: leadIdForMemory,
              sourceConversationId: convId,
              sourceMessageIds: null,
              memories: extracted,
            });
          }
        })
        .catch((err) => console.warn('[widget/chat] memory extraction failed', err));
    }

    // Extract quote request from conversation if user asked for a quote
    const transcript = fullHistory.map((m) => `${m.role}: ${m.content}`).join('\n');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    try {
      const extractCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You extract quote requests from chat transcripts. If the user has requested a quote or estimate and provided at least a name (or said "I'm X" / "my name is X"), return a JSON object with: customer_name (required, string), service_type, project_details, dimensions_size, location, notes (all optional strings), budget_text (optional string - exact phrase user said about budget e.g. "around $500"), budget_amount (optional number - numeric value only, e.g. 500 for "$500" or "500 dollars", 1000 for "1k"). If there is no clear quote request or no name, return {"customer_name":""}. Reply with only the JSON, no other text.`,
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });
      const raw = extractCompletion.choices[0]?.message?.content?.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            customer_name?: string;
            service_type?: string;
            project_details?: string;
            dimensions_size?: string;
            location?: string;
            notes?: string;
            budget_text?: string;
            budget_amount?: number;
          };
          const name = typeof parsed.customer_name === 'string' ? parsed.customer_name.trim() : '';
          if (name) {
            const { data: existing } = await supabase
              .from('quote_requests')
              .select('id')
              .eq('conversation_id', convId)
              .limit(1)
              .maybeSingle();
            if (!existing) {
              const budgetAmount =
                typeof parsed.budget_amount === 'number' && Number.isFinite(parsed.budget_amount)
                  ? parsed.budget_amount
                  : null;
              const { data: newQuote } = await supabase.from('quote_requests').insert({
                organization_id: widget.organization_id,
                conversation_id: convId,
                customer_name: name.slice(0, 500),
                customer_language: resolvedCustomerLanguage,
                service_type: typeof parsed.service_type === 'string' ? parsed.service_type.slice(0, 500) : null,
                project_details: typeof parsed.project_details === 'string' ? parsed.project_details.slice(0, 2000) : null,
                dimensions_size: typeof parsed.dimensions_size === 'string' ? parsed.dimensions_size.slice(0, 500) : null,
                location: typeof parsed.location === 'string' ? parsed.location.slice(0, 500) : null,
                notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 2000) : null,
                budget_text: typeof parsed.budget_text === 'string' ? parsed.budget_text.slice(0, 500) : null,
                budget_amount: budgetAmount,
              }).select('id').single();
              if (newQuote?.id) {
                const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
                const automationsAllowed = await canUseAutomation(supabase, widget.organization_id, adminAllowed);
                if (automationsAllowed) {
                  emitAutomationEvent(supabase, {
                    organization_id: widget.organization_id,
                    event_type: 'quote_request_submitted',
                    payload: {
                      trigger_type: 'quote_request_submitted',
                      conversation_id: convId,
                      quote_request_id: newQuote.id,
                      customer_name: name,
                      customer_language: resolvedCustomerLanguage,
                      service_type: parsed.service_type ?? undefined,
                      project_details: parsed.project_details ?? undefined,
                    },
                    trace_id: `quote-${newQuote.id}`,
                    source: 'widget_chat',
                    actor: { type: 'quote_request', id: newQuote.id },
                  }).catch((err) => console.warn('[widget/chat] quote_request_submitted emit failed', err));
                }
              }
            }
          }
        } catch (parseErr) {
          console.warn('Failed to parse quote request JSON', { error: (parseErr as Error).message });
        }
      }
    } catch (_) {
      // Non-fatal: quote extraction failed
    }

    // Extract general lead details when there is purchase / booking / quote intent or contact info shared
    try {
      const leadTranscriptSnippet = fullHistory
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
        .slice(0, 4000);

      const openaiLead = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const leadCompletion = await openaiLead.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You extract sales leads from chat transcripts for a service business. If the user has clear intent to purchase, book, request pricing, or get a quote, and has provided at least (a) name and (b) email OR phone, return a JSON object with: name (required string), email, phone, requested_service, message, requested_timeline (when they need it / deadline e.g. "next month"), project_details (what they want done), location (address or area). All except name are optional strings. If you are not confident there is a real lead with contact details, return {"name":""}. Reply with only the JSON, no other text.',
          },
          { role: 'user', content: leadTranscriptSnippet },
        ],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const rawLead = leadCompletion.choices[0]?.message?.content?.trim();
      if (rawLead) {
        try {
          const parsedLead = JSON.parse(rawLead) as {
            name?: string;
            email?: string;
            phone?: string;
            requested_service?: string;
            message?: string;
            requested_timeline?: string;
            project_details?: string;
            location?: string;
          };

          const leadName = typeof parsedLead.name === 'string' ? parsedLead.name.trim() : '';
          const leadEmail = typeof parsedLead.email === 'string' ? parsedLead.email.trim() : '';
          const leadPhone = typeof parsedLead.phone === 'string' ? parsedLead.phone.trim() : '';

          if (leadName && (leadEmail || leadPhone)) {
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id')
              .eq('conversation_id', convId)
              .limit(1)
              .maybeSingle();

            if (!existingLead) {
              const transcriptSnippet = leadTranscriptSnippet.slice(0, 1000);
              const { data: newLead } = await supabase
                .from('leads')
                .insert({
                  organization_id: widget.organization_id,
                  conversation_id: convId,
                  name: leadName.slice(0, 500),
                  email: leadEmail ? leadEmail.slice(0, 500) : 'unknown@example.com',
                  phone: leadPhone ? leadPhone.slice(0, 100) : null,
                  customer_language: resolvedCustomerLanguage,
                  requested_service:
                    typeof parsedLead.requested_service === 'string'
                      ? parsedLead.requested_service.slice(0, 500)
                      : null,
                  message:
                    typeof parsedLead.message === 'string' ? parsedLead.message.slice(0, 2000) : null,
                  requested_timeline:
                    typeof parsedLead.requested_timeline === 'string'
                      ? parsedLead.requested_timeline.slice(0, 500)
                      : null,
                  project_details:
                    typeof parsedLead.project_details === 'string'
                      ? parsedLead.project_details.slice(0, 2000)
                      : null,
                  location:
                    typeof parsedLead.location === 'string' ? parsedLead.location.slice(0, 500) : null,
                  transcript_snippet: transcriptSnippet,
                })
                .select('id')
                .single();
              if (newLead?.id && process.env.OPENAI_API_KEY) {
                const { qualifyLeadWithAi, updateLeadWithQualification, maybeCreateDealForHighPriorityLead } = await import('@/lib/lead-qualification/qualify');
                qualifyLeadWithAi({
                  name: leadName,
                  email: leadEmail || '',
                  phone: leadPhone || null,
                  message: parsedLead.message ?? null,
                  requested_service: parsedLead.requested_service ?? null,
                  requested_timeline: parsedLead.requested_timeline ?? null,
                  project_details: parsedLead.project_details ?? null,
                  location: parsedLead.location ?? null,
                  transcript_snippet: transcriptSnippet || null,
                })
                  .then(async (result) => {
                    await updateLeadWithQualification(supabase, newLead.id, widget.organization_id, result);
                    if (result.priority === 'high') {
                      maybeCreateDealForHighPriorityLead(
                        supabase,
                        widget.organization_id,
                        { name: leadName, email: leadEmail || '', phone: leadPhone || null },
                        result
                      ).catch((err) => console.warn('[widget/chat] deal creation failed', err));
                    }
                  })
                  .catch((err) => console.warn('[widget/chat] lead qualification failed', err));
              }
            }
          }
        } catch (parseErr) {
          console.warn('Failed to parse lead JSON', { error: (parseErr as Error).message });
        }
      }
    } catch (_) {
      // Non-fatal: lead extraction failed
    }

    // Use action from parsed reply line (ACTION: type); else optionally infer from separate call
    let resolvedAction: { type: string; payload?: Record<string, unknown> } | null = action
      ? { type: action.type, payload: action.payload as Record<string, unknown> | undefined }
      : null;
    if (!resolvedAction) {
      try {
        const actionCompletion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You decide if the assistant's reply should trigger a website action. Allowed types: open_contact_form, open_quote_form, open_booking_form, show_pricing, scroll_to_section, open_link. For open_link return payload: { url: "https://..." }. For scroll_to_section return payload: { section_id: "id" }. If the user asked for a quote and the assistant agreed to show the form, return { "action": { "type": "open_quote_form" } }. If no action, return {}. Reply with only the JSON.`,
            },
            { role: 'user', content: `User: ${message}\nAssistant: ${replyToStore}` },
          ],
          max_tokens: 100,
          response_format: { type: 'json_object' },
        });
        const actionRaw = actionCompletion.choices[0]?.message?.content?.trim();
        if (actionRaw) {
          const parsed = JSON.parse(actionRaw) as { action?: unknown };
          const sanitized = parseAndSanitizeAction(parsed.action);
          if (sanitized) resolvedAction = { type: sanitized.type, payload: sanitized.payload };
        }
      } catch (_) {
        // Non-fatal
      }
    }

    await recordMessageUsage(supabase, widget.organization_id);

    let pageHandoff: { handoff_type: string; target_page_slug: string; target_page_type: string; button_label: string; intro_message?: string; context_token?: string } | null = null;
    if (handoffType) {
      const { getPublishedPageSlugByType } = await import('@/lib/ai-pages/config-service');
      const { buildPageHandoffPayload } = await import('@/lib/ai-pages/handoff-service');
      const targetSlug = await getPublishedPageSlugByType(supabase, widget.organization_id, handoffType);
      if (targetSlug) {
        const payload = await buildPageHandoffPayload(supabase, {
          organizationId: widget.organization_id,
          targetSlug,
          targetPageType: handoffType,
          conversationId: convId,
          contextSnippet: { last_user_message: message.slice(0, 500) },
        });
        if (payload) pageHandoff = payload;
      }
    }

    return NextResponse.json(
      {
        conversationId: convId,
        reply: replyToStore,
        ...(resolvedAction && { action: resolvedAction }),
        ...(pageHandoff && { page_handoff: pageHandoff }),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    if (agentRunId) {
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (err instanceof Error ? err.message : 'Unknown error').slice(0, 500),
        })
        .eq('id', agentRunId);
    }
    console.error('OpenAI error:', err);
    return NextResponse.json(
      { error: 'Failed to get response', reply: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
