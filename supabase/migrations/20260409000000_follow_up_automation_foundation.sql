-- Follow-up automation foundation:
-- - org-scoped templates
-- - approval drafts
-- - send logs with dedupe guard
-- - entitlement keys for plan gating

CREATE TABLE IF NOT EXISTS public.follow_up_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  subject_template TEXT,
  body_template TEXT NOT NULL,
  is_html BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

CREATE INDEX IF NOT EXISTS idx_follow_up_templates_org ON public.follow_up_templates(organization_id);

ALTER TABLE public.follow_up_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view follow_up_templates" ON public.follow_up_templates
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert follow_up_templates" ON public.follow_up_templates
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can update follow_up_templates" ON public.follow_up_templates
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER follow_up_templates_updated_at BEFORE UPDATE ON public.follow_up_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.follow_up_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  source_event_type TEXT NOT NULL,
  source_event_id TEXT,
  source_type TEXT,
  source_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.follow_up_templates(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  body_text TEXT,
  generation_mode TEXT NOT NULL CHECK (generation_mode IN ('template_auto_send', 'ai_generated_auto_send', 'ai_draft_for_approval', 'internal_only_notification')),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'sent', 'rejected', 'ignored', 'failed')),
  ai_input JSONB,
  ai_output JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  send_log_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_drafts_org ON public.follow_up_drafts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_up_drafts_status ON public.follow_up_drafts(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_up_drafts_lead ON public.follow_up_drafts(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.follow_up_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view follow_up_drafts" ON public.follow_up_drafts
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert follow_up_drafts" ON public.follow_up_drafts
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can update follow_up_drafts" ON public.follow_up_drafts
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER follow_up_drafts_updated_at BEFORE UPDATE ON public.follow_up_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.follow_up_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  follow_up_draft_id UUID REFERENCES public.follow_up_drafts(id) ON DELETE SET NULL,
  source_event_type TEXT NOT NULL,
  source_event_id TEXT,
  dedupe_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped_duplicate', 'skipped_missing_email', 'skipped_validation')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_send_logs_org ON public.follow_up_send_logs(organization_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_follow_up_send_logs_dedupe ON public.follow_up_send_logs(organization_id, dedupe_key);

ALTER TABLE public.follow_up_send_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view follow_up_send_logs" ON public.follow_up_send_logs
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert follow_up_send_logs" ON public.follow_up_send_logs
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- Seed default templates per organization.
INSERT INTO public.follow_up_templates (organization_id, key, name, category, subject_template, body_template, is_html, is_default)
SELECT o.id, t.key, t.name, t.category, t.subject_template, t.body_template, true, true
FROM public.organizations o
CROSS JOIN (
  VALUES
    ('lead_confirmation', 'Lead confirmation', 'lead_confirmation', 'Thanks for contacting {{business_name}}', '<p>Hi {{customer_name}},</p><p>Thanks for reaching out to {{business_name}}. We received your request and will follow up shortly.</p><p>{{next_step}}</p><p>Reply to this email if you want to add more details.</p>'),
    ('quote_request_received', 'Quote request received', 'quote_request_received', 'We received your quote request', '<p>Hi {{customer_name}},</p><p>Thanks for your quote request for {{service_requested}}. Our team is reviewing your details now.</p><p>{{quote_details}}</p><p>{{next_step}}</p>'),
    ('missing_info_request', 'Missing info request', 'missing_info_request', 'Quick details needed for your request', '<p>Hi {{customer_name}},</p><p>Thanks for your request. To provide an accurate next step, could you share a few more details?</p><p>{{next_step}}</p>'),
    ('reminder_follow_up', 'Reminder follow-up', 'reminder_follow_up', 'Following up on your request', '<p>Hi {{customer_name}},</p><p>Just checking in on your request with {{business_name}}. If you are still interested, reply and we will continue from there.</p>'),
    ('high_intent_lead_response', 'High intent lead response', 'high_intent_lead_response', '{{business_name}} received your request', '<p>Hi {{customer_name}},</p><p>Thanks for your interest in {{service_requested}}. We can help and would like to confirm a few details to move quickly.</p><p>{{next_step}}</p>'),
    ('internal_lead_summary', 'Internal lead summary', 'internal_lead_summary', 'New lead: {{customer_name}}', '<p>New lead captured.</p><p>Name: {{customer_name}}<br>Email: {{customer_email}}<br>Phone: {{customer_phone}}</p><p>{{conversation_summary}}</p>')
) AS t(key, name, category, subject_template, body_template)
ON CONFLICT (organization_id, key) DO NOTHING;

-- Follow-up entitlements.
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_emails_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_followup_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_drafts_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '30'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'delayed_followups_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'free'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_emails_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_followup_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_drafts_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '250'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'delayed_followups_enabled', 'false'::jsonb FROM public.plans WHERE slug = 'starter'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_emails_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_followup_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_drafts_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '1500'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'delayed_followups_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'pro'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_emails_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_followup_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_drafts_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '6000'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'delayed_followups_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'business'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_emails_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'ai_followup_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'followup_drafts_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'monthly_followup_email_limit', '25000'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT id, 'delayed_followups_enabled', 'true'::jsonb FROM public.plans WHERE slug = 'enterprise'
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT (SELECT id FROM public.plans WHERE slug = 'legacy_assistant_pro'), pe.entitlement_key, pe.value
FROM public.plan_entitlements pe
JOIN public.plans p ON p.id = pe.plan_id
WHERE p.slug = 'pro'
AND pe.entitlement_key IN ('followup_emails_enabled', 'ai_followup_enabled', 'followup_drafts_enabled', 'monthly_followup_email_limit', 'delayed_followups_enabled')
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;
