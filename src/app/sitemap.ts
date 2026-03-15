import { MetadataRoute } from 'next';
import { SITE_URL } from './seo';
import { PUBLIC_PATHS } from './seo';

const LOCALES = ['en', 'fr'] as const;

function changeFrequency(path: string): MetadataRoute.Sitemap[0]['changeFrequency'] {
  if (path === '') return 'weekly';
  if (path === '/pricing') return 'monthly';
  if (path.startsWith('/ai-')) return 'monthly';
  return 'yearly';
}

function priority(path: string): number {
  if (path === '') return 1;
  if (path === '/pricing') return 0.9;
  if (path.startsWith('/ai-')) return 0.85;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of PUBLIC_PATHS) {
      const url = path ? `/${locale}${path}` : `/${locale}`;
      entries.push({
        url: `${SITE_URL}${url}`,
        lastModified: new Date(),
        changeFrequency: changeFrequency(path),
        priority: priority(path),
      });
    }
  }

  return entries;
}
