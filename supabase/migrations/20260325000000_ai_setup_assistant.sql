-- AI Setup Assistant: sessions, messages, blueprints, generated resources, publish logs.
-- All tables scoped by organization_id. RLS uses get_user_owner_admin_organization_ids for write.

-- Sessions: one per "conversation" with the AI setup assistant
CREATE TABLE public.ai_setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  planner_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_setup_sessions_org ON public.ai_setup_sessions(organization_id);
CREATE INDEX idx_ai_setup_sessions_updated ON public.ai_setup_sessions(updated_at DESC);

-- Messages: chat history for each session
CREATE TABLE public.ai_setup_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.ai_setup_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_setup_messages_session ON public.ai_setup_messages(session_id);

-- Blueprints: snapshot of planner config when published (named setup)
CREATE TABLE public.assistant_blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_setup_session_id UUID REFERENCES public.ai_setup_sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'My setup',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistant_blueprints_org ON public.assistant_blueprints(organization_id);

-- Generated resources: what was created (agent, automation, widget link)
CREATE TABLE public.generated_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assistant_blueprint_id UUID NOT NULL REFERENCES public.assistant_blueprints(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('agent', 'automation', 'widget_link')),
  resource_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_automations_blueprint ON public.generated_automations(assistant_blueprint_id);
CREATE INDEX idx_generated_automations_org ON public.generated_automations(organization_id);

-- Widget deployments: embed code and widget/agent ids per blueprint
CREATE TABLE public.widget_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assistant_blueprint_id UUID NOT NULL REFERENCES public.assistant_blueprints(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  embed_code TEXT,
  webhook_url TEXT,
  webhook_secret_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_widget_deployments_blueprint ON public.widget_deployments(assistant_blueprint_id);
CREATE INDEX idx_widget_deployments_org ON public.widget_deployments(organization_id);

-- Publish activity log
CREATE TABLE public.setup_publish_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_setup_session_id UUID NOT NULL REFERENCES public.ai_setup_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_publish_logs_session ON public.setup_publish_logs(ai_setup_session_id);
CREATE INDEX idx_setup_publish_logs_org ON public.setup_publish_logs(organization_id);

-- Optional: seed table for AI-pickable templates (key, name, description, default_config)
CREATE TABLE public.automation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_templates_key ON public.automation_templates(key);

-- RLS
ALTER TABLE public.ai_setup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_setup_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_publish_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

-- Policies: org owners/admins can do everything (match existing dashboard pattern)
CREATE POLICY "Org owners/admins ai_setup_sessions" ON public.ai_setup_sessions
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE POLICY "Org owners/admins ai_setup_messages" ON public.ai_setup_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.ai_setup_sessions
      WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

CREATE POLICY "Org owners/admins assistant_blueprints" ON public.assistant_blueprints
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE POLICY "Org owners/admins generated_automations" ON public.generated_automations
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE POLICY "Org owners/admins widget_deployments" ON public.widget_deployments
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

CREATE POLICY "Org owners/admins setup_publish_logs" ON public.setup_publish_logs
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

-- automation_templates: read-only for all org members (seed data)
CREATE POLICY "Org members can read automation_templates" ON public.automation_templates
  FOR SELECT USING (true);

COMMENT ON TABLE public.ai_setup_sessions IS 'AI Setup Assistant chat sessions; planner_config holds structured automation plan';
COMMENT ON TABLE public.ai_setup_messages IS 'Chat messages between user and AI Setup Assistant';
COMMENT ON TABLE public.assistant_blueprints IS 'Published snapshot of a setup (planner config + generated resources)';
COMMENT ON TABLE public.generated_automations IS 'Records of agents/automations created when publishing a blueprint';
COMMENT ON TABLE public.widget_deployments IS 'Widget embed and webhook info per published blueprint';
COMMENT ON TABLE public.setup_publish_logs IS 'Activity log of publish steps (agent_created, automation_created, etc.)';
COMMENT ON TABLE public.automation_templates IS 'Templates the AI can use (lead_capture, quote_request, etc.)';
