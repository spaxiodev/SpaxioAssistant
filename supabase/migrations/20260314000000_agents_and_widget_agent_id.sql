-- AI Infrastructure Platform: Agents table and widget–agent link
-- Existing chatbots become agents with type = 'website_chatbot'.
-- Backward compat: widget.agent_id is nullable; chat can resolve agent from widget or org default.

-- Agent types: website_chatbot (current embed), support_agent, lead_qualification, internal_knowledge, workflow_agent, etc.
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Assistant',
  description TEXT,
  role_type TEXT NOT NULL DEFAULT 'website_chatbot' CHECK (role_type IN (
    'website_chatbot',
    'support_agent',
    'lead_qualification',
    'internal_knowledge',
    'workflow_agent',
    'custom'
  )),
  system_prompt TEXT,
  model_provider TEXT NOT NULL DEFAULT 'openai' CHECK (model_provider IN ('openai', 'anthropic', 'openrouter', 'custom')),
  model_id TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature REAL NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  enabled_tools TEXT[] DEFAULT '{}',
  widget_enabled BOOLEAN NOT NULL DEFAULT true,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  memory_short_term_enabled BOOLEAN NOT NULL DEFAULT true,
  memory_long_term_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_organization ON public.agents(organization_id);
CREATE INDEX idx_agents_role_type ON public.agents(role_type);

ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX idx_widgets_agent ON public.widgets(agent_id);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents: org members can read; owners/admins can manage
CREATE POLICY "Org members can view agents" ON public.agents
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can insert agents" ON public.agents
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can update agents" ON public.agents
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can delete agents" ON public.agents
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.agents IS 'AI agents per organization; website_chatbot = current embed behavior';
COMMENT ON COLUMN public.widgets.agent_id IS 'Optional link to agent; when set, chat uses agent prompt/model/tools';
