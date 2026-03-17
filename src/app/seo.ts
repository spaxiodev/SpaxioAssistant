/**
 * Central SEO configuration for Spaxio Assistant public website.
 * Used by root layout and public pages. Dashboard and auth routes are NOINDEX.
 */

export const SITE_URL = 'https://www.spaxioassistant.com';
export const SITE_NAME = 'Spaxio Assistant';

export const DEFAULT_SEO = {
  title: 'Spaxio Assistant — AI Assistant Platform for Business',
  description:
    'Deploy AI your way: chat widget, full-page AI experiences for quotes and support, lead capture, and automation. Spaxio Assistant is the AI platform that fits your business.',
  keywords: [
    'AI assistant platform',
    'AI for business',
    'AI website assistant',
    'AI quote assistant',
    'AI support assistant',
    'AI lead capture',
    'AI chatbot for website',
    'full-page AI experience',
  ],
} as const;

export const DEFAULT_OPEN_GRAPH = {
  type: 'website' as const,
  url: SITE_URL,
  siteName: SITE_NAME,
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
  images: [{ url: `${SITE_URL}/icon.png`, width: 512, height: 512, alt: SITE_NAME }],
};

export const DEFAULT_TWITTER = {
  card: 'summary_large_image' as const,
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
};

/** Public paths included in sitemap and allowed for indexing */
export const PUBLIC_PATHS = [
  '',
  '/pricing',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/demo/ai-chat',
  '/demo/sign-in',
  '/ai-chatbot-widget',
  '/ai-chatbot-for-website',
  '/ai-customer-support-ai',
  '/ai-website-assistant',
] as const;

/** Paths that must be noindex (auth + dashboard) */
export const NOINDEX_PATHS = ['/dashboard', '/login', '/signup'] as const;
