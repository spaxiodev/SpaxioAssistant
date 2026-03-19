/**
 * AI Page config: fetch by slug (public), list by org, CRUD.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicAiPageConfig, AiPageRow, IntakeFieldSchema } from './types';
import {
  QUOTE_INTAKE_FIELDS,
  SUPPORT_INTAKE_FIELDS,
  INTAKE_BOOKING_FIELDS,
} from './types';

/** Public: fetch published page by ID (globally unique). Use for shareable links and embeds. */
export async function getPublishedPageById(
  supabase: SupabaseClient,
  pageId: string
): Promise<PublicAiPageConfig | null> {
  const id = pageId.trim();
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

  const { data, error } = await supabase
    .from('ai_pages')
    .select('id, organization_id, title, slug, description, page_type, welcome_message, intro_copy, trust_copy, branding_config, intake_schema, pricing_profile_id')
    .eq('id', id)
    .eq('is_published', true)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PublicAiPageConfig;
}

/** Get published page by slug (may collide across orgs). Prefer getPublishedPageById for unique URLs. */
export async function getPublishedPageBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PublicAiPageConfig | null> {
  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!normalizedSlug) return null;

  const { data, error } = await supabase
    .from('ai_pages')
    .select('id, organization_id, title, slug, description, page_type, welcome_message, intro_copy, trust_copy, branding_config, intake_schema, pricing_profile_id')
    .eq('slug', normalizedSlug)
    .eq('is_published', true)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PublicAiPageConfig;
}

export async function getPageById(
  supabase: SupabaseClient,
  pageId: string,
  organizationId: string
): Promise<AiPageRow | null> {
  const { data, error } = await supabase
    .from('ai_pages')
    .select('*')
    .eq('id', pageId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AiPageRow;
}

export async function getPageBySlugForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<AiPageRow | null> {
  const { data, error } = await supabase
    .from('ai_pages')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('slug', slug.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AiPageRow;
}

export async function listAiPagesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AiPageRow[]> {
  const { data, error } = await supabase
    .from('ai_pages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as AiPageRow[];
}

/** First published page slug for a given page_type (for handoff). */
export async function getPublishedPageSlugByType(
  supabase: SupabaseClient,
  organizationId: string,
  pageType: string
): Promise<string | null> {
  const { data } = await supabase
    .from('ai_pages')
    .select('slug')
    .eq('organization_id', organizationId)
    .eq('page_type', pageType)
    .eq('is_published', true)
    .eq('is_enabled', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.slug ?? null;
}

export function getDefaultIntakeSchema(pageType: string): IntakeFieldSchema[] {
  switch (pageType) {
    case 'quote':
      return QUOTE_INTAKE_FIELDS;
    case 'support':
      return SUPPORT_INTAKE_FIELDS;
    case 'booking':
    case 'intake':
      return INTAKE_BOOKING_FIELDS;
    default:
      return [];
  }
}
