/**
 * Types for AI website scanner and auto-setup.
 */

export type AiSetupRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type AiSetupStep =
  | 'scanning_website'
  | 'extracting_info'
  | 'updating_settings'
  | 'building_knowledge'
  | 'creating_agents'
  | 'creating_automations'
  | 'configuring_widget'
  | 'done';

export interface WebsiteExtraction {
  business_name: string | null;
  services: string[];
  faqs: Array<{ q: string; a: string }>;
  contact_email: string | null;
  contact_phone: string | null;
  tone_of_voice: string | null;
  company_description: string | null;
  key_pages: string[];
}

export interface AiSetupRunResult {
  step: AiSetupStep;
  extraction?: WebsiteExtraction;
  businessSettingsUpdated?: boolean;
  knowledgeSourceId?: string;
  knowledgeChunksCreated?: number;
  agentIds?: string[];
  automationIds?: string[];
  widgetConfigured?: boolean;
  error?: string;
}
