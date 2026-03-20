/**
 * AI suggestions: types for proactive business recommendations.
 * Suggestions are grounded in real configuration gaps and data patterns.
 */

export type SuggestionType =
  | 'add_pricing_info'
  | 'add_business_hours'
  | 'enable_lead_capture'
  | 'enable_quote_requests'
  | 'follow_up_high_intent_lead'
  | 'improve_greeting'
  | 'add_faq'
  | 'add_language_support'
  | 'improve_website_info'
  | 'review_quote_rules'
  | 'enable_follow_up'
  | 'improve_lead_capture_questions'
  | 'add_missing_service_info'
  | 'review_high_priority_leads'
  | 'setup_incomplete'
  | 'custom';

export type SuggestionStatus = 'active' | 'dismissed' | 'completed' | 'snoozed';

export interface AiSuggestion {
  id: string;
  organization_id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  action_href?: string | null;
  action_label?: string | null;
  priority: number;
  status: SuggestionStatus;
  dismissed_at?: string | null;
  completed_at?: string | null;
  grounding_data?: Record<string, unknown>;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Input context used to generate suggestions. */
export interface SuggestionContext {
  organizationId: string;
  businessSettings: {
    business_name?: string | null;
    website_url?: string | null;
    website_learned_at?: string | null;
    description?: string | null;
    industry?: string | null;
    business_hours?: unknown;
    services?: unknown;
  } | null;
  agentCount: number;
  knowledgeSourceCount: number;
  leadCount: number;
  highPriorityLeadCount: number;
  unreviewedHighPriorityLeadCount: number;
  quoteRequestCount: number;
  pendingQuoteCount: number;
  hasQuotePricingProfile: boolean;
  hasPricingRules: boolean;
  hasFollowUpAutomation: boolean;
  conversationsCount: number;
  followUpEmailsEnabled: boolean;
  aiFollowUpEnabled: boolean;
  widgetEnabled: boolean;
  languagesUsed?: string[];
  defaultLanguage?: string | null;
  existingSuggestionTypes?: SuggestionType[];
}

/** A generated suggestion candidate (before DB persistence). */
export interface SuggestionCandidate {
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  action_href?: string;
  action_label?: string;
  priority: number;
  grounding_data?: Record<string, unknown>;
  expires_at?: string;
}
