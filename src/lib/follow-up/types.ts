/**
 * AI Follow-Up Engine: types and schemas.
 */

export const FOLLOW_UP_SOURCE_TYPES = [
  'lead_form_submitted',
  'quote_request_submitted',
  'lead_qualification_completed',
  'conversation_milestone',
] as const;
export type FollowUpSourceType = (typeof FOLLOW_UP_SOURCE_TYPES)[number];

export type FollowUpRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface FollowUpRunRow {
  id: string;
  organization_id: string;
  source_type: FollowUpSourceType;
  source_id: string;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  status: FollowUpRunStatus;
  generated_summary: string | null;
  recommended_action: string | null;
  recommended_priority: string | null;
  recommended_channel: string | null;
  recommended_timing: string | null;
  draft_email_subject: string | null;
  draft_email_body: string | null;
  draft_note: string | null;
  draft_task_title: string | null;
  draft_task_description: string | null;
  raw_model_output: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpGenerationInput {
  organizationId: string;
  sourceType: FollowUpSourceType;
  sourceId: string;
  context: {
    lead?: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      message?: string | null;
      requested_service?: string | null;
      requested_timeline?: string | null;
      project_details?: string | null;
      location?: string | null;
      transcript_snippet?: string | null;
      qualification_summary?: string | null;
      qualification_priority?: string | null;
      next_recommended_action?: string | null;
    } | null;
    quoteRequest?: {
      id: string;
      customer_name: string;
      customer_email?: string | null;
      customer_phone?: string | null;
      service_type?: string | null;
      project_details?: string | null;
      budget_text?: string | null;
      budget_amount?: number | null;
      location?: string | null;
      notes?: string | null;
      estimate_total?: number | null;
      estimate_low?: number | null;
      estimate_high?: number | null;
      form_answers?: Record<string, unknown> | null;
    } | null;
    conversationSnippet?: string | null;
    businessName?: string | null;
    industry?: string | null;
  };
}

export interface FollowUpModelOutput {
  summary: string;
  recommended_action: string;
  recommended_priority: 'low' | 'medium' | 'high';
  recommended_channel: string;
  recommended_timing: string;
  draft_email_subject?: string;
  draft_email_body?: string;
  draft_note?: string;
  draft_task_title?: string;
  draft_task_description?: string;
  suggested_crm_stage?: string;
}
