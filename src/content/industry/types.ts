/**
 * Content shape for programmatic SEO industry pages (e.g. /ai-chatbot-for-[industry]).
 * Add new industries to the registry and they will be included in sitemap and routing.
 */

export type IndustrySection = { title: string; body: string };
export type IndustryFAQ = { question: string; answer: string };

export type IndustryPageContent = {
  industryKey: string;
  industryName: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  sections: IndustrySection[];
  faq: IndustryFAQ[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: string;
  ctaSecondary: string;
};
