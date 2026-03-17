-- Business Setup Drafts: AI-generated full-business setup for review before publishing.
-- Org-scoped; RLS via get_user_owner_admin_organization_ids.
-- No direct overwrite of live config until user approves sections.

CREATE TABLE public.business_setup_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- collecting inputs or editing
    'extracting',      -- AI pipeline running
    'ready',           -- extraction done, awaiting review
    'partially_published',
    'published',
    'failed'
  )),
  current_step TEXT,
  error_message TEXT,

  -- What the user provided (website URL, pasted text, file summaries, chat summary, etc.)
  source_inputs JSONB DEFAULT '{}',

  -- Extracted sections (validated JSON; null = not extracted or rejected)
  extracted_business_profile JSONB,
  extracted_services JSONB,
  extracted_knowledge JSONB,
  extracted_pricing JSONB,
  extracted_agents JSONB,
  extracted_automations JSONB,
  extracted_widget_config JSONB,
  extracted_ai_pages JSONB,
  extracted_branding JSONB,

  -- Per-section review metadata
  assumptions JSONB DEFAULT '[]',
  missing_items JSONB DEFAULT '[]',
  confidence_scores JSONB DEFAULT '{}',
  section_approvals JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_business_setup_drafts_org ON public.business_setup_drafts(organization_id);
CREATE INDEX idx_business_setup_drafts_status ON public.business_setup_drafts(status);
CREATE INDEX idx_business_setup_drafts_updated ON public.business_setup_drafts(updated_at DESC);

ALTER TABLE public.business_setup_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners/admins business_setup_drafts" ON public.business_setup_drafts
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
  );

COMMENT ON TABLE public.business_setup_drafts IS 'AI-generated full-business setup drafts; user reviews and publishes by section';
