-- =============================================================================
-- Spaxio AI Platform: Full product pillars schema
-- Adds CRM, agent runs, knowledge bases, webhooks, documents, memory, deployments,
-- analytics, and expands roles. Keeps backward compatibility.
-- =============================================================================

-- Roles: extend organization_members for manager, agent_operator, viewer
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'agent_operator', 'member', 'viewer'));

-- -----------------------------------------------------------------------------
-- Agents: extended config and run history
-- -----------------------------------------------------------------------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS linked_knowledge_source_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_automation_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crm_access JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fallback_behavior TEXT,
  ADD COLUMN IF NOT EXISTS escalation_behavior TEXT,
  ADD COLUMN IF NOT EXISTS allowed_actions TEXT[] DEFAULT '{}';

-- Expand role_type for more agent types
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_role_type_check;
ALTER TABLE public.agents ADD CONSTRAINT agents_role_type_check CHECK (role_type IN (
  'website_chatbot', 'support_agent', 'lead_qualification', 'internal_knowledge',
  'workflow_agent', 'sales_agent', 'booking_agent', 'quote_assistant', 'faq_agent',
  'follow_up_agent', 'custom'
));

CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  trigger_type TEXT,
  trigger_metadata JSONB DEFAULT '{}',
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  model_used TEXT,
  usage_input_tokens INT,
  usage_output_tokens INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_tool_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_json JSONB DEFAULT '{}',
  output_json JSONB,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_org ON public.agent_runs(organization_id);
