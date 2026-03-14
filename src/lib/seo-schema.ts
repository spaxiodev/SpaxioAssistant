import { SITE_URL, SITE_NAME } from './seo';

export type FAQItem = { question: string; answer: string };

/**
 * Build FAQPage schema for JSON-LD.
 */
export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

export type BreadcrumbItem = { name: string; path: string };

/**
 * Build BreadcrumbList schema. path is the full path after locale, e.g. /pricing or /blog/my-slug.
 */
export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  locale: string
): Record<string, unknown> {
  const base = `${SITE_URL}/${locale}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.path === '' ? base : `${base}${item.path}`,
    })),
  };
}

/**
 * Build Article schema for blog posts.
 */
export function buildArticleSchema(params: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
  imageUrl?: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    datePublished: params.datePublished,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': params.url },
  };
  if (params.dateModified) schema.dateModified = params.dateModified;
  if (params.author) schema.author = { '@type': 'Person', name: params.author };
  if (params.imageUrl) schema.image = params.imageUrl;
  return schema;
}
