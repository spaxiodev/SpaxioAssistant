import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleBody } from '@/components/blog/article-body';
import { RelatedArticles } from '@/components/blog/related-articles';
import { InternalLinksBlock } from '@/components/blog/internal-links-block';
import { getBlogPostBySlug, getAllBlogPosts } from '@/content/blog';
import { buildPageMetadata } from '@/lib/seo';
import { buildArticleSchema } from '@/lib/seo-schema';
import { SITE_URL } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.flatMap((p) =>
    ['en', 'fr'].map((locale) => ({ locale, slug: p.meta.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};
  return buildPageMetadata(
    {
      title: post.meta.title,
      description: post.meta.description,
      openGraph: {
        title: post.meta.title,
        description: post.meta.description,
        type: 'article',
      },
    },
    `/${locale}/blog/${slug}`
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const canonicalUrl = `${SITE_URL}/${locale}/blog/${slug}`;
  const articleSchema = buildArticleSchema({
    title: post.meta.title,
    description: post.meta.description,
    datePublished: post.meta.date,
    dateModified: post.meta.date,
    author: post.meta.author,
    url: canonicalUrl,
  });

  const relatedPosts = post.meta.relatedSlugs?.length
    ? (await getAllBlogPosts()).filter((p) =>
        post.meta.relatedSlugs!.includes(p.meta.slug)
      )
    : [];

  const breadcrumbItems = [
    { name: 'Home', path: '' },
    { name: 'Blog', path: '/blog' },
    { name: post.meta.title, path: `/blog/${slug}` },
  ];

  return (
    <div className="relative isolate px-4 pb-24 pt-12">
      <JsonLd id="article-schema" data={articleSchema} />
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={breadcrumbItems} locale={locale} className="mb-8" />
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {post.meta.title}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {post.meta.date}
            {post.meta.readTimeMinutes && ` · ${post.meta.readTimeMinutes} min read`}
            {post.meta.author && ` · ${post.meta.author}`}
          </p>
        </header>
        <ArticleBody sections={post.sections} />
        <RelatedArticles posts={relatedPosts.map((p) => p.meta)} />
        <InternalLinksBlock />
        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link href="/blog">Back to blog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
