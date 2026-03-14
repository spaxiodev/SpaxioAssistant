import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllBlogPosts } from '@/content/blog';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'Blog',
  description:
    'Articles on AI chatbots, AI agents, CRM automation, and AI infrastructure for business. Tips and guides from Spaxio Assistant.',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/blog`
  );
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = await getAllBlogPosts();

  return (
    <div className="relative isolate px-4 pb-24 pt-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 text-muted-foreground">
          Guides and insights on AI chatbots, AI agents, CRM automation, and AI infrastructure for business.
        </p>
        <ul className="mt-12 space-y-8">
          {posts.map((post) => (
            <li key={post.meta.slug} className="border-b border-border pb-8 last:border-0">
              <Link
                href={`/blog/${post.meta.slug}`}
                className="group block"
              >
                <h2 className="text-xl font-semibold text-foreground group-hover:underline sm:text-2xl">
                  {post.meta.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {post.meta.date} · {post.meta.readTimeMinutes} min read
                  {post.meta.author && ` · ${post.meta.author}`}
                </p>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {post.meta.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
