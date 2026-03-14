import type { IndustryPageContent } from './types';
import { roofersContent } from './roofers';
import { lawFirmsContent } from './law-firms';
import { medSpasContent } from './med-spas';

/**
 * Registry of industry pages for programmatic SEO.
 * Add new industries here and to PUBLIC_SEO_PATHS in lib/seo.ts for sitemap.
 * Route pattern: /ai-chatbot-for-[industryKey]
 */
export const INDUSTRY_PAGES: Record<string, IndustryPageContent> = {
  roofers: roofersContent,
  'law-firms': lawFirmsContent,
  'med-spas': medSpasContent,
};

export const INDUSTRY_SLUGS = Object.keys(INDUSTRY_PAGES) as string[];

export function getIndustryContent(industryKey: string): IndustryPageContent | null {
  return INDUSTRY_PAGES[industryKey] ?? null;
}

export type { IndustryPageContent } from './types';
