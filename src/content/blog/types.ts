export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTimeMinutes: number;
  author?: string;
  category?: string;
  tags?: string[];
  /** Slugs of related posts for "Related articles" block */
  relatedSlugs?: string[];
};

export type BlogSection = { type: 'h2' | 'h3' | 'p'; text: string };

export type BlogPost = {
  meta: BlogPostMeta;
  /** Structured content for semantic rendering */
  sections: BlogSection[];
};
