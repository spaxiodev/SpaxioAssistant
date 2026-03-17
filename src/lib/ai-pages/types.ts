/**
 * AI Pages (full-page AI experiences) types and schemas.
 */

export const AI_PAGE_TYPES = [
  'quote',
  'support',
  'booking',
  'intake',
  'sales',
  'product_finder',
  'general',
  'custom',
] as const;

export type AiPageType = (typeof AI_PAGE_TYPES)[number];

export const DEPLOYMENT_MODES = [
  'widget_only',
  'page_only',
  'widget_and_page',
  'widget_handoff_to_page',
  'hosted_page',
  'embedded_page',
  'both',
] as const;

export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

export interface AiPageConfig {
  goal?: string;
  layout?: 'chat_center' | 'chat_with_sidebar' | 'steps';
  required_fields?: string[];
  optional_fields?: string[];
  [key: string]: unknown;
}

export interface IntakeFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'text';
  required?: boolean;
  description?: string;
}

export interface OutcomeConfig {
  create_quote_request?: boolean;
  create_lead?: boolean;
  create_contact?: boolean;
  create_ticket?: boolean;
  create_intake_summary?: boolean;
  [key: string]: unknown;
}

export interface HandoffConfig {
  allow_widget_handoff?: boolean;
  button_label?: string;
  intro_message?: string;
}

export interface AiPageRow {
  id: string;
  organization_id: string;
  agent_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  page_type: string;
  deployment_mode: string;
  welcome_message: string | null;
  intro_copy: string | null;
  trust_copy: string | null;
  config: AiPageConfig;
  branding_config: Record<string, unknown>;
  intake_schema: IntakeFieldSchema[];
  outcome_config: OutcomeConfig;
  handoff_config: HandoffConfig;
  is_published: boolean;
  is_enabled: boolean;
  pricing_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiPageRunRow {
  id: string;
  organization_id: string;
  ai_page_id: string;
  conversation_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  quote_request_id: string | null;
  support_ticket_id: string | null;
  status: 'active' | 'completed' | 'abandoned';
  session_state: SessionState;
  completion_percent: number;
  summary: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Minimal estimate shape for session state (from pricing engine). */
export interface SessionStateEstimate {
  subtotal: number;
  total: number;
  estimate_low?: number | null;
  estimate_high?: number | null;
  line_items: { rule_name: string; amount: number; label?: string }[];
  confidence: number;
  human_review_recommended?: boolean;
  output_mode?: string;
}

export interface SessionState {
  intent?: string;
  collected_fields?: Record<string, unknown>;
  missing_required?: string[];
  confidence?: number;
  completion_percent?: number;
  summary?: string;
  next_question?: string;
  final_status?: 'draft' | 'submitted' | 'escalated';
  /** Set when pricing engine runs (quote pages). */
  selected_service_id?: string | null;
  estimate?: SessionStateEstimate | null;
  [key: string]: unknown;
}

/** Public config returned for hosted page (no secrets). */
export interface PublicAiPageConfig {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  page_type: string;
  welcome_message: string | null;
  intro_copy: string | null;
  trust_copy: string | null;
  branding_config: Record<string, unknown>;
  intake_schema: IntakeFieldSchema[];
  organization_id: string;
  pricing_profile_id?: string | null;
}

/** Widget-to-page handoff payload (allowlisted, server-controlled). */
export interface PageHandoffPayload {
  handoff_type: 'ai_page';
  target_page_slug: string;
  target_page_type: string;
  button_label: string;
  intro_message?: string;
  context_token?: string;
}

export const QUOTE_INTAKE_FIELDS: IntakeFieldSchema[] = [
  { key: 'project_type', label: 'Project type', type: 'string', required: true },
  { key: 'service_category', label: 'Service category', type: 'string' },
  { key: 'dimensions', label: 'Dimensions / size', type: 'string' },
  { key: 'materials', label: 'Materials', type: 'string' },
  { key: 'urgency', label: 'Urgency', type: 'string' },
  { key: 'location', label: 'Location', type: 'string' },
  { key: 'budget', label: 'Budget', type: 'string' },
  { key: 'contact_name', label: 'Name', type: 'string', required: true },
  { key: 'contact_email', label: 'Email', type: 'string', required: true },
  { key: 'phone', label: 'Phone', type: 'string' },
  { key: 'notes', label: 'Additional notes', type: 'text' },
];

export const SUPPORT_INTAKE_FIELDS: IntakeFieldSchema[] = [
  { key: 'issue_summary', label: 'Issue summary', type: 'string', required: true },
  { key: 'contact_name', label: 'Name', type: 'string', required: true },
  { key: 'contact_email', label: 'Email', type: 'string', required: true },
  { key: 'phone', label: 'Phone', type: 'string' },
  { key: 'details', label: 'Details', type: 'text' },
];

export const INTAKE_BOOKING_FIELDS: IntakeFieldSchema[] = [
  { key: 'contact_name', label: 'Name', type: 'string', required: true },
  { key: 'contact_email', label: 'Email', type: 'string', required: true },
  { key: 'phone', label: 'Phone', type: 'string' },
  { key: 'interest', label: 'Interest / service', type: 'string' },
  { key: 'preferred_time', label: 'Preferred time', type: 'string' },
  { key: 'notes', label: 'Notes', type: 'text' },
];
