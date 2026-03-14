/**
 * Blog content registry. Slugs are used for sitemap and dynamic routes.
 * Add new posts to BLOG_POSTS and they will be included in sitemap and /blog/[slug].
 */
import type { BlogPost } from './types';

export { getBlogSlugs, getBlogPostBySlug, getAllBlogPosts } from './posts';
export type { BlogPost, BlogPostMeta } from './types';
