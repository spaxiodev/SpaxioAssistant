import { SITE_URL, LOCALES, PUBLIC_SEO_PATHS } from '@/lib/seo';
import type { MetadataRoute } from 'next';
import { getBlogSlugs } from '@/content/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = new URL(SITE_URL);
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of PUBLIC_SEO_PATHS) {
      const pathname = path ? `/${locale}${path}` : `/${locale}`;
      entries.push({
        url: new URL(pathname, base).href,
        lastModified: new Date(),
        changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : path.startsWith('/blog') ? 0.7 : 0.8,
      });
    }
  }

  let blogSlugs: string[] = [];
  try {
    blogSlugs = await getBlogSlugs();
  } catch {
    // Blog content may not exist yet
  }

  for (const locale of LOCALES) {
    for (const slug of blogSlugs) {
      entries.push({
        url: new URL(`/${locale}/blog/${slug}`, base).href,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return entries;
}
