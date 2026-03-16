/**
 * Server-side: extract reusable memory from a conversation (summary, preferences, context).
 * Call after conversation milestones: end of conversation, lead form, quote request, every N messages.
 */

import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedMemory, AiMemorySubjectType, AiMemoryType } from './types';

const SYSTEM_PROMPT = `You extract durable, business-relevant memory from a chat transcript. Focus on facts that should be remembered for future conversations with this visitor/customer.

Return a JSON array of memory items. Each item: { "memory_type": "conversation_summary"|"customer_preference"|"sales_context"|"support_history"|"business_interaction", "title": "short title or null", "summary": "1-3 sentence summary", "structured_facts": {}, "confidence": 0.0-1.0 }.

Guidelines:
- conversation_summary: what was discussed and outcome.
- customer_preference: how they want to be contacted, language, product interest.
- sales_context: budget, timeline, project type, buying intent.
- support_history: issue reported, resolution if any.
- business_interaction: recurring preferences, past outcomes.

Do not store trivial chatter. Confidence should reflect how clear the fact is. Reply with only the JSON array, no markdown.`;

const MEMORY_TYPES: AiMemoryType[] = [
  'conversation_summary',
  'customer_preference',
  'sales_context',
  'support_history',
  'business_interaction',
];

function parseMemories(arr: unknown[]): ExtractedMemory[] {
  if (!Array.isArray(arr)) return [];
  const out: ExtractedMemory[] = [];
  for (const raw of arr.slice(0, 5)) {
    const item = raw as Record<string, unknown>;
    if (!item || typeof item.summary !== 'string') continue;
    const memoryType = MEMORY_TYPES.includes(item.memory_type as AiMemoryType) ? (item.memory_type as AiMemoryType) : 'conversation_summary';
    const confidence = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.8;
    out.push({
      memory_type: memoryType,
      title: typeof item.title === 'string' ? item.title.slice(0, 200) : null,
      summary: item.summary.slice(0, 1500),
      structured_facts: typeof item.structured_facts === 'object' && item.structured_facts !== null ? (item.structured_facts as Record<string, unknown>) : undefined,
      confidence,
    });
  }
  return out;
}

export async function extractMemoriesFromTranscript(
  transcript: string,
  openaiApiKey?: string
): Promise<ExtractedMemory[]> {
  const key = openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!key?.trim()) return [];

  const openai = new OpenAI({ apiKey: key });
  const content = transcript.slice(0, 6000);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: content || 'No transcript.' },
    ],
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const arr = Array.isArray(obj)
      ? obj
      : Array.isArray(obj?.memories)
        ? obj.memories
        : Array.isArray(obj?.items)
          ? obj.items
          : [];
    return parseMemories(arr as ExtractedMemory[]);
  } catch {
    return [];
  }
}

export async function persistMemories(
  supabase: SupabaseClient,
  options: {
    organizationId: string;
    subjectType: AiMemorySubjectType;
    subjectId: string;
    sourceConversationId: string | null;
    sourceMessageIds: string[] | null;
    memories: ExtractedMemory[];
  }
): Promise<void> {
  const { organizationId, subjectType, subjectId, sourceConversationId, sourceMessageIds, memories } = options;
  if (memories.length === 0) return;

  for (const m of memories) {
    await supabase.from('ai_memories').insert({
      organization_id: organizationId,
      subject_type: subjectType,
      subject_id: subjectId,
      memory_type: m.memory_type,
      title: m.title,
      summary: m.summary,
      structured_facts: m.structured_facts ?? {},
      confidence: m.confidence,
      source_conversation_id: sourceConversationId,
      source_message_ids: sourceMessageIds,
      status: 'active',
    });
  }
}
