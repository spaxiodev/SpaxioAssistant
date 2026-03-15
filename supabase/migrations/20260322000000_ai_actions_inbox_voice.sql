-- =============================================================================
-- Spaxio AI: AI Actions, Human+AI Inbox, Voice Agents – Phase 1 schema
-- Adds action_invocations, bookings, inbox (assignments, notes, tags, events,
-- escalation), voice_sessions/transcripts, extends conversations for channel/status.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Conversations: channel type, status, priority, optional CRM links
-- -----------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel_type TEXT NOT NULL DEFAULT 'chat'
    CHECK (channel_type IN ('chat', 'voice_browser', 'voice_phone')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'snoozed')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel_type);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON public.conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations(contact_id) WHERE contact_id IS NOT NULL;

-- Allow org members to update conversation status/assignment (inbox)
CREATE POLICY "Org members can update conversations for inbox"
  ON public.conversations FOR UPDATE
  USING (
    widget_id IN (
      SELECT w.id FROM public.widgets w
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- AI Action invocations (audit log for every action run)
-- -----------------------------------------------------------------------------
CREATE TABLE public.action_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  input_json JSONB DEFAULT '{}',
  output_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed')),
  initiated_by_type TEXT NOT NULL DEFAULT 'ai'
    CHECK (initiated_by_type IN ('ai', 'user', 'human')),
  initiated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_text TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_invocations_org ON public.action_invocations(organization_id);
CREATE INDEX idx_action_invocations_agent ON public.action_invocations(agent_id);
CREATE INDEX idx_action_invocations_conversation ON public.action_invocations(conversation_id);
CREATE INDEX idx_action_invocations_started ON public.action_invocations(started_at DESC);
CREATE INDEX idx_action_invocations_action_key ON public.action_invocations(action_key);

ALTER TABLE public.action_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view action_invocations" ON public.action_invocations
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert action_invocations" ON public.action_invocations
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can update action_invocations" ON public.action_invocations
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

ALTER TABLE public.action_invocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TRIGGER action_invocations_updated_at
  BEFORE UPDATE ON public.action_invocations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.action_invocations IS 'Audit log for AI and user-initiated actions (create_lead, book_appointment, etc.)';

-- -----------------------------------------------------------------------------
-- Bookings / appointments
-- -----------------------------------------------------------------------------
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Appointment',
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'widget', 'api')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX idx_bookings_start_at ON public.bookings(start_at);
CREATE INDEX idx_bookings_conversation ON public.bookings(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_bookings_contact ON public.bookings(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_bookings_lead ON public.bookings(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view bookings" ON public.bookings
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage bookings" ON public.bookings
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
-- Allow insert/update for agent/API (service role) – members can view

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.bookings IS 'Appointments created by AI or manually; first-party scheduling';

-- -----------------------------------------------------------------------------
-- Booking availability (business hours / slots)
-- -----------------------------------------------------------------------------
CREATE TABLE public.booking_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_availability_org ON public.booking_availability(organization_id);

ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view booking_availability" ON public.booking_availability
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage booking_availability" ON public.booking_availability
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE TRIGGER booking_availability_updated_at BEFORE UPDATE ON public.booking_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default appointment duration (minutes) per org – store in business_settings or new column
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS default_booking_duration_minutes INT DEFAULT 30;

-- -----------------------------------------------------------------------------
-- Conversation assignments (inbox: who is handling this conversation)
-- -----------------------------------------------------------------------------
CREATE TABLE public.conversation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_assignments_conversation ON public.conversation_assignments(conversation_id);
CREATE INDEX idx_conversation_assignments_assignee ON public.conversation_assignments(assignee_id);

ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view conversation_assignments" ON public.conversation_assignments
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org members can manage conversation_assignments" ON public.conversation_assignments
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

COMMENT ON TABLE public.conversation_assignments IS 'Inbox: current assignee per conversation (latest per conversation)';

-- -----------------------------------------------------------------------------
-- Conversation tags (inbox filtering)
-- -----------------------------------------------------------------------------
CREATE TABLE public.conversation_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag)
);

CREATE INDEX idx_conversation_tags_conversation ON public.conversation_tags(conversation_id);
CREATE INDEX idx_conversation_tags_tag ON public.conversation_tags(tag);

ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view conversation_tags" ON public.conversation_tags
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org members can manage conversation_tags" ON public.conversation_tags
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- Conversation notes (internal only)
-- -----------------------------------------------------------------------------
CREATE TABLE public.conversation_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_notes_conversation ON public.conversation_notes(conversation_id);

ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view conversation_notes" ON public.conversation_notes
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org members can manage conversation_notes" ON public.conversation_notes
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE TRIGGER conversation_notes_updated_at BEFORE UPDATE ON public.conversation_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Conversation events (timeline: ai_replied, human_replied, escalated, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE public.conversation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_events_conversation ON public.conversation_events(conversation_id);
CREATE INDEX idx_conversation_events_created ON public.conversation_events(created_at DESC);
CREATE INDEX idx_conversation_events_type ON public.conversation_events(event_type);

ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view conversation_events" ON public.conversation_events
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org members can insert conversation_events" ON public.conversation_events
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.widgets w ON w.id = c.widget_id
      WHERE w.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

COMMENT ON COLUMN public.conversation_events.event_type IS 'e.g. ai_replied, human_replied, escalated, assigned, booking_created, lead_created, ticket_created, action_run, voice_call_started, voice_call_ended';

-- -----------------------------------------------------------------------------
-- Escalation events (when AI escalates to human)
-- -----------------------------------------------------------------------------
CREATE TABLE public.escalation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reason TEXT,
  escalated_by_type TEXT NOT NULL DEFAULT 'ai' CHECK (escalated_by_type IN ('ai', 'user', 'system')),
  escalated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalation_events_org ON public.escalation_events(organization_id);
CREATE INDEX idx_escalation_events_conversation ON public.escalation_events(conversation_id);
CREATE INDEX idx_escalation_events_status ON public.escalation_events(status);
CREATE INDEX idx_escalation_events_escalated_at ON public.escalation_events(escalated_at DESC);

ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view escalation_events" ON public.escalation_events
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can manage escalation_events" ON public.escalation_events
  FOR ALL USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- -----------------------------------------------------------------------------
-- Voice sessions (browser or phone)
-- -----------------------------------------------------------------------------
CREATE TABLE public.voice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  widget_id UUID REFERENCES public.widgets(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'browser'
    CHECK (source_type IN ('browser', 'phone', 'api')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'failed', 'escalated')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  transcript_summary TEXT,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_sessions_org ON public.voice_sessions(organization_id);
CREATE INDEX idx_voice_sessions_conversation ON public.voice_sessions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_voice_sessions_agent ON public.voice_sessions(agent_id);
CREATE INDEX idx_voice_sessions_started ON public.voice_sessions(started_at DESC);

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view voice_sessions" ON public.voice_sessions
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can insert voice_sessions" ON public.voice_sessions
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org members can update voice_sessions" ON public.voice_sessions
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER voice_sessions_updated_at BEFORE UPDATE ON public.voice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Voice transcripts (per-session utterances)
-- -----------------------------------------------------------------------------
CREATE TABLE public.voice_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voice_session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  speaker_type TEXT NOT NULL CHECK (speaker_type IN ('user', 'ai', 'human')),
  text TEXT NOT NULL DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence REAL
);

CREATE INDEX idx_voice_transcripts_session ON public.voice_transcripts(voice_session_id);

ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view voice_transcripts" ON public.voice_transcripts
  FOR SELECT USING (
    voice_session_id IN (
      SELECT id FROM public.voice_sessions
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );
CREATE POLICY "Org members can manage voice_transcripts" ON public.voice_transcripts
  FOR ALL USING (
    voice_session_id IN (
      SELECT id FROM public.voice_sessions
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- Inbox / escalation org settings (optional table for config)
-- -----------------------------------------------------------------------------
CREATE TABLE public.org_inbox_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  auto_escalate_confidence_threshold REAL,
  business_hours_only_escalate BOOLEAN NOT NULL DEFAULT false,
  escalation_notification_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_inbox_settings_org ON public.org_inbox_settings(organization_id);
ALTER TABLE public.org_inbox_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view org_inbox_settings" ON public.org_inbox_settings
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage org_inbox_settings" ON public.org_inbox_settings
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE TRIGGER org_inbox_settings_updated_at BEFORE UPDATE ON public.org_inbox_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Voice agent settings (per-agent voice config)
-- -----------------------------------------------------------------------------
CREATE TABLE public.voice_agent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  greeting_text TEXT,
  max_session_duration_seconds INT DEFAULT 1800,
  allow_actions_during_voice BOOLEAN NOT NULL DEFAULT true,
  auto_create_lead BOOLEAN NOT NULL DEFAULT true,
  auto_escalate_to_human_on_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_agent_settings_agent ON public.voice_agent_settings(agent_id);
CREATE INDEX idx_voice_agent_settings_org ON public.voice_agent_settings(organization_id);
ALTER TABLE public.voice_agent_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view voice_agent_settings" ON public.voice_agent_settings
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Org owners/admins can manage voice_agent_settings" ON public.voice_agent_settings
  FOR ALL USING (organization_id IN (SELECT public.get_user_owner_admin_organization_ids(auth.uid())));
CREATE TRIGGER voice_agent_settings_updated_at BEFORE UPDATE ON public.voice_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
