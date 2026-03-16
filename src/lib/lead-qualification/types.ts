/**
 * AI lead qualification: structured output and DB field types.
 */

export type QualificationPriority = 'low' | 'medium' | 'high';

export interface LeadQualificationResult {
  /** 0-100 */
  score: number;
  priority: QualificationPriority;
  summary: string;
  /** Raw JSON for audit/debug */
  raw: Record<string, unknown>;
  /** Extracted structured fields */
  service_or_project_type?: string | null;
  urgency?: string | null;
  budget_mentioned?: string | null;
  location?: string | null;
  sentiment_intent?: string | null;
  recommended_deal_stage?: string | null;
  estimated_deal_value?: number | null;
  next_recommended_action?: string | null;
}