CREATE INDEX idx_agent_runs_agent ON public.agent_runs(agent_id);
CREATE INDEX idx_agent_runs_started ON public.agent_runs(started_at DESC);
CREATE INDEX idx_agent_messages_run ON public.agent_messages(agent_run_id);
CREATE INDEX idx_agent_tool_invocations_run ON public.agent_tool_invocations(agent_run_id);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view agent_runs" ON public.agent_runs FOR SELECT USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);
CREATE POLICY "Org members can insert agent_runs" ON public.agent_runs FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);
CREATE POLICY "Org members can update agent_runs" ON public.agent_runs FOR UPDATE USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org members can view agent_messages" ON public.agent_messages FOR SELECT USING (
  agent_run_id IN (SELECT id FROM public.agent_runs WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
CREATE POLICY "Org members can manage agent_messages" ON public.agent_messages FOR ALL USING (
  agent_run_id IN (SELECT id FROM public.agent_runs WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Org members can view agent_tool_invocations" ON public.agent_tool_invocations FOR SELECT USING (
  agent_run_id IN (SELECT id FROM public.agent_runs WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
CREATE POLICY "Org members can manage agent_tool_invocations" ON public.agent_tool_invocations FOR ALL USING (
  agent_run_id IN (SELECT id FROM public.agent_runs WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);

-- -----------------------------------------------------------------------------
-- Knowledge bases (grouping of sources)
-- -----------------------------------------------------------------------------
CREATE TABLE public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ADD COLUMN IF NOT EXISTS knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE SET NULL;
CREATE INDEX idx_knowledge_sources_base ON public.knowledge_sources(knowledge_base_id);
CREATE INDEX idx_knowledge_bases_org ON public.knowledge_bases(organization_id);

ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view knowledge_bases" ON public.knowledge_bases FOR SELECT USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);
CREATE POLICY "Org owners/admins can manage knowledge_bases" ON public.knowledge_bases FOR ALL USING (
  organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
);
CREATE TRIGGER knowledge_bases_updated_at BEFORE UPDATE ON public.knowledge_bases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexing runs for knowledge sync status
CREATE TABLE public.knowledge_index_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  chunks_created INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_knowledge_index_runs_source ON public.knowledge_index_runs(source_id);
ALTER TABLE public.knowledge_index_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view knowledge_index_runs" ON public.knowledge_index_runs FOR SELECT USING (
  source_id IN (SELECT id FROM public.knowledge_sources WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);

-- -----------------------------------------------------------------------------
-- Webhook endpoints (workspace-level) and field mappings
-- -----------------------------------------------------------------------------
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE public.webhook_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  target_key TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'email', 'phone', 'number', 'boolean', 'date', 'json')),
  required BOOLEAN NOT NULL DEFAULT false,
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_org ON public.webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_events_endpoint ON public.webhook_events(endpoint_id);
CREATE INDEX idx_webhook_events_received ON public.webhook_events(received_at DESC);
CREATE INDEX idx_webhook_field_mappings_endpoint ON public.webhook_field_mappings(endpoint_id);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view webhook_endpoints" ON public.webhook_endpoints FOR SELECT USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);
CREATE POLICY "Org owners/admins can manage webhook_endpoints" ON public.webhook_endpoints FOR ALL USING (
  organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
);
CREATE POLICY "Org members can view webhook_events" ON public.webhook_events FOR SELECT USING (
  endpoint_id IN (SELECT id FROM public.webhook_endpoints WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
-- Inserts from webhook receiver use service role (bypasses RLS)
CREATE POLICY "Org members can view webhook_field_mappings" ON public.webhook_field_mappings FOR SELECT USING (
  endpoint_id IN (SELECT id FROM public.webhook_endpoints WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
CREATE POLICY "Org owners/admins can manage webhook_field_mappings" ON public.webhook_field_mappings FOR ALL USING (
  endpoint_id IN (SELECT id FROM public.webhook_endpoints WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())))
);
CREATE TRIGGER webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- CRM: contacts, companies, deals; extend leads with status/stage
-- -----------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_attribution TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
-- Lead pipeline: New, Qualified, Proposal Sent, Won, Lost

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value_cents BIGINT DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'qualification' CHECK (stage IN ('qualification', 'proposal', 'negotiation', 'won', 'lost')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets: add awaiting_user to status
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check CHECK (status IN (
  'open', 'awaiting_user', 'in_progress', 'resolved', 'closed'
));

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_companies_org ON public.companies(organization_id);
CREATE INDEX idx_deals_org ON public.deals(organization_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_notes_org ON public.notes(organization_id);
CREATE INDEX idx_notes_lead ON public.notes(lead_id);
CREATE INDEX idx_notes_contact ON public.notes(contact_id);
CREATE INDEX idx_activities_org_subject ON public.activities(organization_id, subject_type, subject_id);
CREATE INDEX idx_activities_created ON public.activities(created_at DESC);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view contacts" ON public.contacts FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage contacts" ON public.contacts FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view companies" ON public.companies FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage companies" ON public.companies FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view deals" ON public.deals FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage deals" ON public.deals FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view tasks" ON public.tasks FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage tasks" ON public.tasks FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view notes" ON public.notes FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can manage notes" ON public.notes FOR ALL USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can view activities" ON public.activities FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert activities" ON public.activities FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Documents and templates
-- -----------------------------------------------------------------------------
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'custom' CHECK (template_type IN ('quote', 'proposal', 'invoice', 'support_summary', 'follow_up', 'lead_report', 'custom')),
  content TEXT NOT NULL DEFAULT '',
  variables_schema JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  automation_run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_templates_org ON public.document_templates(organization_id);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_lead ON public.documents(lead_id);
CREATE INDEX idx_documents_contact ON public.documents(contact_id);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view document_templates" ON public.document_templates FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage document_templates" ON public.document_templates FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view documents" ON public.documents FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can manage documents" ON public.documents FOR ALL USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER document_templates_updated_at BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Memory system
-- -----------------------------------------------------------------------------
CREATE TABLE public.memory_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'lead', 'conversation', 'agent', 'workspace')),
  entity_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'short_term' CHECK (scope IN ('short_term', 'long_term', 'workspace', 'agent')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_records_org_entity ON public.memory_records(organization_id, entity_type, entity_id);
CREATE INDEX idx_memory_records_scope ON public.memory_records(scope);
ALTER TABLE public.memory_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view memory_records" ON public.memory_records FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can manage memory_records" ON public.memory_records FOR ALL USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER memory_records_updated_at BEFORE UPDATE ON public.memory_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Deployment configs (embed, widget, API)
-- -----------------------------------------------------------------------------
CREATE TABLE public.deployment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  deployment_type TEXT NOT NULL CHECK (deployment_type IN ('website_widget', 'embedded_chat', 'standalone_page', 'dashboard_panel', 'api')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deployment_configs_org ON public.deployment_configs(organization_id);
CREATE INDEX idx_deployment_configs_agent ON public.deployment_configs(agent_id);
ALTER TABLE public.deployment_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view deployment_configs" ON public.deployment_configs FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage deployment_configs" ON public.deployment_configs FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE TRIGGER deployment_configs_updated_at BEFORE UPDATE ON public.deployment_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- AI extraction / classification
-- -----------------------------------------------------------------------------
CREATE TABLE public.extraction_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schema_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.extraction_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  schema_id UUID REFERENCES public.extraction_schemas(id) ON DELETE SET NULL,
  input_text TEXT NOT NULL,
  output_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extraction_schemas_org ON public.extraction_schemas(organization_id);
CREATE INDEX idx_extraction_runs_org ON public.extraction_runs(organization_id);
ALTER TABLE public.extraction_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view extraction_schemas" ON public.extraction_schemas FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage extraction_schemas" ON public.extraction_schemas FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE POLICY "Org members can view extraction_runs" ON public.extraction_runs FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert extraction_runs" ON public.extraction_runs FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER extraction_schemas_updated_at BEFORE UPDATE ON public.extraction_schemas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Automation builder: nodes and edges (visual graph)
-- -----------------------------------------------------------------------------
CREATE TABLE public.automation_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  node_kind TEXT NOT NULL CHECK (node_kind IN ('trigger', 'logic', 'action')),
  block_type TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  slot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_nodes_automation ON public.automation_nodes(automation_id);
CREATE INDEX idx_automation_edges_automation ON public.automation_edges(automation_id);
ALTER TABLE public.automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view automation_nodes" ON public.automation_nodes FOR SELECT USING (
  automation_id IN (SELECT id FROM public.automations WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
CREATE POLICY "Org owners/admins can manage automation_nodes" ON public.automation_nodes FOR ALL USING (
  automation_id IN (SELECT id FROM public.automations WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())))
);
CREATE POLICY "Org members can view automation_edges" ON public.automation_edges FOR SELECT USING (
  automation_id IN (SELECT id FROM public.automations WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
);
CREATE POLICY "Org owners/admins can manage automation_edges" ON public.automation_edges FOR ALL USING (
  automation_id IN (SELECT id FROM public.automations WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())))
);
CREATE TRIGGER automation_nodes_updated_at BEFORE UPDATE ON public.automation_nodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Analytics events (flexible event log for dashboards)
-- -----------------------------------------------------------------------------
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_org_type ON public.analytics_events(organization_id, event_type);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at DESC);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view analytics_events" ON public.analytics_events FOR SELECT USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);
CREATE POLICY "Org members can insert analytics_events" ON public.analytics_events FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);

COMMENT ON TABLE public.agent_runs IS 'Per-execution log for AI agents';
COMMENT ON TABLE public.knowledge_bases IS 'Grouping of knowledge sources per org';
COMMENT ON TABLE public.webhook_endpoints IS 'Workspace-level webhook URLs with optional field mapping';
COMMENT ON TABLE public.deployment_configs IS 'Embed and API deployment settings per agent';
COMMENT ON TABLE public.automation_nodes IS 'Visual automation builder: node in graph';
COMMENT ON TABLE public.automation_edges IS 'Visual automation builder: edge between nodes';

-- Link agent_runs to contacts (contacts table exists now)
ALTER TABLE public.agent_runs ADD CONSTRAINT fk_agent_runs_contact FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
