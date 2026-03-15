/**
 * Vector search over knowledge chunks. Uses Supabase RPC match_knowledge_chunks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmbedding } from './embeddings';

export type KnowledgeMatch = {
  chunk_id: string;
  content: string;
  document_title: string | null;
  source_name: string;
  similarity: number;
};

export type SearchKnowledgeOptions = {
  organizationId: string;
  query: string;
  matchCount?: number;
  matchThreshold?: number;
  /** When set, chunks/documents with metadata.lang matching this (e.g. 'en', 'fr') are prioritized. */
  preferredLanguage?: string;
};

/**
 * Search knowledge base by semantic similarity. Embeds the query and runs vector search.
 */
export async function searchKnowledge(
  supabase: SupabaseClient,
  options: SearchKnowledgeOptions
): Promise<KnowledgeMatch[]> {
  const { organizationId, query, matchCount = 5, matchThreshold = 0.5, preferredLanguage } = options;
  const trimmed = query.trim().slice(0, 2000);
  if (!trimmed) return [];

  const embedding = await getEmbedding(trimmed);

  const rpcParams: Record<string, unknown> = {
    query_embedding: embedding,
    p_organization_id: organizationId,
    match_count: Math.min(matchCount, 20),
    match_threshold: matchThreshold,
  };
  if (preferredLanguage && preferredLanguage.trim().length > 0) {
    rpcParams.preferred_language = preferredLanguage.trim().toLowerCase().slice(0, 8);
  }

  const { data, error } = await supabase.rpc('match_knowledge_chunks', rpcParams);

  if (error) {
    console.error('[knowledge/search] RPC error:', error);
    return [];
  }

  return (data ?? []) as KnowledgeMatch[];
}
