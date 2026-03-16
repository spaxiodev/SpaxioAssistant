/**
 * AI Memory: types for cross-conversation memory.
 */

export const AI_MEMORY_SUBJECT_TYPES = ['conversation', 'lead', 'contact', 'company', 'visitor'] as const;
export type AiMemorySubjectType = (typeof AI_MEMORY_SUBJECT_TYPES)[number];

export const AI_MEMORY_TYPES = [
  'conversation_summary',
  'customer_preference',
  'sales_context',
  'support_history',
  'business_interaction',
] as const;
export type AiMemoryType = (typeof AI_MEMORY_TYPES)[number];

export type AiMemoryStatus = 'active' | 'archived';

export interface AiMemoryRow {
  id: string;
  organization_id: string;
  subject_type: AiMemorySubjectType;
  subject_id: string;
  memory_type: AiMemoryType;
  title: string | null;
  summary: string;
  structured_facts: Record<string, unknown>;
  confidence: number;
  last_used_at: string | null;
  source_conversation_id: string | null;
  source_message_ids: string[] | null;
  status: AiMemoryStatus;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMemory {
  memory_type: AiMemoryType;
  title: string | null;
  summary: string;
  structured_facts?: Record<string, unknown>;
  confidence: number;
}
