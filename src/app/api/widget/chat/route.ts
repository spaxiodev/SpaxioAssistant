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
import { hasActiveSubscription, hasExceededMonthlyMessages, hasExceededMonthlyAiActions, canUseAiActions } from '@/lib/entitlements';
import { searchKnowledge } from '@/lib/knowledge/search';
import type { Agent } from '@/lib/supabase/database.types';

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

  if (!convId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        widget_id: widgetId,
        visitor_id: null,
        metadata: {},
      })
      .select('id')
      .single();
    convId = newConv?.id ?? null;
  }

  if (!convId) {
    console.error('Failed to create conversation for widget', { widgetIdSample: widgetId.slice(0, 8) });
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: corsHeaders });
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
  const languageInstruction = effectiveLocale && matchAIResponseToWebsiteLanguage
    ? buildLanguageInstruction({
        activeLocale: effectiveLocale,
        supportedLanguages: supportedLanguages?.length ? supportedLanguages : undefined,
        matchAIResponseToWebsiteLanguage,
      })
    : language
      ? `The website visitor is currently viewing the site in "${language}". Always respond in this language unless they clearly ask to switch.`
      : null;

  const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    ...(languageInstruction ? [{ role: 'system' as const, content: languageInstruction }] : []),
    { role: 'system', content: systemContent },
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
    const useTools = Array.isArray(enabledTools) && enabledTools.length > 0;

    if (useTools && provider === 'openai') {
      const aiActionLimitExceeded = await hasExceededMonthlyAiActions(supabase, widget.organization_id, adminAllowed);
      if (aiActionLimitExceeded) {
        const result = await getChatCompletion(provider, modelId, messagesForApi, {
          max_tokens: 500,
          temperature,
        });
        reply = result.content || 'Sorry, I could not generate a response.';
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

    if (agentRunId) {
      await supabase.from('agent_messages').insert({
        agent_run_id: agentRunId,
        role: 'assistant',
        content: reply,
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
      content: reply,
    });

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

    await supabase.from('conversation_events').insert({
      conversation_id: convId,
      event_type: 'ai_replied',
      metadata: {},
    });

    // Extract quote request from conversation if user asked for a quote
    const fullHistory = [...(history ?? []), { role: 'user' as const, content: message }, { role: 'assistant' as const, content: reply }];
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
              await supabase.from('quote_requests').insert({
                organization_id: widget.organization_id,
                conversation_id: convId,
                customer_name: name.slice(0, 500),
                service_type: typeof parsed.service_type === 'string' ? parsed.service_type.slice(0, 500) : null,
                project_details: typeof parsed.project_details === 'string' ? parsed.project_details.slice(0, 2000) : null,
                dimensions_size: typeof parsed.dimensions_size === 'string' ? parsed.dimensions_size.slice(0, 500) : null,
                location: typeof parsed.location === 'string' ? parsed.location.slice(0, 500) : null,
                notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 2000) : null,
                budget_text: typeof parsed.budget_text === 'string' ? parsed.budget_text.slice(0, 500) : null,
                budget_amount: budgetAmount,
              });
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
              await supabase.from('leads').insert({
                organization_id: widget.organization_id,
                conversation_id: convId,
                name: leadName.slice(0, 500),
                email: leadEmail ? leadEmail.slice(0, 500) : 'unknown@example.com',
                phone: leadPhone ? leadPhone.slice(0, 100) : null,
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
              });
            }
          }
        } catch (parseErr) {
          console.warn('Failed to parse lead JSON', { error: (parseErr as Error).message });
        }
      }
    } catch (_) {
      // Non-fatal: lead extraction failed
    }

    await recordMessageUsage(supabase, widget.organization_id);

    return NextResponse.json(
      { conversationId: convId, reply },
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
