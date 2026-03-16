/**
 * Retrieve relevant memories for a conversation/lead/contact to inject into chat context.
 * Only active, sufficiently confident memories; cap total size to avoid prompt overflow.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_MEMORIES = 10;
const MAX_TOTAL_CHARS = 2500;
const MIN_CONFIDENCE = 0.5;

export interface MemoryForContext {
  id: string;
  memory_type: string;
  title: string | null;
  summary: string;
  confidence: number;
}

export async function getRelevantMemories(
  supabase: SupabaseClient,
  options: {
    organizationId: string;
    conversationId?: string | null;
    leadId?: string | null;
    contactId?: string | null;
    visitorId?: string | null;
  }
): Promise<MemoryForContext[]> {
  const { organizationId, conversationId, leadId, contactId, visitorId } = options;

  const conditions: { subject_type: string; subject_id: string }[] = [];
  if (conversationId) conditions.push({ subject_type: 'conversation', subject_id: conversationId });
  if (leadId) conditions.push({ subject_type: 'lead', subject_id: leadId });
  if (contactId) conditions.push({ subject_type: 'contact', subject_id: contactId });
  if (visitorId) conditions.push({ subject_type: 'visitor', subject_id: visitorId });

  if (conditions.length === 0) return [];

  const all: MemoryForContext[] = [];

  for (const { subject_type, subject_id } of conditions) {
    const { data: rows } = await supabase
      .from('ai_memories')
      .select('id, memory_type, title, summary, confidence')
      .eq('organization_id', organizationId)
      .eq('subject_type', subject_type)
      .eq('subject_id', subject_id)
      .eq('status', 'active')
      .gte('confidence', MIN_CONFIDENCE)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(MAX_MEMORIES);

    if (rows) {
      for (const r of rows) {
        all.push({
          id: r.id,
          memory_type: r.memory_type,
          title: r.title,
          summary: r.summary,
          confidence: Number(r.confidence),
        });
      }
    }
  }

  // Dedupe by similar summary (simple: by summary slice)
  const seen = new Set<string>();
  const deduped: MemoryForContext[] = [];
  for (const m of all) {
    const key = m.summary.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }

  // Sort by confidence desc, then take until we hit char limit
  deduped.sort((a, b) => b.confidence - a.confidence);
  const result: MemoryForContext[] = [];
  let total = 0;
  for (const m of deduped.slice(0, MAX_MEMORIES)) {
    if (total + m.summary.length + 2 > MAX_TOTAL_CHARS) break;
    result.push(m);
    total += m.summary.length + 2;
  }

  return result;
}

/** Format memories for injection into system prompt. */
export function formatMemoriesForPrompt(memories: MemoryForContext[]): string {
  if (memories.length === 0) return '';
  const lines = memories.map((m) => `- ${m.title ? `[${m.title}] ` : ''}${m.summary}`);
  return `Relevant context we have about this visitor/customer (use for continuity, do not invent):\n${lines.join('\n')}`;
}
