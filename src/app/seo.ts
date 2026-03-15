/**
 * Central SEO configuration for Spaxio Assistant public website.
 * Used by root layout and public pages. Dashboard and auth routes are NOINDEX.
 */

export const SITE_URL = 'https://www.spaxioassistant.com';
export const SITE_NAME = 'Spaxio Assistant';

export const DEFAULT_SEO = {
  title: 'Spaxio Assistant — AI Chatbot Widget for Websites',
  description:
    'Create a custom AI chatbot for your website in minutes. Spaxio Assistant lets businesses deploy AI chat widgets that answer questions, capture leads, and automate customer support.',
  keywords: [
    'AI chatbot widget',
    'AI website assistant',
    'AI chatbot for website',
    'AI support chatbot',
    'AI widget integration',
    'AI chatbot integration',
    'custom AI chatbot for website',
    'AI customer support widget',
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
