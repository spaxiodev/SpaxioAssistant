-- AI Infrastructure Platform: Knowledge layer (sources, documents, chunks, embeddings)
-- Replaces/enhances single website_learned_content with multi-source, chunked, embeddable knowledge.

CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'website_crawl' CHECK (source_type IN (
    'website_crawl',
    'manual_text',
    'pdf_upload',
    'docx_upload',
    'pasted_content',
    'notion_link',
    'custom'
  )),
  config JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT,
  content_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings for vector search (embedding model and dimensions can be configured later)
CREATE TABLE public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id UUID NOT NULL REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
  embedding vector(1536),
  model_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable pgvector if not already (Supabase usually has it)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX idx_knowledge_sources_org ON public.knowledge_sources(organization_id);
CREATE INDEX idx_knowledge_documents_source ON public.knowledge_documents(source_id);
CREATE INDEX idx_knowledge_chunks_document ON public.knowledge_chunks(document_id);
CREATE INDEX idx_document_embeddings_chunk ON public.document_embeddings(chunk_id);
-- Vector similarity search: create index when table has rows (ivfflat needs data)
-- Run after backfilling embeddings: CREATE INDEX idx_document_embeddings_embedding ON public.document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view knowledge_sources" ON public.knowledge_sources
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage knowledge_sources" ON public.knowledge_sources
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));

CREATE POLICY "Org members can view knowledge_documents" ON public.knowledge_documents
  FOR SELECT USING (
    source_id IN (SELECT id FROM public.knowledge_sources WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  );
CREATE POLICY "Org owners/admins can manage knowledge_documents" ON public.knowledge_documents
  FOR ALL USING (
    source_id IN (SELECT id FROM public.knowledge_sources WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())))
  );

CREATE POLICY "Org members can view knowledge_chunks" ON public.knowledge_chunks
  FOR SELECT USING (
    document_id IN (
      SELECT kd.id FROM public.knowledge_documents kd
      JOIN public.knowledge_sources ks ON ks.id = kd.source_id
      WHERE ks.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can manage knowledge_chunks" ON public.knowledge_chunks
  FOR ALL USING (
    document_id IN (
      SELECT kd.id FROM public.knowledge_documents kd
      JOIN public.knowledge_sources ks ON ks.id = kd.source_id
      WHERE ks.organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

CREATE POLICY "Org members can view document_embeddings" ON public.document_embeddings
  FOR SELECT USING (
    chunk_id IN (
      SELECT kc.id FROM public.knowledge_chunks kc
      JOIN public.knowledge_documents kd ON kd.id = kc.document_id
      JOIN public.knowledge_sources ks ON ks.id = kd.source_id
      WHERE ks.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can manage document_embeddings" ON public.document_embeddings
  FOR ALL USING (
    chunk_id IN (
      SELECT kc.id FROM public.knowledge_chunks kc
      JOIN public.knowledge_documents kd ON kd.id = kc.document_id
      JOIN public.knowledge_sources ks ON ks.id = kd.source_id
      WHERE ks.organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

CREATE TRIGGER knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.knowledge_sources IS 'Knowledge source per org (website, PDF, manual, etc.)';
COMMENT ON TABLE public.knowledge_documents IS 'Documents belonging to a source';
COMMENT ON TABLE public.knowledge_chunks IS 'Text chunks for RAG';
COMMENT ON TABLE public.document_embeddings IS 'Vector embeddings for similarity search';
