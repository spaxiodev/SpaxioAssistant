-- Email Automation Feature
-- Tables: email_automation_settings, email_providers, email_reply_templates, inbound_emails, email_auto_replies

-- -------------------------------------------------------------------------
-- email_automation_settings
-- One row per organization; controls the master switch and global behaviour.
-- -------------------------------------------------------------------------
create table if not exists public.email_automation_settings (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete cascade,
  enabled                 boolean not null default false,
  -- Language & fallback
  fallback_language       text not null default 'en',
  -- AI reply enhancement
  ai_enhancement_enabled  boolean not null default false,
  tone_preset             text not null default 'professional',
  -- Business hours / away message
  business_hours_enabled  boolean not null default false,
  business_hours_json     jsonb,           -- { mon: {open:"09:00",close:"17:00"}, ... }
  away_message_enabled    boolean not null default false,
  away_message_text       text,
  away_message_language   text default 'en',
  -- Reply-loop prevention
  max_auto_replies_per_thread integer not null default 1,
  cooldown_hours          integer not null default 24,
  -- AI-translate unsupported languages
  ai_translate_enabled    boolean not null default true,
  -- Timestamps
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_email_automation_settings_org unique (organization_id)
);

alter table public.email_automation_settings enable row level security;

create policy "org members can manage email automation settings"
  on public.email_automation_settings
  for all
  using (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  with check (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- Trigger: keep updated_at fresh
create or replace function public.set_email_automation_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_email_automation_settings_updated_at
  before update on public.email_automation_settings
  for each row execute function public.set_email_automation_settings_updated_at();

-- -------------------------------------------------------------------------
-- email_providers
-- Stores per-organization email provider connections.
-- provider_type: 'gmail' | 'outlook' | 'imap' | 'resend' | 'sendgrid'
-- credentials are stored encrypted / as opaque JSON (no plaintext passwords in logs).
-- -------------------------------------------------------------------------
create table if not exists public.email_providers (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  provider_type       text not null,          -- 'gmail' | 'outlook' | 'imap' | 'resend' | 'webhook_inbound'
  display_name        text,                   -- e.g. "support@acme.com"
  status              text not null default 'disconnected',  -- 'connected' | 'disconnected' | 'error'
  status_message      text,
  -- Encrypted / sanitised config stored as JSONB (never store raw OAuth secrets in plaintext)
  config_json         jsonb,                  -- { email: '...', webhook_url: '...' }
  inbound_webhook_token text,                 -- random token for inbound webhook endpoint
  last_checked_at     timestamptz,
  connected_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.email_providers enable row level security;

create policy "org members can manage email providers"
  on public.email_providers
  for all
  using (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  with check (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

create or replace function public.set_email_providers_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_email_providers_updated_at
  before update on public.email_providers
  for each row execute function public.set_email_providers_updated_at();

-- -------------------------------------------------------------------------
-- email_reply_templates
-- Per-org, per-language reply templates.  Language is ISO 639-1 code.
-- -------------------------------------------------------------------------
create table if not exists public.email_reply_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  language_code   text not null,          -- 'en' | 'fr' | 'es' | etc.
  language_name   text not null,          -- 'English' | 'French' | 'Spanish'
  subject_template text,                  -- e.g. "Re: {{original_subject}}"
  body_template   text not null,          -- Template body, supports {{customer_name}} etc.
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_email_reply_templates_org_lang unique (organization_id, language_code)
);

alter table public.email_reply_templates enable row level security;

create policy "org members can manage email reply templates"
  on public.email_reply_templates
  for all
  using (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  with check (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

create or replace function public.set_email_reply_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_email_reply_templates_updated_at
  before update on public.email_reply_templates
  for each row execute function public.set_email_reply_templates_updated_at();

-- -------------------------------------------------------------------------
-- inbound_emails
-- Stores every inbound email received for an org.
-- -------------------------------------------------------------------------
create table if not exists public.inbound_emails (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  email_provider_id   uuid references public.email_providers(id) on delete set null,
  -- Sender
  sender_email        text not null,
  sender_name         text,
  -- Message
  subject             text,
  body_text           text,
  body_html           text,
  -- Threading
  message_id          text,               -- RFC 2822 Message-ID header
  in_reply_to         text,               -- In-Reply-To header
  thread_id           text,               -- Provider-level thread/conversation ID
  -- Processing
  detected_language   text,               -- ISO 639-1 code
  language_confidence numeric(4,3),       -- 0.000–1.000
  is_spam             boolean not null default false,
  is_auto_generated   boolean not null default false,
  processing_status   text not null default 'pending', -- 'pending' | 'replied' | 'skipped' | 'failed'
  skip_reason         text,
  -- Lead integration
  lead_id             uuid references public.leads(id) on delete set null,
  -- Timestamps
  received_at         timestamptz not null default now(),
  processed_at        timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.inbound_emails enable row level security;

create policy "org members can view inbound emails"
  on public.inbound_emails
  for all
  using (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  with check (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

create index idx_inbound_emails_org_created on public.inbound_emails(organization_id, created_at desc);
create index idx_inbound_emails_thread on public.inbound_emails(organization_id, thread_id) where thread_id is not null;
create index idx_inbound_emails_sender on public.inbound_emails(organization_id, sender_email);

-- -------------------------------------------------------------------------
-- email_auto_replies
-- Tracks every auto reply sent, for deduplication and audit.
-- -------------------------------------------------------------------------
create table if not exists public.email_auto_replies (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  inbound_email_id    uuid references public.inbound_emails(id) on delete set null,
  lead_id             uuid references public.leads(id) on delete set null,
  -- Reply details
  to_email            text not null,
  to_name             text,
  subject             text not null,
  body_html           text not null,
  body_text           text,
  -- Language & template
  reply_language      text,
  template_id         uuid references public.email_reply_templates(id) on delete set null,
  ai_enhanced         boolean not null default false,
  -- Send result
  status              text not null default 'pending',  -- 'pending' | 'sent' | 'failed'
  provider            text default 'resend',
  provider_message_id text,
  error_message       text,
  -- Deduplication
  thread_dedupe_key   text,               -- org_id + thread_id or sender+subject hash
  -- Timestamps
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.email_auto_replies enable row level security;

create policy "org members can view email auto replies"
  on public.email_auto_replies
  for all
  using (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  with check (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

create index idx_email_auto_replies_org_created on public.email_auto_replies(organization_id, created_at desc);
create index idx_email_auto_replies_dedupe on public.email_auto_replies(organization_id, thread_dedupe_key) where thread_dedupe_key is not null;

-- -------------------------------------------------------------------------
-- Seed default templates for new orgs (via a helper function)
-- -------------------------------------------------------------------------
create or replace function public.seed_default_email_reply_templates(p_org_id uuid)
returns void language plpgsql as $$
begin
  insert into public.email_reply_templates (organization_id, language_code, language_name, subject_template, body_template)
  values
    (
      p_org_id, 'en', 'English',
      'Re: {{original_subject}}',
      'Hi {{customer_name}},

Thank you for reaching out. We''ve received your message and a member of our team will get back to you as soon as possible.

Best regards,
{{business_name}}'
    ),
    (
      p_org_id, 'fr', 'French',
      'Re: {{original_subject}}',
      'Bonjour {{customer_name}},

Merci de nous avoir contactés. Nous avons bien reçu votre message et un membre de notre équipe vous répondra dans les plus brefs délais.

Cordialement,
{{business_name}}'
    ),
    (
      p_org_id, 'es', 'Spanish',
      'Re: {{original_subject}}',
      'Hola {{customer_name}},

Gracias por ponerse en contacto con nosotros. Hemos recibido su mensaje y un miembro de nuestro equipo le responderá a la brevedad posible.

Atentamente,
{{business_name}}'
    )
  on conflict (organization_id, language_code) do nothing;
end; $$;
