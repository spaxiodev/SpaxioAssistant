/**
 * Shared types for the email provider abstraction layer.
 * All providers implement the same send/validate interface so the auto-reply
 * pipeline can be provider-agnostic.
 */

/** Payload passed to any provider's send function. */
export interface SendEmailPayload {
  /** Recipient email address. */
  to: string;
  /** Recipient display name (may be null). */
  toName: string | null;
  subject: string;
  /** Full HTML body. */
  html: string;
  /** Plain-text fallback (may be null). */
  text: string | null;
  /** RFC 2822 Message-ID of the email being replied to (for threading). */
  inReplyTo?: string | null;
  /** References header value for threading. */
  references?: string[] | null;
}

/** Result returned by every provider's send function. */
export interface SendEmailResult {
  success: boolean;
  /** Provider-assigned message ID (if available). */
  messageId?: string | null;
  /** Human-readable error description (never includes secrets). */
  error?: string;
  /** Identifies which provider was used. */
  provider: string;
}

/** Result returned by provider connection validation. */
export interface ValidateConnectionResult {
  ok: boolean;
  /** Email address of the authenticated account. */
  email?: string;
  /** Display name of the authenticated account. */
  name?: string;
  /** Human-readable error (never includes secrets). */
  error?: string;
}

/** Minimal provider record shape used by provider modules (no client-side secrets). */
export interface ProviderRecord {
  id: string;
  organization_id: string;
  provider_type: string;
  /** Encrypted config. Decrypted only on the server inside provider modules. */
  config_json: Record<string, unknown> | null;
}
