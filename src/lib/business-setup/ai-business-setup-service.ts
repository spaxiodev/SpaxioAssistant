/**
 * AI Business Setup: orchestration. Build combined input from source_inputs,
 * run extraction, review, and persist draft. Used by API only (server-side).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SourceInputs } from './types';
import { extractBusinessWithAI } from './ai-business-extraction-service';
import { reviewExtractionResult } from './ai-business-review-service';

const COMBINED_PREVIEW_MAX = 2000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 500_000;
const MAX_WEBSITE_TEXT = 30_000;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_WEBSITE_TEXT);
}

async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'SpaxioBot/1.0 (Business setup)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('URL did not return HTML');
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) throw new Error('Page too large');
  const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  const text = stripHtmlToText(html);
  if (text.length < 100) throw new Error('Too little text on page');
  return text;
}

export interface RunExtractionOptions {
  draftId: string;
  organizationId: string;
  sourceInputs: SourceInputs;
  onStep?: (step: string) => Promise<void>;
}

/**
 * Build a single combined text from source_inputs for the extraction model.
 */
export function buildCombinedText(inputs: SourceInputs): string {
  const parts: string[] = [];

  if (inputs.website_url) {
    parts.push(`[Website URL]\n${inputs.website_url}`);
  }
  if (inputs.pasted_text?.trim()) {
    parts.push(`[Pasted content]\n${inputs.pasted_text.trim()}`);
  }
  if (inputs.chat_summary?.trim()) {
    parts.push(`[Business description / chat]\n${inputs.chat_summary.trim()}`);
  }
  if (inputs.pricing_text?.trim()) {
    parts.push(`[Pricing information]\n${inputs.pricing_text.trim()}`);
  }
  if (inputs.faq_text?.trim()) {
    parts.push(`[FAQ / support information]\n${inputs.faq_text.trim()}`);
  }
  if (inputs.service_descriptions?.trim()) {
    parts.push(`[Service descriptions]\n${inputs.service_descriptions.trim()}`);
  }
  if (inputs.branding_notes?.trim()) {
    parts.push(`[Branding / voice]\n${inputs.branding_notes.trim()}`);
  }
  if (inputs.uploaded_file_summaries?.length) {
    parts.push(`[Uploaded files]\n${inputs.uploaded_file_summaries.join('\n\n')}`);
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Run full extraction pipeline and update the draft. Call from API with draft row locked.
 * If source_inputs.website_url is set, fetches the page and includes its text in extraction.
 */
export async function runBusinessSetupExtraction(
  supabase: SupabaseClient,
  options: RunExtractionOptions
): Promise<{ success: boolean; error?: string }> {
  const { draftId, organizationId, sourceInputs, onStep } = options;

  let combinedText = buildCombinedText(sourceInputs);
  if (sourceInputs.website_url?.trim()) {
    await onStep?.('Fetching website...');
    try {
      const websiteText = await fetchWebsiteText(sourceInputs.website_url.trim());
      combinedText = `[Website content from ${sourceInputs.website_url}]\n\n${websiteText}\n\n---\n\n${combinedText}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch website';
      return { success: false, error: msg };
    }
  }
  if (!combinedText.trim()) {
    return { success: false, error: 'No business information provided. Add a website URL, pasted text, or describe your business.' };
  }

  await onStep?.('Extracting business profile...');
  await supabase
    .from('business_setup_drafts')
    .update({
      status: 'extracting',
      current_step: 'Extracting business profile...',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('organization_id', organizationId);

  try {
    const extraction = await extractBusinessWithAI({
      combinedText,
      websiteUrl: sourceInputs.website_url ?? undefined,
    });

    await onStep?.('Reviewing and validating...');
    const review = reviewExtractionResult(extraction, sourceInputs);

    const combinedPreview =
      combinedText.length > COMBINED_PREVIEW_MAX
        ? combinedText.slice(0, COMBINED_PREVIEW_MAX) + '...'
        : combinedText;

    const { error: updateError } = await supabase
      .from('business_setup_drafts')
      .update({
        status: 'ready',
        current_step: null,
        error_message: null,
        source_inputs: {
          ...sourceInputs,
          combined_text_preview: combinedPreview,
        },
        extracted_business_profile: extraction.business_profile as unknown as Record<string, unknown>,
        extracted_services: extraction.services as unknown as Record<string, unknown>[],
        extracted_knowledge: extraction.knowledge as unknown as Record<string, unknown>,
        extracted_pricing: extraction.pricing as unknown as Record<string, unknown> | null,
        extracted_agents: extraction.agents as unknown as Record<string, unknown>[],
        extracted_automations: extraction.automations as unknown as Record<string, unknown>[],
        extracted_widget_config: extraction.widget_config as unknown as Record<string, unknown>,
        extracted_ai_pages: extraction.ai_pages as unknown as Record<string, unknown>[],
        extracted_branding: extraction.branding as unknown as Record<string, unknown>,
        assumptions: review.assumptions,
        missing_items: review.missing_items,
        confidence_scores: review.confidence_scores as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('organization_id', organizationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    await supabase
      .from('business_setup_drafts')
      .update({
        status: 'failed',
        current_step: null,
        error_message: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('organization_id', organizationId);
    return { success: false, error: message };
  }
}
