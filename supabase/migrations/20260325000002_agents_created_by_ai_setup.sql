-- Mark agents created by the AI Setup Assistant so the UI can show "Created by AI Setup Assistant".
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS created_by_ai_setup BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agents_created_by_ai_setup ON public.agents(created_by_ai_setup) WHERE created_by_ai_setup = true;

COMMENT ON COLUMN public.agents.created_by_ai_setup IS 'True when this agent was created by publishing from the AI Setup Assistant';
