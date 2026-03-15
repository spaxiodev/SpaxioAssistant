-- Scoped webhook endpoints to agents: optional agent_id so users can see webhooks per agent.
-- Backward compatible: agent_id NULL = workspace-level endpoint.

ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_agent ON public.webhook_endpoints(agent_id) WHERE agent_id IS NOT NULL;

-- Allow same slug per agent; one workspace-level per slug when agent_id IS NULL.
ALTER TABLE public.webhook_endpoints DROP CONSTRAINT IF EXISTS webhook_endpoints_organization_id_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_endpoints_org_slug_workspace
  ON public.webhook_endpoints(organization_id, slug) WHERE agent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_endpoints_org_agent_slug
  ON public.webhook_endpoints(organization_id, agent_id, slug) WHERE agent_id IS NOT NULL;

COMMENT ON COLUMN public.webhook_endpoints.agent_id IS 'When set, this endpoint is scoped to the agent; NULL = workspace-level.';