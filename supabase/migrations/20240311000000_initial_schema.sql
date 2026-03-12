-- Spaxio AI: Multi-tenant SaaS schema with RLS
-- Run this migration in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizations (tenants)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization membership
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Business settings (per organization)
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  industry TEXT,
  company_description TEXT,
  services_offered TEXT[] DEFAULT '{}',
  pricing_notes TEXT,
  faq JSONB DEFAULT '[]',
  tone_of_voice TEXT DEFAULT 'professional',
  contact_email TEXT,
  phone TEXT,
  lead_notification_email TEXT,
  primary_brand_color TEXT DEFAULT '#0f172a',
  chatbot_welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Widgets (one per org for now; can extend to multiple later)
CREATE TABLE public.widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions (Stripe)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversations (widget chats)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  visitor_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages (per conversation)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  transcript_snippet TEXT,
  requested_service TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quote requests
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  service_type TEXT,
  project_details TEXT,
  dimensions_size TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX idx_widgets_org ON public.widgets(organization_id);
CREATE INDEX idx_conversations_widget ON public.conversations(widget_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_quote_requests_org ON public.quote_requests(organization_id);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- RLS: enable on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Helper: get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = user_uuid;
$$;

-- Profiles: users can read/update own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations: members can read
CREATE POLICY "Org members can view org" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can update org" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
CREATE POLICY "Authenticated users can create org" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members: members can view same org
CREATE POLICY "Org members can view members" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can manage members" ON public.organization_members
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
CREATE POLICY "Users can insert themselves as member" ON public.organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Business settings: org members can read, owners/admins can write
CREATE POLICY "Org members can view business_settings" ON public.business_settings
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can manage business_settings" ON public.business_settings
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Widgets: org members can read, owners/admins can manage
CREATE POLICY "Org members can view widgets" ON public.widgets
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners/admins can manage widgets" ON public.widgets
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Subscriptions: org members can read, owners can manage
CREATE POLICY "Org members can view subscriptions" ON public.subscriptions
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );
CREATE POLICY "Org owners can manage subscriptions" ON public.subscriptions
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Conversations: org members can view (via widget -> org)
CREATE POLICY "Org members can view conversations" ON public.conversations
  FOR SELECT USING (
    widget_id IN (SELECT id FROM public.widgets WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid())))
  );
-- Service role / API will insert conversations from widget (handled by service role or dedicated policy for anon with widget validation)

-- Messages: org members can view
CREATE POLICY "Org members can view messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

-- Leads: org members can view, service inserts
CREATE POLICY "Org members can view leads" ON public.leads
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- Quote requests: org members can view
CREATE POLICY "Org members can view quote_requests" ON public.quote_requests
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- Widget public read: allow anon to read widget + business_settings by widget_id (for embed)
-- We use a single widget id; no PII is exposed except public business config for chat UX.
CREATE POLICY "Public can read widget by id" ON public.widgets
  FOR SELECT USING (true);

CREATE POLICY "Public can read business_settings by org" ON public.business_settings
  FOR SELECT USING (true);

-- Conversations and messages: insert/update from API using service role or a secure server-side flow
-- For dashboard, we already have SELECT. For widget posting, we'll use service role in API routes.
-- So we don't add anon INSERT on conversations/messages; the Next.js API will use service key.

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER business_settings_updated_at BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER widgets_updated_at BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
