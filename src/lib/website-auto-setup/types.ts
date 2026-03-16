/**
 * Website auto-setup: run status and result types.
 */

export const SETUP_RUN_STATUSES = [
  'pending',
  'scanning',
  'building_knowledge',
  'creating_agents',
  'creating_automations',
  'configuring_widget',
  'done',
  'failed',
] as const;

export type SetupRunStatus = (typeof SETUP_RUN_STATUSES)[number];

export interface WebsiteAnalysis {
  business_name?: string | null;
  company_description?: string | null;
  services_offered?: string[] | null;
  faq?: Array<{ q: string; a: string }> | null;
  contact_email?: string | null;
  phone?: string | null;
  tone_of_voice?: string | null;
  key_pages?: string[] | null;
}

export interface SetupRunResultSummary {
  business_name?: string;
  knowledge_source_id?: string;
  agent_ids?: string[];
  automation_ids?: string[];
  widget_updated?: boolean;
  steps_completed?: string[];
}
