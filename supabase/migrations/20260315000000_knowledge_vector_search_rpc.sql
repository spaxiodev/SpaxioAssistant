-- RPC for similarity search over knowledge chunks (used by search_knowledge_base tool).
-- Requires pgvector; embedding must be 1536 dimensions (OpenAI text-embedding-3-small / ada-002).

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  p_organization_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  document_title TEXT,
  source_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id AS chunk_id,
    kc.content,
    kd.title AS document_title,
    ks.name AS source_name,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  JOIN public.knowledge_chunks kc ON kc.id = de.chunk_id
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  JOIN public.knowledge_sources ks ON ks.id = kd.source_id
  WHERE ks.organization_id = p_organization_id
    AND de.embedding IS NOT NULL
    AND (1 - (de.embedding <=> query_embedding)) >= match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT LEAST(match_count, 20);
END;
$$;

COMMENT ON FUNCTION public.match_knowledge_chunks IS 'Vector similarity search for RAG; used by search_knowledge_base tool.';
