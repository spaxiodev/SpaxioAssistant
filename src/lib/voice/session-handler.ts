/**
 * Server-side voice session lifecycle. Used by browser widget API and (future) Twilio/Vapi webhooks.
 * All providers persist to voice_sessions + voice_transcripts + messages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getChatCompletion } from '@/lib/ai/provider';
import { buildSystemPrompt, buildSystemPromptForAgent, type BusinessSettingsContext } from '@/lib/assistant/prompt';
import type { Agent } from '@/lib/supabase/database.types';
import type { VoiceSessionStartResult, VoiceTurnResult } from './types';

export type StartVoiceSessionParams = {
  supabase: SupabaseClient;
  widgetId: string;
  organizationId: string;
  agentId: string | null;
  agent: Agent | null;
  businessSettings: BusinessSettingsContext | null;
  voiceSettings: { greeting_text?: string | null } | null;
};

export async function startVoiceSession(params: StartVoiceSessionParams): Promise<VoiceSessionStartResult | null> {
  const { supabase, widgetId, organizationId, agentId, agent, businessSettings, voiceSettings } = params;

  const { data: newConv } = await supabase
    .from('conversations')
    .insert({
      widget_id: widgetId,
      visitor_id: null,
      channel_type: 'voice_browser',
      status: 'open',
      metadata: {},
    })
    .select('id')
    .single();

  if (!newConv?.id) return null;

  const { data: session } = await supabase
    .from('voice_sessions')
    .insert({
      organization_id: organizationId,
      conversation_id: newConv.id,
      agent_id: agentId,
      widget_id: widgetId,
      source_type: 'browser',
      status: 'active',
    })
    .select('id')
    .single();

  if (!session?.id) return null;

  await supabase.from('conversation_events').insert({
    conversation_id: newConv.id,
    event_type: 'voice_call_started',
    metadata: { voice_session_id: session.id },
  });

  const greeting = voiceSettings?.greeting_text?.trim() || undefined;
  if (greeting) {
    await supabase.from('voice_transcripts').insert({
      voice_session_id: session.id,
      speaker_type: 'ai',
      text: greeting,
    });
    await supabase.from('messages').insert({
      conversation_id: newConv.id,
      role: 'assistant',
      content: greeting,
    });
  }

  return {
    sessionId: session.id,
    conversationId: newConv.id,
    greeting: greeting || undefined,
  };
}

export type HandleVoiceTurnParams = {
  supabase: SupabaseClient;
  sessionId: string;
  userText: string;
  agent: Agent | null;
  businessSettings: BusinessSettingsContext | null;
};

export async function handleVoiceTurn(params: HandleVoiceTurnParams): Promise<VoiceTurnResult | null> {
  const { supabase, sessionId, userText, agent, businessSettings } = params;
  const text = userText.trim();
  if (!text) return { assistantText: '' };

  const { data: session } = await supabase
    .from('voice_sessions')
    .select('id, conversation_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || (session as { status: string }).status !== 'active') {
    return null;
  }

  const conversationId = (session as { conversation_id: string }).conversation_id;

  await supabase.from('voice_transcripts').insert({
    voice_session_id: sessionId,
    speaker_type: 'user',
    text,
  });
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: text,
  });

  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(30);

  const systemContent = agent
    ? buildSystemPromptForAgent(agent, businessSettings)
    : buildSystemPrompt(businessSettings);

  const messagesForApi = [
    { role: 'system' as const, content: systemContent },
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const provider = agent?.model_provider ?? 'openai';
  const modelId = agent?.model_id ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const temperature = agent?.temperature ?? 0.7;

  const result = await getChatCompletion(provider, modelId, messagesForApi, {
    max_tokens: 500,
    temperature,
  });
  const assistantText = result.content?.trim() || '';

  if (assistantText) {
    await supabase.from('voice_transcripts').insert({
      voice_session_id: sessionId,
      speaker_type: 'ai',
      text: assistantText,
    });
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
    });
  }

  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

  return { assistantText };
}

export type EndVoiceSessionParams = {
  supabase: SupabaseClient;
  sessionId: string;
  generateSummary?: boolean;
};

export async function endVoiceSession(params: EndVoiceSessionParams): Promise<{
  durationSeconds: number;
  transcriptSummary?: string;
} | null> {
  const { supabase, sessionId, generateSummary = true } = params;

  const { data: session } = await supabase
    .from('voice_sessions')
    .select('id, started_at, conversation_id')
    .eq('id', sessionId)
    .single();

  if (!session) return null;

  const startedAt = new Date((session as { started_at: string }).started_at);
  const endedAt = new Date();
  const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

  let transcriptSummary: string | undefined;

  if (generateSummary) {
    const { data: segments } = await supabase
      .from('voice_transcripts')
      .select('speaker_type, text')
      .eq('voice_session_id', sessionId)
      .order('timestamp', { ascending: true });

    const parts = (segments ?? []).map(
      (s) => `${(s as { speaker_type: string }).speaker_type}: ${(s as { text: string }).text}`
    );
    const transcript = parts.join('\n');

    if (transcript.length > 50) {
      try {
        const { getChatCompletion } = await import('@/lib/ai/provider');
        const result = await getChatCompletion('openai', process.env.OPENAI_MODEL ?? 'gpt-4o-mini', [
          {
            role: 'system',
            content:
              'You are summarizing a voice conversation. Output a short paragraph (2-4 sentences) capturing the main topic, outcome, and any follow-up needed. Be concise.',
          },
          { role: 'user', content: `Conversation transcript:\n\n${transcript.slice(0, 12000)}` },
        ], { max_tokens: 200 });
        transcriptSummary = result.content?.trim() || undefined;
      } catch {
        transcriptSummary = undefined;
      }
    }
  }

  await supabase
    .from('voice_sessions')
    .update({
      status: 'ended',
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
      transcript_summary: transcriptSummary ?? null,
      updated_at: endedAt.toISOString(),
    })
    .eq('id', sessionId);

  await supabase.from('conversation_events').insert({
    conversation_id: (session as { conversation_id: string }).conversation_id,
    event_type: 'voice_call_ended',
    metadata: { voice_session_id: sessionId, duration_seconds: durationSeconds },
  });

  return { durationSeconds, transcriptSummary };
}
