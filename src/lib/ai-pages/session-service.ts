/**
 * AI Page session (run) and conversation lifecycle.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionState } from './types';

export async function createPageRun(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    aiPageId: string;
    handoffConversationId?: string | null;
    customerLanguage?: string | null;
  }
): Promise<{ runId: string; conversationId: string } | null> {
  let conversationId: string | null = params.handoffConversationId ?? null;
  const conversationLanguage =
    typeof params.customerLanguage === 'string' ? params.customerLanguage.slice(0, 2).toLowerCase() || null : null;

  if (!conversationId) {
    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        widget_id: null,
        ai_page_id: params.aiPageId,
        visitor_id: null,
        metadata: {},
        conversation_language: conversationLanguage,
      })
      .select('id')
      .single();
    conversationId = conv?.id ?? null;
  } else {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, widget_id, ai_page_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!existing) conversationId = null;
    else {
      const widgetId = existing.widget_id ?? null;
      const alreadyPage = existing.ai_page_id != null;
      if (alreadyPage && existing.ai_page_id === params.aiPageId) {
        // already linked to this page
      } else if (widgetId) {
        const { data: widget } = await supabase
          .from('widgets')
          .select('organization_id')
          .eq('id', widgetId)
          .maybeSingle();
        if (widget?.organization_id !== params.organizationId) conversationId = null;
        else {
          await supabase
            .from('conversations')
            .update({ ai_page_id: params.aiPageId, widget_id: null })
            .eq('id', conversationId);
        }
      }
    }
  }

  if (!conversationId) return null;

  if (conversationLanguage) {
    // Keep conversation_language in sync with the visitor language used to start the session.
    await supabase.from('conversations').update({ conversation_language: conversationLanguage }).eq('id', conversationId);
  }

  const { data: run, error } = await supabase
    .from('ai_page_runs')
    .insert({
      organization_id: params.organizationId,
      ai_page_id: params.aiPageId,
      conversation_id: conversationId,
      status: 'active',
      session_state: {},
      completion_percent: 0,
    })
    .select('id')
    .single();

  if (error || !run) return null;
  return { runId: run.id, conversationId };
}

export async function getPageRun(
  supabase: SupabaseClient,
  runId: string,
  organizationId: string
): Promise<{ runId: string; conversationId: string | null; sessionState: SessionState } | null> {
  const { data, error } = await supabase
    .from('ai_page_runs')
    .select('id, conversation_id, session_state')
    .eq('id', runId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    runId: data.id,
    conversationId: data.conversation_id ?? null,
    sessionState: (data.session_state as SessionState) ?? {},
  };
}

export async function getPageRunByConversation(
  supabase: SupabaseClient,
  conversationId: string,
  aiPageId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('ai_page_runs')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('ai_page_id', aiPageId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function updatePageRunState(
  supabase: SupabaseClient,
  runId: string,
  updates: {
    session_state?: SessionState;
    completion_percent?: number;
    summary?: string | null;
    status?: 'active' | 'completed' | 'abandoned';
    lead_id?: string | null;
    contact_id?: string | null;
    quote_request_id?: string | null;
    support_ticket_id?: string | null;
  }
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.status === 'completed' || updates.status === 'abandoned') {
    payload.completed_at = new Date().toISOString();
  }
  await supabase.from('ai_page_runs').update(payload).eq('id', runId);
}
