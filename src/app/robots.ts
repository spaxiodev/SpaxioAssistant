import { MetadataRoute } from 'next';
import { getSiteUrl } from './seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/api',
          '/api/',
          '/widget',
          '/login',
          '/signup',
          '/invite',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
