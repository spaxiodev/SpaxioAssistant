/**
 * Per-automation webhook: token generation and URL building.
 * Used when trigger_type = webhook_received.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { getPublicAppUrl } from '@/lib/app-url';

const WEBHOOK_TOKEN_BYTES = 24;

type AutomationRow = { id: string; organization_id: string; trigger_type?: string; webhook_token?: string | null; [key: string]: unknown };

/** Generate a unique URL-safe token for webhook path (hex). */
export function generateWebhookToken(): string {
  return randomBytes(WEBHOOK_TOKEN_BYTES).toString('hex');
}

/** Generate an optional secret for X-Webhook-Signature validation. */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Base URL for webhook endpoints. Prefer request origin so localhost works in dev.
 */
export function getWebhookBaseUrl(request?: Request): string {
  if (request) {
    try {
      const url = new URL(request.url);
      return url.origin;
    } catch {
      // fall through
    }
  }
  return getPublicAppUrl();
}

/** Build full webhook URL for an automation: POST {base}/api/webhooks/{token} */
export function buildAutomationWebhookUrl(token: string, request?: Request): string {
  const base = getWebhookBaseUrl(request).replace(/\/$/, '');
  return `${base}/api/webhooks/${token}`;
}

/**
 * Backfill webhook_token for automations with trigger_type = webhook_received and no token.
 * Returns the same list with in-memory updates; also persists to DB.
 */
export async function ensureWebhookTokenForAutomations<T extends AutomationRow>(
  supabase: SupabaseClient,
  automations: T[]
): Promise<T[]> {
  const out = [...automations] as T[];
  for (let i = 0; i < out.length; i++) {
    const row = out[i];
    if (row.trigger_type !== 'webhook_received' || row.webhook_token) continue;
    const token = generateWebhookToken();
    const secret = generateWebhookSecret();
    const { data: updated, error } = await supabase
      .from('automations')
      .update({ webhook_token: token, webhook_secret: secret })
      .eq('id', row.id)
      .eq('organization_id', row.organization_id)
      .select('webhook_token')
      .single();
    if (!error && updated) {
      out[i] = { ...row, webhook_token: (updated as { webhook_token: string }).webhook_token } as T;
    }
  }
  return out;
}
