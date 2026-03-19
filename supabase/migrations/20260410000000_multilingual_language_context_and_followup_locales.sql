-- Multilingual language context:
-- - Store resolved conversation language on conversations
-- - Store customer preferred language on leads and quote_requests
-- - Localize follow-up templates (subject/body variants) for at least en + fr

-- 1) Store visitor language on core entities
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_language TEXT;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS customer_language TEXT;

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS customer_language TEXT;

-- Track which language was used when generating/sending the customer-facing email.
ALTER TABLE public.follow_up_drafts
  ADD COLUMN IF NOT EXISTS recipient_language TEXT;

-- 2) Follow-up template localization stored as JSONB variants
-- Keeps backward compatibility: existing templates keep working via subject_template/body_template.
ALTER TABLE public.follow_up_templates
  ADD COLUMN IF NOT EXISTS subject_template_localized JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS body_template_localized JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3) Add French variants for existing rows (when present).
-- If a row doesn't exist yet (e.g. new orgs), a trigger below seeds templates for future orgs.
UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  'Merci d''avoir contacté {{business_name}}'
)
WHERE key = 'lead_confirmation';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Bonjour {{customer_name}},</p><p>Merci d''avoir contacté {{business_name}}. Nous avons bien reçu votre demande et nous vous recontacterons rapidement.</p><p>{{next_step}}</p><p>Répondez à cet e-mail si vous souhaitez ajouter des précisions.</p>'
)
WHERE key = 'lead_confirmation';

UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  'Nous avons bien reçu votre demande de devis'
)
WHERE key = 'quote_request_received';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Bonjour {{customer_name}},</p><p>Merci pour votre demande de devis pour {{service_requested}}. Notre équipe examine vos informations dès maintenant.</p><p>{{quote_details}}</p><p>{{next_step}}</p>'
)
WHERE key = 'quote_request_received';

UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  'Détails complémentaires requis'
)
WHERE key = 'missing_info_request';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Bonjour {{customer_name}},</p><p>Merci pour votre demande. Pour vous proposer une suite pertinente, pourriez-vous nous partager quelques informations complémentaires ?</p><p>{{next_step}}</p>'
)
WHERE key = 'missing_info_request';

UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  'Relance concernant votre demande'
)
WHERE key = 'reminder_follow_up';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Bonjour {{customer_name}},</p><p>Nous faisons un point sur votre demande chez {{business_name}}. Si vous êtes toujours intéressé(e), répondez à cet e-mail et nous continuerons à partir de là.</p>'
)
WHERE key = 'reminder_follow_up';

UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  '{{business_name}} a bien reçu votre demande'
)
WHERE key = 'high_intent_lead_response';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Bonjour {{customer_name}},</p><p>Merci pour votre intérêt pour {{service_requested}}. Pour avancer rapidement, nous aimerions confirmer quelques détails.</p><p>{{next_step}}</p>'
)
WHERE key = 'high_intent_lead_response';

UPDATE public.follow_up_templates
SET subject_template_localized = subject_template_localized || jsonb_build_object(
  'fr',
  'Nouveau prospect : {{customer_name}}'
)
WHERE key = 'internal_lead_summary';

UPDATE public.follow_up_templates
SET body_template_localized = body_template_localized || jsonb_build_object(
  'fr',
  '<p>Nouveau prospect capturé.</p><p>Nom : {{customer_name}}<br>Email : {{customer_email}}<br>Téléphone : {{customer_phone}}</p><p>{{conversation_summary}}</p>'
)
WHERE key = 'internal_lead_summary';

