/**
 * Spaxio AI Platform — shared types for all pillars.
 * Aligns with DB schema; use for API payloads, forms, and UI state.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// -----------------------------------------------------------------------------
// Workspace & auth
// -----------------------------------------------------------------------------
export const WORKSPACE_ROLES = ['owner', 'admin', 'manager', 'agent_operator', 'member', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// -----------------------------------------------------------------------------
// Agents
// -----------------------------------------------------------------------------
export const AGENT_ROLE_TYPES = [
  'website_chatbot',
  'support_agent',
  'lead_qualification',
  'internal_knowledge',
  'workflow_agent',
  'sales_agent',
  'booking_agent',
  'quote_assistant',
  'faq_agent',
  'follow_up_agent',
  'custom',
] as const;
export type AgentRoleType = (typeof AGENT_ROLE_TYPES)[number];

export const AGENT_RUN_STATUSES = ['running', 'success', 'failed'] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export interface AgentConfig {
  name: string;
  description: string | null;
  role_type: AgentRoleType;
  goal: string | null;
  system_prompt: string | null;
  tone: string | null;
  model_provider: string;
  model_id: string;
  temperature: number;
  enabled_tools: string[];
  linked_knowledge_source_ids: string[];
  linked_automation_ids: string[];
  crm_access: Record<string, unknown>;
  fallback_behavior: string | null;
  escalation_behavior: string | null;
  allowed_actions: string[];
  memory_short_term_enabled: boolean;
  memory_long_term_enabled: boolean;
}

export interface AgentRun {
  id: string;
  organization_id: string;
  agent_id: string;
  status: AgentRunStatus;
  trigger_type: string | null;
  trigger_metadata: Json;
  conversation_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  model_used: string | null;
  usage_input_tokens: number | null;
  usage_output_tokens: number | null;
  error_message: string | null;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  agent_run_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Json;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Automations
// -----------------------------------------------------------------------------
export const AUTOMATION_STATUSES = ['draft', 'active', 'paused'] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const RUN_STATUSES = ['queued', 'running', 'success', 'failed'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const NODE_KINDS = ['trigger', 'logic', 'action'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const TRIGGER_BLOCK_TYPES = [
  'webhook',
  'chatbot_conversation',
  'form_submission',
  'new_lead',
  'new_contact',
  'payment_received',
  'appointment_booked',
  'file_uploaded',
  'email_received',
  'manual',
  'api',
] as const;

export const LOGIC_BLOCK_TYPES = [
  'if_else',
  'filter',
  'delay',
  'ai_classifier',
  'ai_extraction',
  'switch',
  'transform_data',
  'loop',
  'merge',
  'rate_limit_guard',
  'human_approval',
] as const;

export const ACTION_BLOCK_TYPES = [
  'create_lead',
  'update_lead',
  'create_contact',
  'create_deal',
  'create_ticket',
  'send_email',
  'notify_team',
  'tag_record',
  'save_to_database',
  'generate_document',
  'run_agent',
  'query_knowledge',
  'call_internal_api',
  'call_external_api',
  'create_task',
  'assign_owner',
  'add_note',
  'log_activity',
  'schedule_follow_up',
] as const;

export interface AutomationNode {
  id: string;
  automation_id: string;
  node_kind: NodeKind;
  block_type: string;
  position_x: number;
  position_y: number;
  config_json: Json;
  created_at: string;
  updated_at: string;
}

export interface AutomationEdge {
  id: string;
  automation_id: string;
  from_node_id: string;
  to_node_id: string;
  slot: string | null;
  created_at: string;
}

export interface AutomationRunInput {
  trigger_type: string;
  conversation_id?: string;
  visitor_id?: string;
  lead?: { name?: string; email?: string; phone?: string; message?: string };
  [key: string]: unknown;
}

// Variable syntax: {{trigger.name}}, {{lead.email}}, {{agent.output.summary}}
export function interpolateVariables(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.trim().split('.');
    let v: unknown = context;
    for (const p of parts) v = v != null && typeof v === 'object' ? (v as Record<string, unknown>)[p] : undefined;
    return v != null ? String(v) : '';
  });
}

// -----------------------------------------------------------------------------
// Knowledge
// -----------------------------------------------------------------------------
export interface KnowledgeBase {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  id: string;
  organization_id: string;
  knowledge_base_id: string | null;
  name: string;
  source_type: string;
  config: Json;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const KNOWLEDGE_SOURCE_TYPES = [
  'website_crawl',
  'manual_text',
  'pdf_upload',
  'docx_upload',
  'pasted_content',
  'notion_link',
  'custom',
] as const;

// -----------------------------------------------------------------------------
// Webhooks
// -----------------------------------------------------------------------------
export interface WebhookEndpoint {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_message: string | null;
  created_at: string;
  updated_at: string;
}

export const WEBHOOK_FIELD_TYPES = ['text', 'email', 'phone', 'number', 'boolean', 'date', 'json'] as const;
export type WebhookFieldType = (typeof WEBHOOK_FIELD_TYPES)[number];

export interface WebhookFieldMapping {
  id: string;
  endpoint_id: string;
  source_path: string;
  target_key: string;
  value_type: WebhookFieldType;
  required: boolean;
  default_value: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// CRM
// -----------------------------------------------------------------------------
export const LEAD_STAGES = ['new', 'qualified', 'proposal_sent', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const DEAL_STAGES = ['qualification', 'proposal', 'negotiation', 'won', 'lost'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const TICKET_STATUSES = ['open', 'awaiting_user', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Contact {
  id: string;
  organization_id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  organization_id: string;
  name: string;
  domain: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  organization_id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  value_cents: number;
  stage: DealStage;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  assignee_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  title: string;
  due_at: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  organization_id: string;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  organization_id: string;
  subject_type: string;
  subject_id: string;
  activity_type: string;
  metadata: Json;
  actor_id: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Documents
// -----------------------------------------------------------------------------
export const DOCUMENT_TEMPLATE_TYPES = [
  'quote',
  'proposal',
  'invoice',
  'support_summary',
  'follow_up',
  'lead_report',
  'custom',
] as const;
export type DocumentTemplateType = (typeof DOCUMENT_TEMPLATE_TYPES)[number];

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  name: string;
  template_type: DocumentTemplateType;
  content: string;
  variables_schema: Json;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  template_id: string | null;
  name: string;
  content: string;
  file_url: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  automation_run_id: string | null;
  agent_run_id: string | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Memory
// -----------------------------------------------------------------------------
export const MEMORY_SCOPES = ['short_term', 'long_term', 'workspace', 'agent'] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export interface MemoryRecord {
  id: string;
  organization_id: string;
  entity_type: 'contact' | 'lead' | 'conversation' | 'agent' | 'workspace';
  entity_id: string;
  scope: MemoryScope;
  content: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Deployments
// -----------------------------------------------------------------------------
export const DEPLOYMENT_TYPES = ['website_widget', 'embedded_chat', 'standalone_page', 'dashboard_panel', 'api'] as const;
export type DeploymentType = (typeof DEPLOYMENT_TYPES)[number];

export interface DeploymentConfig {
  id: string;
  organization_id: string;
  agent_id: string;
  deployment_type: DeploymentType;
  config: Json;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Actions / Tools (schema for execution)
// -----------------------------------------------------------------------------
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permissionRequirements?: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  message?: string;
  data?: Json;
  humanReadable?: string;
}

// -----------------------------------------------------------------------------
// AI Actions (invocation audit, action registry keys)
// -----------------------------------------------------------------------------
export const ACTION_INVOCATION_STATUSES = ['pending', 'success', 'failed'] as const;
export type ActionInvocationStatus = (typeof ACTION_INVOCATION_STATUSES)[number];

export const INITIATED_BY_TYPES = ['ai', 'user', 'human'] as const;
export type InitiatedByType = (typeof INITIATED_BY_TYPES)[number];

export interface ActionInvocation {
  id: string;
  organization_id: string;
  agent_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  action_key: string;
  input_json: Json;
  output_json: Json | null;
  status: ActionInvocationStatus;
  initiated_by_type: InitiatedByType;
  initiated_by_user_id: string | null;
  error_text: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Registry keys for AI actions (create_lead, update_lead, create_booking, etc.) */
