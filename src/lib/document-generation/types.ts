/**
 * AI Document Generation: types for quote drafts, proposals, lead summaries, etc.
 */

export const GENERATION_TYPES = [
  'quote_draft',
  'proposal_draft',
  'lead_summary',
  'conversation_summary',
  'follow_up_summary',
] as const;
export type GenerationType = (typeof GENERATION_TYPES)[number];

export type DocumentSourceType = 'lead' | 'quote_request' | 'deal' | 'conversation' | 'none';

export interface GenerateDocumentInput {
  organizationId: string;
  generationType: GenerationType;
  templateId?: string | null;
  sourceType: DocumentSourceType;
  sourceId?: string | null;
  context: DocumentContext;
}

export interface DocumentContext {
  businessName?: string | null;
  industry?: string | null;
  servicesOffered?: string[] | null;
  lead?: {
    name: string;
    email: string;
    phone?: string | null;
    message?: string | null;
    requested_service?: string | null;
    requested_timeline?: string | null;
    project_details?: string | null;
    location?: string | null;
    qualification_summary?: string | null;
  } | null;
  quoteRequest?: {
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    service_type?: string | null;
    project_details?: string | null;
    dimensions_size?: string | null;
    location?: string | null;
    budget_text?: string | null;
    budget_amount?: number | null;
    notes?: string | null;
    estimate_total?: number | null;
    estimate_low?: number | null;
    estimate_high?: number | null;
    estimate_line_items?: { name?: string; label?: string; amount: number }[] | null;
  } | null;
  deal?: { title: string; stage: string; value_cents?: number | null } | null;
  conversationSummary?: string | null;
}

export interface GeneratedDocument {
  name: string;
  content: string;
  generationType: GenerationType;
}
