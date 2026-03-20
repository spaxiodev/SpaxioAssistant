-- Migration: AI suggestions, conversation insights, and new intelligence features
-- Extends existing schema for: AI suggestions layer, conversation learning, advanced analytics
-- All tables are org-scoped and protected by RLS.

-- ============================================================
-- 1. ai_suggestions — proactive recommendations for businesses
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Suggestion type for routing and display
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'add_pricing_info',
    'add_business_hours',
    'enable_lead_capture',
    'enable_quote_requests',
    'follow_up_high_intent_lead',
    'improve_greeting',
    'add_faq',
    'add_language_support',
    'improve_website_info',
    'review_quote_rules',
    'enable_follow_up',
    'improve_lead_capture_questions',
    'add_missing_service_info',
    'review_high_priority_leads',
    'setup_incomplete',
    'custom'
  )),
  -- Human-readable content
  title           text NOT NULL,
  description     text NOT NULL,
  -- Optional action link (relative path)
  action_href     text,
  action_label    text,
  -- Priority for ordering (higher = more urgent)
  priority        int NOT NULL DEFAULT 50,
  -- Dismissal / interaction state
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed', 'snoozed')),
  dismissed_at    timestamptz,
  completed_at    timestamptz,
  -- Data grounding: what evidence drove this suggestion
  grounding_data  jsonb DEFAULT '{}',
  -- Expiry: suggestions can auto-expire
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_suggestions_org_status_idx ON ai_suggestions (organization_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS ai_suggestions_org_type_idx ON ai_suggestions (organization_id, suggestion_type);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's suggestions
CREATE POLICY "ai_suggestions_select" ON ai_suggestions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Org members can update (dismiss/complete) suggestions
CREATE POLICY "ai_suggestions_update" ON ai_suggestions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Service role can insert/delete
CREATE POLICY "ai_suggestions_service_insert" ON ai_suggestions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ai_suggestions_service_delete" ON ai_suggestions
  FOR DELETE USING (true);

-- ============================================================
-- 2. conversation_insights — aggregated learning from conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_insights (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Period this insight covers
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  -- Insight type
  insight_type          text NOT NULL CHECK (insight_type IN (
    'frequent_question',
    'pricing_confusion',
    'service_inquiry',
    'location_inquiry',
    'hours_inquiry',
    'drop_off_pattern',
    'lead_conversion_signal',
    'missing_info_gap',
    'language_pattern',
    'escalation_pattern'
  )),
  -- Main content
  topic                 text NOT NULL,
  occurrence_count      int NOT NULL DEFAULT 1,
  -- Sample messages (anonymized) for context
  sample_messages       jsonb DEFAULT '[]',
  -- Suggested action from this insight
  suggested_action      text,
  -- Raw analysis data
  analysis_data         jsonb DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_start, insight_type, topic)
);

