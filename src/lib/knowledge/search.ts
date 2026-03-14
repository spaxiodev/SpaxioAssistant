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
};

/**
 * Search knowledge base by semantic similarity. Embeds the query and runs vector search.
 */
export async function searchKnowledge(
  supabase: SupabaseClient,
  options: SearchKnowledgeOptions
): Promise<KnowledgeMatch[]> {
  const { organizationId, query, matchCount = 5, matchThreshold = 0.5 } = options;
  const trimmed = query.trim().slice(0, 2000);
  if (!trimmed) return [];

  const embedding = await getEmbedding(trimmed);

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    p_organization_id: organizationId,
    match_count: Math.min(matchCount, 20),
    match_threshold: matchThreshold,
  });

  if (error) {
    console.error('[knowledge/search] RPC error:', error);
    return [];
  }

  return (data ?? []) as KnowledgeMatch[];
}
