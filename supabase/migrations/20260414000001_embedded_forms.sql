-- Embedded Forms: embeddable forms that business owners can place on their website
-- Submissions are tracked separately from widget quote requests, but quote-type forms
-- also write to quote_requests for the existing CRM flow.

-- 1. Forms
CREATE TABLE public.embedded_forms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT,
  form_type    TEXT NOT NULL DEFAULT 'lead_form' CHECK (form_type IN (
    'lead_form', 'quote_form', 'custom_request_form'
  )),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  success_message TEXT,
  theme_settings  JSONB DEFAULT '{}',
  pricing_profile_id UUID REFERENCES public.quote_pricing_profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embedded_forms_org ON public.embedded_forms(organization_id);
CREATE INDEX idx_embedded_forms_active ON public.embedded_forms(organization_id, is_active) WHERE is_active = true;

ALTER TABLE public.embedded_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view embedded_forms" ON public.embedded_forms
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage embedded_forms" ON public.embedded_forms
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
-- Public read for active forms (needed for public embed endpoint using service role, not this policy)

CREATE TRIGGER embedded_forms_updated_at BEFORE UPDATE ON public.embedded_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.embedded_forms IS 'Embeddable forms (lead, quote, custom) per org';

-- 2. Form fields
CREATE TABLE public.form_fields (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id      UUID NOT NULL REFERENCES public.embedded_forms(id) ON DELETE CASCADE,
  field_key    TEXT NOT NULL,
  label        TEXT NOT NULL,
  field_type   TEXT NOT NULL CHECK (field_type IN (
    'text', 'email', 'phone', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date'
  )),
  placeholder  TEXT,
  required     BOOLEAN NOT NULL DEFAULT false,
  options_json JSONB DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  pricing_mapping_json JSONB DEFAULT '{}',
  conditional_logic_json JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, field_key)
);

CREATE INDEX idx_form_fields_form ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_sort ON public.form_fields(form_id, sort_order);

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view form_fields" ON public.form_fields
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM public.embedded_forms
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org owners/admins can manage form_fields" ON public.form_fields
  FOR ALL USING (
    form_id IN (
      SELECT id FROM public.embedded_forms
      WHERE organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid()))
    )
  );

COMMENT ON TABLE public.form_fields IS 'Fields belonging to an embedded form';

-- 3. Form submissions
CREATE TABLE public.form_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id         UUID NOT NULL REFERENCES public.embedded_forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name   TEXT,
  customer_email  TEXT,
  customer_phone  TEXT,
  answers_json    JSONB DEFAULT '{}',
  calculated_total NUMERIC,
  quote_breakdown_json JSONB DEFAULT '{}',
  source          TEXT NOT NULL DEFAULT 'embed' CHECK (source IN ('embed', 'widget', 'api')),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'reviewed', 'contacted', 'converted', 'archived'
  )),
  -- Link back to quote_requests if this submission also created one
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_form ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_org ON public.form_submissions(organization_id);
CREATE INDEX idx_form_submissions_status ON public.form_submissions(form_id, status);
CREATE INDEX idx_form_submissions_created ON public.form_submissions(organization_id, created_at DESC);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view form_submissions" ON public.form_submissions
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage form_submissions" ON public.form_submissions
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
-- Service role (anon public submits) handled by admin client in API routes

CREATE TRIGGER form_submissions_updated_at BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.form_submissions IS 'Submissions for embedded forms';
