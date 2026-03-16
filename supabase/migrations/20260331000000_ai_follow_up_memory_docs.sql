-- AI Follow-Up Engine, AI Memory, and Document Generation
-- Backwards compatible: new tables + optional columns on existing tables.

-- -----------------------------------------------------------------------------
-- 1. AI Follow-Up Runs
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_follow_up_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('lead_form_submitted', 'quote_request_submitted', 'lead_qualification_completed', 'conversation_milestone')),
  source_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  generated_summary TEXT,
  recommended_action TEXT,
  recommended_priority TEXT,
  recommended_channel TEXT,
  recommended_timing TEXT,
  draft_email_subject TEXT,
  draft_email_body TEXT,
  draft_note TEXT,
  draft_task_title TEXT,
  draft_task_description TEXT,
  raw_model_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_follow_up_runs_org ON public.ai_follow_up_runs(organization_id);
CREATE INDEX idx_ai_follow_up_runs_source ON public.ai_follow_up_runs(source_type, source_id);
CREATE INDEX idx_ai_follow_up_runs_lead ON public.ai_follow_up_runs(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.ai_follow_up_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_follow_up_runs" ON public.ai_follow_up_runs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert ai_follow_up_runs" ON public.ai_follow_up_runs
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can update ai_follow_up_runs" ON public.ai_follow_up_runs
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER ai_follow_up_runs_updated_at BEFORE UPDATE ON public.ai_follow_up_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service role / API will insert from widget flows; dashboard reads with RLS.

-- -----------------------------------------------------------------------------
-- 2. AI Memories (conversation / customer memory across sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('conversation', 'lead', 'contact', 'company', 'visitor')),
  subject_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conversation_summary', 'customer_preference', 'sales_context', 'support_history', 'business_interaction')),
  title TEXT,
  summary TEXT NOT NULL DEFAULT '',
  structured_facts JSONB DEFAULT '{}',
  confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  last_used_at TIMESTAMPTZ,
  source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  source_message_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_memories_org_subject ON public.ai_memories(organization_id, subject_type, subject_id);
CREATE INDEX idx_ai_memories_conversation ON public.ai_memories(source_conversation_id) WHERE source_conversation_id IS NOT NULL;
CREATE INDEX idx_ai_memories_status ON public.ai_memories(status) WHERE status = 'active';

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_memories" ON public.ai_memories
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can manage ai_memories" ON public.ai_memories
  FOR ALL USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER ai_memories_updated_at BEFORE UPDATE ON public.ai_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Documents: optional quote_request_id and generation metadata
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
UPDATE public.documents SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.documents ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.documents ALTER COLUMN updated_at SET DEFAULT now();

-- Store generation metadata in existing structure: use a metadata JSONB if we add it, or we can use content + name.
-- Add metadata column for generation_type, source_type, source_id, generation_status.
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_documents_quote_request ON public.documents(quote_request_id) WHERE quote_request_id IS NOT NULL;

-- Trigger for documents.updated_at
CREATE OR REPLACE FUNCTION public.set_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_documents_updated_at();
