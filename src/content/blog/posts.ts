import type { BlogPost } from './types';
import { BLOG_POSTS } from './data';

export async function getBlogSlugs(): Promise<string[]> {
  return BLOG_POSTS.map((p) => p.meta.slug);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return BLOG_POSTS.find((p) => p.meta.slug === slug) ?? null;
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return BLOG_POSTS;
}
