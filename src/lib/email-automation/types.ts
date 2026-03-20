export type TonePreset = 'professional' | 'friendly' | 'luxury' | 'concise';

export type EmailProviderType = 'gmail' | 'outlook' | 'imap' | 'resend' | 'webhook_inbound';
export type EmailProviderStatus = 'connected' | 'disconnected' | 'error';
export type InboundEmailProcessingStatus = 'pending' | 'replied' | 'skipped' | 'failed';
export type AutoReplyStatus = 'pending' | 'sent' | 'failed';

export interface EmailAutomationSettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  fallback_language: string;
  ai_enhancement_enabled: boolean;
  tone_preset: TonePreset;
  business_hours_enabled: boolean;
  business_hours_json: BusinessHoursJson | null;
  away_message_enabled: boolean;
  away_message_text: string | null;
  away_message_language: string;
  max_auto_replies_per_thread: number;
  cooldown_hours: number;
  ai_translate_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursDay {
  open: string;   // 'HH:MM'
  close: string;  // 'HH:MM'
  enabled: boolean;
}

export interface BusinessHoursJson {
  timezone: string;
  mon?: BusinessHoursDay;
  tue?: BusinessHoursDay;
  wed?: BusinessHoursDay;
  thu?: BusinessHoursDay;
  fri?: BusinessHoursDay;
  sat?: BusinessHoursDay;
  sun?: BusinessHoursDay;
}

export interface EmailProvider {
  id: string;
  organization_id: string;
  provider_type: EmailProviderType;
  display_name: string | null;
  status: EmailProviderStatus;
  status_message: string | null;
  config_json: Record<string, unknown> | null;
  inbound_webhook_token: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailReplyTemplate {
  id: string;
  organization_id: string;
  language_code: string;
  language_name: string;
  subject_template: string | null;
  body_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboundEmail {
  id: string;
  organization_id: string;
  email_provider_id: string | null;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  detected_language: string | null;
  language_confidence: number | null;
  is_spam: boolean;
  is_auto_generated: boolean;
  processing_status: InboundEmailProcessingStatus;
  skip_reason: string | null;
  lead_id: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface EmailAutoReply {
  id: string;
  organization_id: string;
  inbound_email_id: string | null;
  lead_id: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  reply_language: string | null;
  template_id: string | null;
  ai_enhanced: boolean;
  status: AutoReplyStatus;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  thread_dedupe_key: string | null;
  sent_at: string | null;
  created_at: string;
}

/** Parsed inbound email event (from webhook or provider adapter). */
export interface InboundEmailEvent {
  senderEmail: string;
  senderName: string | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  threadId: string | null;
  receivedAt?: string;
}

export interface ProcessInboundEmailResult {
  status: 'replied' | 'skipped' | 'failed';
  reason?: string;
  inboundEmailId: string | null;
  autoReplyId: string | null;
}