CREATE INDEX IF NOT EXISTS conv_insights_org_period_idx ON conversation_insights (organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS conv_insights_org_type_idx ON conversation_insights (organization_id, insight_type);

ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_insights_select" ON conversation_insights
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "conversation_insights_service_write" ON conversation_insights
  FOR ALL USING (true);

-- ============================================================
-- 3. lead_intelligence_cache — cached lead analysis aggregates
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_intelligence_cache (
  organization_id       uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- Counts by priority
  high_priority_count   int NOT NULL DEFAULT 0,
  medium_priority_count int NOT NULL DEFAULT 0,
  low_priority_count    int NOT NULL DEFAULT 0,
  -- Counts needing follow-up
  needs_followup_count  int NOT NULL DEFAULT 0,
  -- Recent high-intent leads (last 7 days)
  recent_high_intent    jsonb DEFAULT '[]',
  -- Top requested services
  top_services          jsonb DEFAULT '[]',
  -- Score distribution summary
  avg_lead_score        numeric(5,2),
  -- Stale marker
  computed_at           timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

ALTER TABLE lead_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_intelligence_cache_select" ON lead_intelligence_cache
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "lead_intelligence_cache_service_write" ON lead_intelligence_cache
  FOR ALL USING (true);

-- ============================================================
-- 4. industry_presets — industry-aware assistant behavior config
-- ============================================================
CREATE TABLE IF NOT EXISTS industry_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key  text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  -- Recommended setup configuration
  config        jsonb NOT NULL DEFAULT '{}',
  -- Suggested templates for this industry
  suggested_templates jsonb DEFAULT '[]',
  -- Sample FAQs
  sample_faqs   jsonb DEFAULT '[]',
  -- Primary CTA type for this industry
  primary_cta   text DEFAULT 'lead_capture',
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 50,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - read-only reference data
ALTER TABLE industry_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industry_presets_public_read" ON industry_presets
  FOR SELECT USING (is_active = true);

-- Seed industry presets
INSERT INTO industry_presets (industry_key, display_name, config, suggested_templates, sample_faqs, primary_cta, sort_order)
VALUES
  (
    'home_services',
    'Home Services',
    '{"tone": "friendly and professional", "primary_goal": "capture leads and quote requests from homeowners", "lead_capture_enabled": true, "quote_request_enabled": true, "suggested_greeting": "Hi! I''m here to help you get a fast quote for your project. What can I help with today?"}',
    '["quote_request_capture", "lead_capture", "email_notification"]',
    '[{"q": "Do you offer free estimates?", "a": "Yes, we offer free estimates. Tell me about your project and I''ll collect your details for the team."}, {"q": "What areas do you serve?", "a": "We serve [your service area]. Want me to check if we cover your location?"}, {"q": "How quickly can you come out?", "a": "Availability varies by project. Fill out our quick form and we''ll confirm timing."}]',
    'quote_request_capture',
    10
  ),
  (
    'agency_consulting',
    'Agency / Consulting',
    '{"tone": "professional and confident", "primary_goal": "capture consultation requests and qualify project inquiries", "lead_capture_enabled": true, "quote_request_enabled": true, "suggested_greeting": "Hello! I can answer questions about our services and help you get started. What are you looking for?"}',
    '["lead_capture", "appointment_request_capture", "email_notification", "crm_push"]',
    '[{"q": "What services do you offer?", "a": "We specialize in [your services]. Would you like to discuss your specific project?"}, {"q": "What''s your typical project timeline?", "a": "It depends on scope. Most projects take [typical range]. Want to schedule a consultation?"}, {"q": "How much do you charge?", "a": "Pricing depends on your requirements. Let me collect some details so we can give you an accurate estimate."}]',
    'lead_capture',
    20
  ),
  (
    'local_service_business',
    'Local Service Business',
    '{"tone": "friendly and helpful", "primary_goal": "answer common questions and capture contact info", "lead_capture_enabled": true, "quote_request_enabled": false, "suggested_greeting": "Hi! Happy to help. Ask me anything about our services, hours, or location."}',
    '["lead_capture", "faq_chatbot", "email_notification"]',
    '[{"q": "What are your hours?", "a": "We''re open [hours]. You can also contact us through this chat anytime."}, {"q": "Where are you located?", "a": "We''re located at [address]. Need directions?"}, {"q": "Do you take walk-ins?", "a": "Yes we do! You can also book ahead to avoid wait times."}]',
    'lead_capture',
    30
  ),
  (
    'ecommerce_retail',
    'E-commerce / Retail',
    '{"tone": "helpful and upbeat", "primary_goal": "answer product questions and help customers find what they need", "lead_capture_enabled": false, "quote_request_enabled": false, "suggested_greeting": "Hi! Looking for something specific? I can help you find the right product or answer any questions."}',
    '["faq_chatbot", "support_intake", "email_notification"]',
    '[{"q": "Do you offer free shipping?", "a": "Yes, we offer free shipping on orders over [threshold]."}, {"q": "What''s your return policy?", "a": "We have a [X]-day return policy. Full details are on our returns page."}, {"q": "Is this item in stock?", "a": "Let me check. Which item are you looking at?"}]',
    'faq_chatbot',
    40
  ),
  (
    'clinic_healthcare',
    'Clinic / Healthcare',
    '{"tone": "warm, professional, and reassuring", "primary_goal": "answer questions and help patients book appointments", "lead_capture_enabled": true, "quote_request_enabled": false, "suggested_greeting": "Hello! I can help answer questions about our services and help you schedule an appointment."}',
    '["appointment_request_capture", "faq_chatbot", "email_notification"]',
    '[{"q": "Are you accepting new patients?", "a": "Yes, we''re currently accepting new patients. Would you like to schedule an appointment?"}, {"q": "Do you accept my insurance?", "a": "We accept most major plans. Please contact us with your insurance details and we''ll confirm coverage."}, {"q": "What are your hours?", "a": "We''re open [hours]. Emergency contacts are available [if applicable]."}]',
    'appointment_request_capture',
    50
  ),
  (
    'saas_software',
    'SaaS / Software',
    '{"tone": "clear, helpful, and tech-savvy", "primary_goal": "answer product questions, capture trial signups, and escalate support", "lead_capture_enabled": true, "quote_request_enabled": false, "suggested_greeting": "Hey! I can answer questions about the product, pricing, or help you get started."}',
    '["lead_capture", "support_intake", "faq_chatbot", "slack_notification"]',
    '[{"q": "Is there a free trial?", "a": "Yes! You can start a free [X]-day trial. Want me to help you sign up?"}, {"q": "How does pricing work?", "a": "We have [plans]. I can walk you through which plan fits your needs."}, {"q": "Do you have an API?", "a": "Yes, we have a full API. Documentation is at [link]."}]',
    'lead_capture',
    60
  )
ON CONFLICT (industry_key) DO NOTHING;

-- ============================================================
-- 5. Add new entitlement keys to plan_entitlements reference
--    (No schema change needed - entitlement system uses key-value rows)
--    Document new keys here for migration reference:
--
--    ai_lead_scoring_enabled    boolean  (default false) - enables AI lead qualification
--    analytics_advanced_enabled boolean  (default false) - enables advanced analytics
--    ai_suggestions_enabled     boolean  (default false) - enables proactive AI suggestions
--    advanced_branding_enabled  boolean  (default false) - enables advanced widget branding
--    conversation_learning_enabled boolean (default false) - enables conversation insights
--
-- These will be inserted via seeding or Stripe webhook plan sync.
-- ============================================================

COMMENT ON TABLE ai_suggestions IS 'Proactive AI recommendations for businesses, grounded in real data.';
COMMENT ON TABLE conversation_insights IS 'Aggregated patterns learned from conversations, used for optimization suggestions.';
COMMENT ON TABLE lead_intelligence_cache IS 'Cached lead quality aggregates for dashboard intelligence.';
COMMENT ON TABLE industry_presets IS 'Industry-specific assistant behavior presets for setup.';
