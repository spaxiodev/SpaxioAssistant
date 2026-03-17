import { MetadataRoute } from 'next';
import { getSiteUrl, PUBLIC_PATHS } from './seo';
import { getAllUseCaseSlugs } from '@/lib/seo/use-cases';

const LOCALES = ['en', 'fr-CA'] as const;

function changeFrequency(path: string): MetadataRoute.Sitemap[0]['changeFrequency'] {
  if (path === '') return 'weekly';
  if (path === '/pricing') return 'monthly';
  if (path.startsWith('/ai-') || path.startsWith('/ai/')) return 'monthly';
  return 'yearly';
}

function priority(path: string): number {
  if (path === '') return 1;
  if (path === '/pricing') return 0.9;
  if (path.startsWith('/ai-') || path.startsWith('/ai/')) return 0.85;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of PUBLIC_PATHS) {
      const url = path ? `/${locale}${path}` : `/${locale}`;
      entries.push({
        url: `${baseUrl}${url}`,
        lastModified: new Date(),
        changeFrequency: changeFrequency(path),
        priority: priority(path),
      });
    }
    for (const slug of getAllUseCaseSlugs()) {
      const path = `/ai/${slug}`;
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.85,
      });
    }
  }

  return entries;
}
