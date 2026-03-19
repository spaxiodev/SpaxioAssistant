/**
 * Single source of truth for trigger and action display labels.
 * Used by dashboard list, create/edit modal, and run detail.
 */

export const TRIGGER_LABELS: Record<string, string> = {
  new_chat_started: 'New chat started',
  lead_form_submitted: 'Lead form submitted',
  quote_request_submitted: 'Quote request submitted',
  conversation_started: 'Conversation started',
  conversation_abandoned: 'Conversation abandoned',
  new_high_intent_lead: 'High-intent lead',
  no_reply_after_time_window: 'No reply after time window',
  manual_follow_up_requested: 'Manual follow-up request',
  conversation_completed: 'Conversation completed',
  contact_info_captured: 'Contact info captured',
  manual_test: 'Manual test',
  webhook_received: 'Webhook received',
  form_submitted: 'Form submitted',
  cta_clicked: 'CTA clicked',
  schedule_triggered: 'Schedule triggered',
  document_uploaded: 'Document uploaded',
  lead_created: 'Lead created',
  support_requested: 'Support requested',
  knowledge_query_failed: 'Knowledge query failed',
  agent_confidence_low: 'Agent confidence low',
};

export const ACTION_LABELS: Record<string, string> = {
  qualify_lead_with_agent: 'Qualify lead with agent',
  send_email_notification: 'Send email notification',
  call_webhook: 'Call webhook',
  call_external_url: 'Call external URL',
  handoff_to_human: 'Handoff to human',
  save_lead_record: 'Save lead record',
  send_follow_up_message: 'Send follow-up message',
  generate_followup_draft: 'Generate follow-up draft',
  send_internal_summary: 'Send internal summary',
  schedule_followup: 'Schedule follow-up',
  crm_create_contact: 'CRM: Create contact',
  crm_add_note: 'CRM: Add note',
};

export const STEP_TYPE_LABELS: Record<string, string> = {
  action: 'Action',
  branch_if: 'Condition (if/else)',
  delay: 'Delay',
  human_approval: 'Human approval',
};

export function getTriggerLabel(triggerType: string): string {
  return TRIGGER_LABELS[triggerType] ?? triggerType;
}

export function getActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType;
}

export function getStepTypeLabel(stepType: string): string {
  return STEP_TYPE_LABELS[stepType] ?? stepType;
}
