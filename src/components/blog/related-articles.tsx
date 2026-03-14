import { Link } from '@/i18n/navigation';
import type { BlogPostMeta } from '@/content/blog/types';

type RelatedArticlesProps = {
  posts: BlogPostMeta[];
};

export function RelatedArticles({ posts }: RelatedArticlesProps) {
  if (!posts.length) return null;

  return (
    <aside className="mt-12 rounded-2xl border border-border bg-muted/20 p-6" aria-label="Related articles">
      <h2 className="text-lg font-semibold text-foreground">Related articles</h2>
      <ul className="mt-4 space-y-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
