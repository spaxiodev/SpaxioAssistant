/**
 * Central SEO configuration for Spaxio Assistant public website.
 * Used by root layout and public pages. Dashboard and auth routes are NOINDEX.
 * SITE_URL uses NEXT_PUBLIC_APP_URL when set (production); do not hardcode.
 */

const FALLBACK_SITE_URL = 'https://www.spaxioassistant.com';

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url && !url.includes('localhost')) {
    return url.replace(/\/$/, '');
  }
  return FALLBACK_SITE_URL;
}

export const SITE_URL = typeof window !== 'undefined' ? FALLBACK_SITE_URL : getSiteUrl();
export const SITE_NAME = 'Spaxio Assistant';

export const DEFAULT_SEO = {
  title: 'Spaxio Assistant — AI Website Assistant for Businesses',
  description:
    'AI website assistant that learns from your site, answers customer questions, captures and qualifies leads, collects quote requests with estimates, and automates follow-up. Add one script for a chat widget or full-page assistant.',
  keywords: [
    'AI website assistant',
    'website AI assistant',
    'AI chat widget',
    'lead capture',
    'quote requests',
    'customer support automation',
    'AI website assistant',
    'AI for business',
    'AI assistant for small business',
  ],
} as const;

export const DEFAULT_OPEN_GRAPH = {
  type: 'website' as const,
  url: typeof window !== 'undefined' ? FALLBACK_SITE_URL : getSiteUrl(),
  siteName: SITE_NAME,
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
  images: [{ url: `${typeof window !== 'undefined' ? FALLBACK_SITE_URL : getSiteUrl()}/icon.png`, width: 512, height: 512, alt: SITE_NAME }],
};

export const DEFAULT_TWITTER = {
  card: 'summary_large_image' as const,
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
};

/** Public paths included in sitemap and allowed for indexing (no leading slash; locale is added in sitemap) */
export const PUBLIC_PATHS = [
  '',
  '/pricing',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/demo/ai-chat',
  '/widget-preview',
  '/ai-chatbot-widget',
  '/ai-chatbot-for-website',
  '/ai-customer-support-ai',
  '/ai-website-assistant',
] as const;

/** Paths that must be noindex (auth + dashboard) */
export const NOINDEX_PATHS = ['/dashboard', '/login', '/signup'] as const;
