import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { sanitizeText } from '@/lib/validation';
import { getChatCompletion } from '@/lib/ai/provider';
import { buildAISetupSystemPrompt } from '@/lib/ai-setup/prompt';
import { mergePlannerConfig } from '@/lib/ai-setup/planner';
import { extractJsonBlock, stripJsonBlockFromMessage } from '@/lib/ai-setup/parse-json-block';
import type { AssistantPlannerConfig } from '@/lib/ai-setup/types';
import { DEFAULT_PLANNER_CONFIG } from '@/lib/ai-setup/types';

type Params = { params: Promise<{ id: string }> };

/** POST /api/ai-setup/sessions/[id]/chat – send user message, get AI reply, update planner */
export async function POST(request: Request, { params }: Params) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;
    const { id: sessionId } = await params;

    const rl = rateLimit({ key: `ai-setup-chat:${orgId}`, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please wait a moment.', code: 'rate_limit' }, { status: 429 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('ai_setup_sessions')
      .select('id, planner_config, status')
      .eq('id', sessionId)
      .eq('organization_id', orgId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'published') {
      return NextResponse.json({ error: 'Cannot add messages to a published session' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const content = sanitizeText(body.content ?? body.message, 4000);
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    /** When client ran quick-setup-from-website first, we get pre-merged draft and context */
    const quickSetup = body.quick_setup_result as {
      draft?: AssistantPlannerConfig;
      applied?: string[];
      analysis?: { business_name?: string | null; services_count?: number; faq_count?: number };
    } | undefined;
    const hasQuickSetup = quickSetup?.draft && Array.isArray(quickSetup?.applied);

    const logoUrl =
      typeof body.logo_url === 'string' && body.logo_url.trim().length > 0
        ? body.logo_url.trim().slice(0, 2000)
        : null;

    // Append user message
    const { error: insertUserError } = await supabase.from('ai_setup_messages').insert({
      session_id: sessionId,
      role: 'user',
      content,
    });
    if (insertUserError) {
      console.error('[API] ai-setup chat insert user message', insertUserError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    const currentConfig: AssistantPlannerConfig = {
      ...DEFAULT_PLANNER_CONFIG,
      ...(typeof session.planner_config === 'object' && session.planner_config !== null ? session.planner_config : {}),
    };

    if (logoUrl) {
      currentConfig.widget_config = {
        ...currentConfig.widget_config,
        widgetLogoUrl: logoUrl,
      };
    }

    const systemPrompt = buildAISetupSystemPrompt(currentConfig, {
      quickSetupApplied: hasQuickSetup,
    });

    const { data: history } = await supabase
      .from('ai_setup_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const userContent =
      logoUrl && content
        ? `${content}\n\n[User attached a widget logo; use this URL for the chat widget bubble: ${logoUrl}]`
        : content;

    const openAiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...(history ?? [])
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content || '' })),
      { role: 'user', content: userContent },
    ];

    let assistantContent: string;
    try {
      const result = await getChatCompletion('openai', 'gpt-4o-mini', openAiMessages, {
        max_tokens: 1024,
        temperature: 0.5,
      });
      assistantContent = result.content || 'I’m sorry, I couldn’t generate a response. Please try again.';
    } catch (err) {
      console.error('[API] ai-setup chat completion', err);
      assistantContent = 'Something went wrong while generating a response. Please try again.';
    }

    const jsonUpdate = extractJsonBlock(assistantContent);
    let nextConfig: AssistantPlannerConfig = currentConfig;
    if (jsonUpdate) {
      const merged = mergePlannerConfig(currentConfig, jsonUpdate);
      if (merged) nextConfig = merged;
    }

    const { error: insertAssistantError } = await supabase.from('ai_setup_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
    });
    if (insertAssistantError) {
      console.error('[API] ai-setup chat insert assistant message', insertAssistantError);
    }

    const { error: updateError } = await supabase
      .from('ai_setup_sessions')
      .update({
        planner_config: nextConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('organization_id', orgId);

    if (updateError) {
      console.error('[API] ai-setup chat update session', updateError);
    }

    return NextResponse.json({
      message: {
        role: 'assistant',
        content: assistantContent,
      },
      planner_config: nextConfig,
      display_message: stripJsonBlockFromMessage(assistantContent) || assistantContent,
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/sessions/[id]/chat/POST');
  }
}
