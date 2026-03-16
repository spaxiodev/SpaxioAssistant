/**
 * Automation trigger and action types.
 * Event-driven and webhook-native; all execution runs inside Spaxio.
 */

/** Event types that can trigger automations (subscription targets). */
export const TRIGGER_TYPES = [
  'new_chat_started',
  'lead_form_submitted',
  'quote_request_submitted',
  'conversation_completed',
  'contact_info_captured',
  'manual_test',
  'webhook_received',
  'form_submitted',
  'cta_clicked',
  'schedule_triggered',
  'document_uploaded',
  'lead_created',
  'support_requested',
  'knowledge_query_failed',
  'agent_confidence_low',
] as const;

/** Canonical event type strings for emission (event-driven engine). */
export const EVENT_TYPES = [
  'chat.started',
  'chat.ended',
  'chat.contact_captured',
  'form.submitted',
  'cta.clicked',
  'manual.triggered',
  'webhook.received',
  'schedule.triggered',
  'document.uploaded',
  'lead.created',
  'support.requested',
  'knowledge.query_failed',
  'agent.confidence_low',
  ...TRIGGER_TYPES,
] as const;

export type EventTypeLike = (typeof EVENT_TYPES)[number] | (typeof TRIGGER_TYPES)[number];

export const ACTION_TYPES = [
  'qualify_lead_with_agent',
  'send_email_notification',
  'call_webhook',
  'call_external_url',
  'handoff_to_human',
  'save_lead_record',
  'send_follow_up_message',
  'crm_create_contact',
  'crm_add_note',
  'crm_create_deal',
  'create_support_ticket',
  'crm_create_task',
] as const;

/** Step types for multi-step workflows (automation_steps.step_type). */
export const STEP_TYPES = ['action', 'branch_if', 'delay', 'human_approval'] as const;
export type StepType = (typeof STEP_TYPES)[number];

export type TriggerType = (typeof TRIGGER_TYPES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];

/** Type guard: event_type is a valid trigger for matching automations. */
export function isValidTriggerType(value: string): value is TriggerType {
  return (TRIGGER_TYPES as readonly string[]).includes(value);
}

/** Type guard: action_type is supported by the runner. */
export function isValidActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

/** Max JSON payload size for inbound events (bytes). Prevents abuse. */
export const AUTOMATION_EVENT_PAYLOAD_MAX_BYTES = 100_000;

export const AUTOMATION_STATUSES = ['draft', 'active', 'paused'] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const RUN_STATUSES = ['queued', 'running', 'success', 'failed'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/** Trigger config shape (JSONB). Example: webhook_received might have { path: string }. */
export type TriggerConfig = Record<string, unknown>;

/** Action config shape (JSONB). Example: call_webhook has { url: string, method?: string }. */
export type ActionConfig = Record<string, unknown>;

/** Payload passed into an automation run (e.g. from widget event or manual test). */
export interface AutomationRunInput {
  trigger_type: string;
  conversation_id?: string;
  visitor_id?: string;
  lead?: { name?: string; email?: string; phone?: string; message?: string };
  [key: string]: unknown;
}

/** Result written to automation_runs.output_payload. */
export interface AutomationRunOutput {
  action_executed?: string;
  success?: boolean;
  message?: string;
  external_id?: string;
  [key: string]: unknown;
}

/** Event envelope for event-driven automation matching and run context. */
export interface AutomationEventEnvelope {
  id?: string;
  workspace_id: string;
  source: string;
  event_type: string;
  timestamp: string;
  actor?: { type: string; id?: string; email?: string };
  metadata?: Record<string, unknown>;
  payload: AutomationRunInput;
  trace_id?: string;
  correlation_id?: string;
}
