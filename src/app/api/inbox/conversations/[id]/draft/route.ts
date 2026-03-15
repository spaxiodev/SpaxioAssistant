/**
 * POST /api/inbox/conversations/[id]/draft
 * Generate AI draft reply. Body: { context?: string }
 * Uses last messages + optional context to generate a suggested reply. Requires canUseAiDraftReplies.
 */
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseInbox, canUseAiDraftReplies } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { conversationBelongsToOrg } from '@/lib/conversation-org';
import { getChatCompletion } from '@/lib/ai/provider';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getUser();
    const organizationId = await getOrganizationId(user ?? undefined);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const conversationId = normalizeUuid(id);
    if (!isUuid(conversationId)) return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseInbox(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Inbox not enabled' }, { status: 403 });
    }
    if (!(await canUseAiDraftReplies(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'AI draft replies not enabled for your plan' }, { status: 403 });
    }
    if (!(await conversationBelongsToOrg(supabase, conversationId, organizationId))) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(30);

    const body = await request.json().catch(() => ({}));
    const extraContext = typeof body.context === 'string' ? body.context.trim().slice(0, 500) : '';

    const thread = (messages ?? []).map((m) => `${m.role}: ${m.content}`).join('\n');
    const systemPrompt = `You are helping a support agent write a reply to a customer in an existing conversation. Generate a single, professional reply that the agent can send as-is or edit. Keep it concise (2-4 short paragraphs max). Do not include greetings like "Hi, I'm the support team" unless the conversation warrants it.${extraContext ? `\n\nAdditional context from the agent: ${extraContext}` : ''}`;
    const userPrompt = `Conversation so far:\n\n${thread}\n\nGenerate a draft reply from the support team:`;

    const result = await getChatCompletion('openai', process.env.OPENAI_MODEL ?? 'gpt-4o-mini', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { max_tokens: 400, temperature: 0.5 });

    const draft = result.content?.trim() ?? '';
    return NextResponse.json({ draft });
  } catch (err) {
    return handleApiError(err, 'inbox/conversations/[id]/draft');
  }
}
