/**
 * Structured config produced by the AI Setup Assistant planner.
 * Maps user intent to supported features only.
 */

export type CaptureField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
};

export type QualificationRule = {
  type: 'keyword' | 'intent' | 'min_fields';
  value?: string;
  config?: Record<string, unknown>;
};

export type WidgetConfig = {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcomeMessage?: string;
  primaryColor?: string;
  /** Public URL for widget bubble logo (requires custom_branding). */
  widgetLogoUrl?: string;
};

export type QuoteFormConfig = {
  intro_text?: string;
  submit_button_label?: string;
  name_required?: boolean;
  email_required?: boolean;
  phone_required?: boolean;
  show_estimate_instantly?: boolean;
  show_exact_estimate?: boolean;
};

export type AutomationTemplateKey =
  | 'lead_capture'
  | 'quote_request_capture'
  | 'appointment_request_capture'
  | 'faq_chatbot'
  | 'support_intake'
  | 'email_notification'
  | 'webhook_workflow'
  | 'google_sheets_logging'
  | 'crm_push'
  | 'slack_notification';

export interface AssistantPlannerConfig {
  chatbot_name?: string;
  business_type?: string;
  primary_goal?: string;
  capture_fields?: CaptureField[];
  qualification_rules?: QualificationRule[];
  automation_type?: AutomationTemplateKey | AutomationTemplateKey[];
  notification_email?: string;
  webhook_enabled?: boolean;
  webhook_secret?: string;
  widget_enabled?: boolean;
  widget_config?: WidgetConfig;
  quote_form_config?: QuoteFormConfig;
  follow_up_enabled?: boolean;
  integrations?: Record<string, unknown>;
  publish_status?: 'draft' | 'published';
  /** Template keys applied (for summary) */
  applied_templates?: AutomationTemplateKey[];
}

export const DEFAULT_PLANNER_CONFIG: AssistantPlannerConfig = {
  chatbot_name: 'Assistant',
  business_type: '',
  primary_goal: '',
  capture_fields: [],
  qualification_rules: [],
  automation_type: undefined,
  notification_email: undefined,
  webhook_enabled: false,
  widget_enabled: true,
  widget_config: {},
  follow_up_enabled: false,
  integrations: {},
  publish_status: 'draft',
  applied_templates: [],
};
