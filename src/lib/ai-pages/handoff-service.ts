/**
 * Widget-to-AI-page handoff: create and resolve short-lived tokens.
 */

import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageHandoffPayload } from './types';
import { getPageBySlugForOrg, getPublishedPageBySlug } from './config-service';

const TOKEN_BYTES = 24;
const TTL_MINUTES = 15;

export function generateHandoffToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export async function createHandoffToken(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    aiPageId: string;
    conversationId?: string | null;
    contextSnippet?: Record<string, unknown>;
  }
): Promise<string> {
  const token = generateHandoffToken();
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
  await supabase.from('ai_page_handoff_tokens').insert({
    token,
    organization_id: params.organizationId,
    ai_page_id: params.aiPageId,
    conversation_id: params.conversationId ?? null,
    context_snippet: params.contextSnippet ?? {},
    expires_at: expiresAt,
  });
  return token;
}

export interface ResolvedHandoff {
  aiPageId: string;
  organizationId: string;
  conversationId: string | null;
  contextSnippet: Record<string, unknown>;
}

export async function resolveHandoffToken(
  supabase: SupabaseClient,
  token: string
): Promise<ResolvedHandoff | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_page_handoff_tokens')
    .select('organization_id, ai_page_id, conversation_id, context_snippet')
    .eq('token', token)
    .gt('expires_at', now)
    .maybeSingle();

  if (error || !data) return null;
  return {
    organizationId: data.organization_id,
    aiPageId: data.ai_page_id,
    conversationId: data.conversation_id ?? null,
    contextSnippet: (data.context_snippet as Record<string, unknown>) ?? {},
  };
}

/** Build handoff payload for widget response (only if org has a published page with that slug). */
export async function buildPageHandoffPayload(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    targetSlug: string;
    targetPageType: string;
    conversationId?: string | null;
    contextSnippet?: Record<string, unknown>;
  }
): Promise<PageHandoffPayload | null> {
  const page = await getPageBySlugForOrg(supabase, params.organizationId, params.targetSlug);
  if (!page || !page.is_published || !page.is_enabled) return null;
  const mode = (page.deployment_mode as string) || '';
  const allowHandoff =
    mode === 'widget_handoff_to_page' || mode === 'widget_and_page';
  if (!allowHandoff) return null;
  const token = await createHandoffToken(supabase, {
    organizationId: params.organizationId,
    aiPageId: page.id,
    conversationId: params.conversationId,
    contextSnippet: params.contextSnippet,
  });
  const handoffConfig = (page.handoff_config as { button_label?: string; intro_message?: string }) ?? {};
  return {
    handoff_type: 'ai_page',
    target_page_slug: page.slug,
    target_page_type: page.page_type,
    button_label: handoffConfig.button_label ?? 'Continue in full assistant',
    intro_message: handoffConfig.intro_message,
    context_token: token,
  };
}

/** Resolve handoff from public page (by token); returns page config + context for the given org. */
export async function resolveHandoffForPublicPage(
  supabase: SupabaseClient,
  token: string
): Promise<{ pageSlug: string; contextSnippet: Record<string, unknown>; conversationId: string | null } | null> {
  const resolved = await resolveHandoffToken(supabase, token);
  if (!resolved) return null;
  const { data: page } = await supabase
    .from('ai_pages')
    .select('slug')
    .eq('id', resolved.aiPageId)
    .eq('organization_id', resolved.organizationId)
    .eq('is_published', true)
    .maybeSingle();
  if (!page) return null;
  return {
    pageSlug: page.slug,
    contextSnippet: resolved.contextSnippet,
    conversationId: resolved.conversationId,
  };
}
