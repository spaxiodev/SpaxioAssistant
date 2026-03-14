import type { Metadata } from 'next';

/**
 * Centralized SEO configuration for Spaxio Assistant.
 * Use for metadataBase, canonical URLs, default titles/descriptions, and schema.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.spaxioassistant.com';
export const SITE_NAME = 'Spaxio Assistant';

export const DEFAULT_TITLE_TEMPLATE = `%s | ${SITE_NAME}`;
export const DEFAULT_META_DESCRIPTION =
  'Build AI agents, AI chatbots, CRM automations, and intelligent business workflows with Spaxio Assistant. Deploy AI infrastructure for your business in minutes.';

export type PageMeta = {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string[];
  openGraph?: {
    title?: string;
    description?: string;
    type?: 'website' | 'article';
  };
  robots?: { index?: boolean; follow?: boolean };
};

/**
 * Build full canonical URL for a path (locale-prefixed path without leading slash for default locale handling).
 * Pass path like "/en/pricing" or "/en" for correct canonicals.
 */
export function canonicalUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

/** Locales used in the app for sitemap/alternates */
export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

/** Public SEO routes (without [locale] prefix; we add locale in sitemap) */
export const PUBLIC_SEO_PATHS = [
  '',
  '/pricing',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/ai-infrastructure-platform',
  '/ai-chatbot-builder',
  '/ai-agents-for-business',
  '/ai-crm-automation',
  '/ai-business-automation',
  '/website-ai-chatbot',
  '/customer-support-ai',
  '/lead-generation-ai',
  '/blog',
  // Programmatic industry pages
  '/ai-chatbot-for-roofers',
  '/ai-chatbot-for-law-firms',
  '/ai-chatbot-for-med-spas',
] as const;

/**
 * Build Next.js Metadata for a page with canonical, OG, Twitter, and optional keywords.
 * Pass localePath e.g. "/en/pricing" for correct canonical and alternates.
 */
export function buildPageMetadata(
  meta: PageMeta,
  localePath: string
): Metadata {
  const canonical = canonicalUrl(localePath);
  const title = meta.title;
  const description = meta.description ?? DEFAULT_META_DESCRIPTION;
  const ogTitle = meta.openGraph?.title ?? title;
  const ogDesc = meta.openGraph?.description ?? description;
  const ogType = meta.openGraph?.type ?? 'website';

  return {
    title,
    description,
    keywords: meta.keywords?.length ? meta.keywords : undefined,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      type: ogType,
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDesc,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
    },
    robots: meta.robots ?? { index: true, follow: true },
  };
}
