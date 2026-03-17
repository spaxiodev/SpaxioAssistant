/**
 * Types for AI Business Setup: drafts, extracted sections, and publish results.
 */

export type BusinessSetupDraftStatus =
  | 'draft'
  | 'extracting'
  | 'ready'
  | 'partially_published'
  | 'published'
  | 'failed';

export type DraftSectionKey =
  | 'business_profile'
  | 'services'
  | 'knowledge'
  | 'pricing'
  | 'agents'
  | 'automations'
  | 'widget_config'
  | 'ai_pages'
  | 'branding';

export interface SourceInputs {
  website_url?: string | null;
  pasted_text?: string | null;
  uploaded_file_summaries?: string[];
  chat_summary?: string | null;
  pricing_text?: string | null;
  faq_text?: string | null;
  service_descriptions?: string | null;
  branding_notes?: string | null;
  /** Raw combined text sent to extraction (for audit) */
  combined_text_preview?: string | null;
}

/** Extracted business profile (maps to business_settings) */
export interface ExtractedBusinessProfile {
  business_name?: string | null;
  company_description?: string | null;
  industry?: string | null;
  service_area?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  business_hours?: string | null;
  tone_of_voice?: string | null;
  welcome_message_suggestion?: string | null;
  lead_notification_email?: string | null;
}

/** Single service for services_offered or quote_services */
export interface ExtractedService {
  name: string;
  description?: string | null;
  slug?: string | null;
  likely_quoteable?: boolean;
}

/** Extracted knowledge: FAQs, policies, support topics, facts */
export interface ExtractedKnowledge {
  faqs?: Array<{ q: string; a: string }>;
  policies?: string[];
  support_topics?: string[];
  business_facts?: string[];
  website_derived_summary?: string | null;
}

/** Draft pricing: patterns, variables, rules, add-ons (maps to quote_pricing_*) */
export interface ExtractedPricing {
  industry_hint?: string | null;
  currency?: string;
  services?: Array<{ name: string; slug: string; description?: string; base_price?: number }>;
  variables?: Array<{
    key: string;
    label: string;
    variable_type: string;
    unit_label?: string;
    required?: boolean;
  }>;
  rules?: Array<{
    rule_type: string;
    name: string;
    config: Record<string, unknown>;
    sort_order?: number;
  }>;
  pricing_notes?: string | null;
  estimate_behavior?: string | null;
}

/** Recommended agent (name, role_type, system_prompt snippet) */
export interface ExtractedAgent {
  name: string;
  role_type: string;
  description?: string | null;
  system_prompt_snippet?: string | null;
  suggested_tools?: string[];
}

/** Recommended automation */
export interface ExtractedAutomation {
  name: string;
  description?: string | null;
  trigger_type: string;
  action_type: string;
  trigger_config?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
}

/** Widget / AI Page suggestions */
export interface ExtractedWidgetConfig {
  welcome_message?: string | null;
  primary_color?: string | null;
  position?: string | null;
}

export interface ExtractedAIPageSuggestion {
  title: string;
  slug: string;
  page_type: string;
  description?: string | null;
  welcome_message?: string | null;
  handoff_suggestion?: string | null;
}

/** Branding / voice */
export interface ExtractedBranding {
  tone_of_voice?: string | null;
  welcome_message?: string | null;
  tagline?: string | null;
}

export interface SectionApprovals {
  business_profile?: 'approved' | 'rejected' | 'edited';
  services?: 'approved' | 'rejected' | 'edited';
  knowledge?: 'approved' | 'rejected' | 'edited';
  pricing?: 'approved' | 'rejected' | 'edited';
  agents?: 'approved' | 'rejected' | 'edited';
  automations?: 'approved' | 'rejected' | 'edited';
  widget_config?: 'approved' | 'rejected' | 'edited';
  ai_pages?: 'approved' | 'rejected' | 'edited';
  branding?: 'approved' | 'rejected' | 'edited';
}

export interface ConfidenceScores {
  business_profile?: number;
  services?: number;
  knowledge?: number;
  pricing?: number;
  agents?: number;
  automations?: number;
  widget_config?: number;
  ai_pages?: number;
  branding?: number;
}

export interface BusinessSetupDraftRow {
  id: string;
  organization_id: string;
  status: BusinessSetupDraftStatus;
  current_step: string | null;
  error_message: string | null;
  source_inputs: SourceInputs;
  extracted_business_profile: ExtractedBusinessProfile | null;
  extracted_services: ExtractedService[] | null;
  extracted_knowledge: ExtractedKnowledge | null;
  extracted_pricing: ExtractedPricing | null;
  extracted_agents: ExtractedAgent[] | null;
  extracted_automations: ExtractedAutomation[] | null;
  extracted_widget_config: ExtractedWidgetConfig | null;
  extracted_ai_pages: ExtractedAIPageSuggestion[] | null;
  extracted_branding: ExtractedBranding | null;
  assumptions: string[];
  missing_items: string[];
  confidence_scores: ConfidenceScores;
  section_approvals: SectionApprovals;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface PublishSectionResult {
  section: DraftSectionKey;
  created: string[];
  updated: string[];
  skipped: string[];
  error?: string;
}

export interface PublishDraftResult {
  success: boolean;
  sections: PublishSectionResult[];
  errors: string[];
}