-- 4) Seed follow-up templates for newly created organizations (future-proofing)
-- This keeps the feature working for orgs created after this migration is applied.
CREATE OR REPLACE FUNCTION public.seed_follow_up_templates_localized_for_new_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.follow_up_templates (
    organization_id,
    key,
    name,
    category,
    subject_template,
    body_template,
    is_html,
    is_default,
    subject_template_localized,
    body_template_localized
  )
  SELECT
    NEW.id,
    t.key,
    t.name,
    t.category,
    t.subject_template,
    t.body_template,
    true,
    true,
    t.subject_fr,
    t.body_fr
  FROM (
    VALUES
      (
        'lead_confirmation',
        'Lead confirmation',
        'lead_confirmation',
        'Thanks for contacting {{business_name}}',
        '<p>Hi {{customer_name}},</p><p>Thanks for reaching out to {{business_name}}. We received your request and will follow up shortly.</p><p>{{next_step}}</p><p>Reply to this email if you want to add more details.</p>',
        jsonb_build_object('fr', 'Merci d''avoir contacté {{business_name}}'),
        jsonb_build_object('fr', '<p>Bonjour {{customer_name}},</p><p>Merci d''avoir contacté {{business_name}}. Nous avons bien reçu votre demande et nous vous recontacterons rapidement.</p><p>{{next_step}}</p><p>Répondez à cet e-mail si vous souhaitez ajouter des précisions.</p>')
      ),
      (
        'quote_request_received',
        'Quote request received',
        'quote_request_received',
        'We received your quote request',
        '<p>Hi {{customer_name}},</p><p>Thanks for your quote request for {{service_requested}}. Our team is reviewing your details now.</p><p>{{quote_details}}</p><p>{{next_step}}</p>',
        jsonb_build_object('fr', 'Nous avons bien reçu votre demande de devis'),
        jsonb_build_object('fr', '<p>Bonjour {{customer_name}},</p><p>Merci pour votre demande de devis pour {{service_requested}}. Notre équipe examine vos informations dès maintenant.</p><p>{{quote_details}}</p><p>{{next_step}}</p>')
      ),
      (
        'missing_info_request',
        'Missing info request',
        'missing_info_request',
        'Quick details needed for your request',
        '<p>Hi {{customer_name}},</p><p>Thanks for your request. To provide an accurate next step, could you share a few more details?</p><p>{{next_step}}</p>',
        jsonb_build_object('fr', 'Détails complémentaires requis'),
        jsonb_build_object('fr', '<p>Bonjour {{customer_name}},</p><p>Merci pour votre demande. Pour vous proposer une suite pertinente, pourriez-vous nous partager quelques informations complémentaires ?</p><p>{{next_step}}</p>')
      ),
      (
        'reminder_follow_up',
        'Reminder follow-up',
        'reminder_follow_up',
        'Following up on your request',
        '<p>Hi {{customer_name}},</p><p>Just checking in on your request with {{business_name}}. If you are still interested, reply and we will continue from there.</p>',
        jsonb_build_object('fr', 'Relance concernant votre demande'),
        jsonb_build_object('fr', '<p>Bonjour {{customer_name}},</p><p>Nous faisons un point sur votre demande chez {{business_name}}. Si vous êtes toujours intéressé(e), répondez à cet e-mail et nous continuerons à partir de là.</p>')
      ),
      (
        'high_intent_lead_response',
        'High intent lead response',
        'high_intent_lead_response',
        '{{business_name}} received your request',
        '<p>Hi {{customer_name}},</p><p>Thanks for your interest in {{service_requested}}. We can help and would like to confirm a few details to move quickly.</p><p>{{next_step}}</p>',
        jsonb_build_object('fr', '{{business_name}} a bien reçu votre demande'),
        jsonb_build_object('fr', '<p>Bonjour {{customer_name}},</p><p>Merci pour votre intérêt pour {{service_requested}}. Pour avancer rapidement, nous aimerions confirmer quelques détails.</p><p>{{next_step}}</p>')
      ),
      (
        'internal_lead_summary',
        'Internal lead summary',
        'internal_lead_summary',
        'New lead: {{customer_name}}',
        '<p>New lead captured.</p><p>Name: {{customer_name}}<br>Email: {{customer_email}}<br>Phone: {{customer_phone}}</p><p>{{conversation_summary}}</p>',
        jsonb_build_object('fr', 'Nouveau prospect : {{customer_name}}'),
        jsonb_build_object('fr', '<p>Nouveau prospect capturé.</p><p>Nom : {{customer_name}}<br>Email : {{customer_email}}<br>Téléphone : {{customer_phone}}</p><p>{{conversation_summary}}</p>')
      )
  ) AS t (
    key,
    name,
    category,
    subject_template,
    body_template,
    subject_fr,
    body_fr
  )
  ON CONFLICT (organization_id, key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_follow_up_templates_localized_on_org_insert ON public.organizations;
CREATE TRIGGER seed_follow_up_templates_localized_on_org_insert
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_follow_up_templates_localized_for_new_org();

