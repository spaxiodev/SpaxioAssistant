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
  title: 'Spaxio Assistant — AI Chatbots, Automation & Business Infrastructure',
  description:
    'AI chatbot for website, AI chatbot widget, and AI automation platform in one. Build an AI CRM for small business, AI lead capture tool, and AI quote generator. Spaxio Assistant is your AI website assistant.',
  keywords: [
    'AI chatbot for website',
    'AI chatbot widget',
    'AI automation platform',
    'AI CRM for small business',
    'AI lead capture tool',
    'AI quote generator',
    'AI website assistant',
    'AI assistant platform',
    'AI for business',
    'AI website chatbot',
    'full-page AI experience',
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
