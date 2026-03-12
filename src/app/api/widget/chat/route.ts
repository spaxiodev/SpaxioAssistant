import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSystemPrompt, type BusinessSettingsContext } from '@/lib/assistant/prompt';
import { getClientIp, isUuid, normalizeUuid, sanitizeText } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { isOrgAllowedByAdmin } from '@/lib/admin';

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
    .select('id, organization_id')
    .eq('id', widgetId)
    .single();

  if (widgetError || !widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404, headers: corsHeaders });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('organization_id', widget.organization_id)
    .single();

  const status = subscription?.status;
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  let allowed = status === 'active' || (status === 'trialing' && trialEnd && trialEnd > new Date());
  if (!allowed) {
    const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
    if (adminAllowed) allowed = true;
  }
  if (!allowed) {
    return NextResponse.json(
      {
        reply: "Chat is not available right now. Please contact the business directly.",
        error: 'subscription_required',
      },
      { headers: corsHeaders }
    );
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', widget.organization_id)
    .single();

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

  const systemContent = buildSystemPrompt(settings as BusinessSettingsContext | null);

  const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    ...(language
      ? [
          {
            role: 'system' as const,
            content: `The website visitor is currently viewing the site in "${language}". Always respond in this language unless they clearly ask to switch.`,
          },
        ]
      : []),
    { role: 'system', content: systemContent },
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI not configured', reply: 'Assistant is not configured. Please try again later.' },
      { status: 503, headers: corsHeaders }
    );
  }
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messagesForApi,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not generate a response.';

    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: reply,
    });

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

    // Extract quote request from conversation if user asked for a quote
    const fullHistory = [...(history ?? []), { role: 'user' as const, content: message }, { role: 'assistant' as const, content: reply }];
    const transcript = fullHistory.map((m) => `${m.role}: ${m.content}`).join('\n');
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

      const leadCompletion = await openai.chat.completions.create({
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

    return NextResponse.json(
      { conversationId: convId, reply },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('OpenAI error:', err);
    return NextResponse.json(
      { error: 'Failed to get response', reply: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