export const AI_ACTION_KEYS = [
  'create_lead',
  'update_lead',
  'create_contact',
  'create_company',
  'create_deal',
  'update_deal_stage',
  'create_ticket',
  'create_task',
  'add_note',
  'generate_quote_request',
  'generate_document',
  'trigger_automation',
  'send_email',
  'schedule_booking',
  'create_follow_up_reminder',
  'tag_conversation',
  'assign_conversation',
  'escalate_to_human',
  'call_webhook',
] as const;
export type AiActionKey = (typeof AI_ACTION_KEYS)[number];

// -----------------------------------------------------------------------------
// Bookings / appointments
// -----------------------------------------------------------------------------
export const BOOKING_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ['ai', 'manual', 'widget', 'api'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export interface Booking {
  id: string;
  organization_id: string;
  contact_id: string | null;
  lead_id: string | null;
  conversation_id: string | null;
  agent_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  status: BookingStatus;
  source: BookingSource;
  created_at: string;
  updated_at: string;
}

export interface BookingAvailability {
  id: string;
  organization_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Inbox: conversation channel, status, assignments, notes, tags, events
// -----------------------------------------------------------------------------
export const CONVERSATION_CHANNEL_TYPES = ['chat', 'voice_browser', 'voice_phone'] as const;
export type ConversationChannelType = (typeof CONVERSATION_CHANNEL_TYPES)[number];

export const CONVERSATION_STATUSES = ['open', 'closed', 'snoozed'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const CONVERSATION_PRIORITIES = ['low', 'normal', 'high'] as const;
export type ConversationPriority = (typeof CONVERSATION_PRIORITIES)[number];

export interface ConversationAssignment {
  id: string;
  conversation_id: string;
  assignee_id: string;
  assigned_by_id: string | null;
  assigned_at: string;
  created_at: string;
}

export interface ConversationTag {
  id: string;
  conversation_id: string;
  tag: string;
  created_at: string;
}

export interface ConversationNote {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const CONVERSATION_EVENT_TYPES = [
  'ai_replied',
  'human_replied',
  'escalated',
  'assigned',
  'booking_created',
  'lead_created',
  'ticket_created',
  'action_run',
  'voice_call_started',
  'voice_call_ended',
] as const;
export type ConversationEventType = (typeof CONVERSATION_EVENT_TYPES)[number];

export interface ConversationEvent {
  id: string;
  conversation_id: string;
  event_type: string;
  metadata: Json;
  actor_id: string | null;
  created_at: string;
}

export const ESCALATION_STATUSES = ['pending', 'acknowledged', 'resolved'] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export interface EscalationEvent {
  id: string;
  organization_id: string;
  conversation_id: string;
  reason: string | null;
  escalated_by_type: 'ai' | 'user' | 'system';
  escalated_by_user_id: string | null;
  status: EscalationStatus;
  escalated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface OrgInboxSettings {
  id: string;
  organization_id: string;
  auto_escalate_confidence_threshold: number | null;
  business_hours_only_escalate: boolean;
  escalation_notification_emails: string[];
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Voice sessions and transcripts
// -----------------------------------------------------------------------------
export const VOICE_SOURCE_TYPES = ['browser', 'phone', 'api'] as const;
export type VoiceSourceType = (typeof VOICE_SOURCE_TYPES)[number];

export const VOICE_SESSION_STATUSES = ['active', 'ended', 'failed', 'escalated'] as const;
export type VoiceSessionStatus = (typeof VOICE_SESSION_STATUSES)[number];

export interface VoiceSession {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  agent_id: string | null;
  widget_id: string | null;
  source_type: VoiceSourceType;
  status: VoiceSessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript_summary: string | null;
  escalated_to_human: boolean;
  created_at: string;
  updated_at: string;
}

export const VOICE_SPEAKER_TYPES = ['user', 'ai', 'human'] as const;
export type VoiceSpeakerType = (typeof VOICE_SPEAKER_TYPES)[number];

export interface VoiceTranscript {
  id: string;
  voice_session_id: string;
  speaker_type: VoiceSpeakerType;
  text: string;
  timestamp: string;
  confidence: number | null;
}

export interface VoiceAgentSettings {
  id: string;
  agent_id: string;
  organization_id: string;
  voice_enabled: boolean;
  greeting_text: string | null;
  max_session_duration_seconds: number;
  allow_actions_during_voice: boolean;
  auto_create_lead: boolean;
  auto_escalate_to_human_on_end: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------
export interface AnalyticsEvent {
  id: string;
  organization_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface AnalyticsSummary {
  totalConversations: number;
  agentRuns: number;
  automationRuns: number;
  successfulRuns: number;
  failedRuns: number;
  webhookEvents: number;
  leadsCreated: number;
  dealsCreated: number;
  ticketsCreated: number;
  documentsGenerated: number;
}

/** Extended analytics for actions, inbox, voice */
export interface AnalyticsSummaryExtended extends AnalyticsSummary {
  actionRuns: number;
  actionSuccessCount: number;
  actionFailureCount: number;
  bookingsCreated: number;
  escalationsCount: number;
  humanTakeoverCount: number;
  voiceSessionCount: number;
  voiceMinutes: number;
}
