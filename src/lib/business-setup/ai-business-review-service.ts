/**
 * AI Business Review: compute confidence scores, assumptions, and missing items per section.
 * Used to show the user what the AI is uncertain about and what was not found.
 */

import type { ExtractionResult } from './ai-business-extraction-service';
import type { ConfidenceScores, SourceInputs, DraftSectionKey } from './types';

export interface ReviewResult {
  confidence_scores: ConfidenceScores;
  assumptions: string[];
  missing_items: string[];
}

export function reviewExtractionResult(
  extraction: ExtractionResult,
  sourceInputs: SourceInputs
): ReviewResult {
  const assumptions: string[] = [];
  const missing_items: string[] = [];
  const confidence_scores: ConfidenceScores = {};

  // Business profile
  const bp = extraction.business_profile;
  const hasBpName = Boolean(bp.business_name?.trim());
  const hasBpDesc = Boolean(bp.company_description?.trim());
  const hasContact = Boolean(bp.contact_email?.trim() || bp.phone?.trim());
  if (!hasBpName && sourceInputs.website_url) assumptions.push('Business name was inferred from website or context.');
  if (!hasBpName) missing_items.push('Business name');
  if (!hasBpDesc) missing_items.push('Company description');
  if (!hasContact) missing_items.push('Contact email or phone');
  confidence_scores.business_profile = scoreSection(hasBpName, hasBpDesc, hasContact);

  // Services
  const serviceCount = extraction.services.length;
  if (serviceCount === 0) missing_items.push('Services list');
  else if (serviceCount < 3 && sourceInputs.pasted_text) assumptions.push('Only a few services were found; you can add more in Settings.');
  confidence_scores.services = serviceCount > 0 ? Math.min(0.95, 0.5 + serviceCount * 0.1) : 0.2;

  // Knowledge
  const hasFaqs = (extraction.knowledge.faqs?.length ?? 0) > 0;
  const hasOther = (extraction.knowledge.business_facts?.length ?? 0) > 0 || (extraction.knowledge.support_topics?.length ?? 0) > 0;
  if (!hasFaqs && !hasOther) missing_items.push('FAQs or knowledge content');
  confidence_scores.knowledge = hasFaqs || hasOther ? 0.85 : 0.3;

  // Pricing
  const hasPricing = extraction.pricing !== null && (
    (extraction.pricing.services?.length ?? 0) > 0 ||
    (extraction.pricing.rules?.length ?? 0) > 0 ||
    Boolean(extraction.pricing.pricing_notes?.trim())
  );
  if (!hasPricing && sourceInputs.pricing_text) assumptions.push('Pricing could not be fully parsed; you can add pricing rules in Pricing.');
  if (!hasPricing) missing_items.push('Pricing rules or notes');
  confidence_scores.pricing = hasPricing ? 0.8 : 0.2;

  // Agents
  const agentCount = extraction.agents.length;
  if (agentCount === 0) missing_items.push('Recommended agents');
  confidence_scores.agents = agentCount > 0 ? 0.9 : 0.4;

  // Automations
  const autoCount = extraction.automations.length;
  if (autoCount === 0) missing_items.push('Recommended automations');
  confidence_scores.automations = autoCount > 0 ? 0.85 : 0.5;

  // Widget config
  const hasWelcome = Boolean(extraction.widget_config.welcome_message?.trim());
  confidence_scores.widget_config = hasWelcome ? 0.9 : 0.6;

  // AI pages
  const pageCount = extraction.ai_pages.length;
  confidence_scores.ai_pages = pageCount > 0 ? 0.85 : 0.5;

  // Branding
  const hasTone = Boolean(extraction.branding.tone_of_voice?.trim());
  confidence_scores.branding = hasTone ? 0.85 : 0.5;

  return {
    confidence_scores,
    assumptions: [...new Set(assumptions)].slice(0, 15),
    missing_items: [...new Set(missing_items)].slice(0, 20),
  };
}

function scoreSection(...flags: boolean[]): number {
  const n = flags.length;
  const t = flags.filter(Boolean).length;
  if (n === 0) return 0.5;
  return 0.2 + (t / n) * 0.75;
}

export const SECTION_LABELS: Record<DraftSectionKey, string> = {
  business_profile: 'Business Info',
  services: 'Services',
  knowledge: 'Knowledge',
  pricing: 'Pricing',
  agents: 'Agents',
  automations: 'Automations',
  widget_config: 'Widget',
  ai_pages: 'AI Pages',
  branding: 'Branding',
};
