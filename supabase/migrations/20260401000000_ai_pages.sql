-- AI Pages: full-page AI experiences (Quote Assistant, Support, Intake, etc.)
-- Reuses conversations/messages; extends with ai_page_id and ai_page_runs.

-- 1. Create ai_pages first
CREATE TABLE public.ai_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  page_type TEXT NOT NULL DEFAULT 'general' CHECK (page_type IN (
    'quote', 'support', 'booking', 'intake', 'sales', 'product_finder', 'general', 'custom'
  )),
  deployment_mode TEXT NOT NULL DEFAULT 'page_only' CHECK (deployment_mode IN (
    'widget_only', 'page_only', 'widget_and_page', 'widget_handoff_to_page'
  )),
  welcome_message TEXT,
  intro_copy TEXT,
  trust_copy TEXT,
  config JSONB DEFAULT '{}',
  branding_config JSONB DEFAULT '{}',
  intake_schema JSONB DEFAULT '[]',
  outcome_config JSONB DEFAULT '{}',
  handoff_config JSONB DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_ai_pages_org ON public.ai_pages(organization_id);
CREATE INDEX idx_ai_pages_slug ON public.ai_pages(organization_id, slug);
CREATE INDEX idx_ai_pages_published ON public.ai_pages(organization_id, is_published) WHERE is_published = true;

ALTER TABLE public.ai_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_pages" ON public.ai_pages
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage ai_pages" ON public.ai_pages
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Public can read published ai_pages" ON public.ai_pages
  FOR SELECT USING (is_published = true AND is_enabled = true);

CREATE TRIGGER ai_pages_updated_at BEFORE UPDATE ON public.ai_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Extend conversations: allow either widget or ai_page
ALTER TABLE public.conversations
  ALTER COLUMN widget_id DROP NOT NULL;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_page_id UUID REFERENCES public.ai_pages(id) ON DELETE SET NULL;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_source_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_source_check CHECK (
    (widget_id IS NOT NULL AND ai_page_id IS NULL) OR
    (widget_id IS NULL AND ai_page_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_conversations_ai_page ON public.conversations(ai_page_id) WHERE ai_page_id IS NOT NULL;

-- 3. AI page runs (sessions)
CREATE TABLE public.ai_page_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_page_id UUID NOT NULL REFERENCES public.ai_pages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  support_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  session_state JSONB DEFAULT '{}',
  completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_page_runs_org ON public.ai_page_runs(organization_id);
CREATE INDEX idx_ai_page_runs_page ON public.ai_page_runs(ai_page_id);
CREATE INDEX idx_ai_page_runs_conversation ON public.ai_page_runs(conversation_id) WHERE conversation_id IS NOT NULL;

ALTER TABLE public.ai_page_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view ai_page_runs" ON public.ai_page_runs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage ai_page_runs" ON public.ai_page_runs
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Service can insert ai_page_runs" ON public.ai_page_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update ai_page_runs" ON public.ai_page_runs FOR UPDATE USING (true);

CREATE TRIGGER ai_page_runs_updated_at BEFORE UPDATE ON public.ai_page_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Handoff tokens: short-lived tokens for widget-to-page context handoff
CREATE TABLE public.ai_page_handoff_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_page_id UUID NOT NULL REFERENCES public.ai_pages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  context_snippet JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_handoff_tokens_token ON public.ai_page_handoff_tokens(token);
CREATE INDEX idx_handoff_tokens_expires ON public.ai_page_handoff_tokens(expires_at);

ALTER TABLE public.ai_page_handoff_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage handoff_tokens" ON public.ai_page_handoff_tokens FOR ALL USING (true);

COMMENT ON TABLE public.ai_pages IS 'Full-page AI experiences (Quote, Support, Intake, etc.) per org';
COMMENT ON TABLE public.ai_page_runs IS 'Per-visit session and outcome tracking for AI pages';
COMMENT ON TABLE public.ai_page_handoff_tokens IS 'Short-lived tokens for widget-to-AI-page handoff with context';
