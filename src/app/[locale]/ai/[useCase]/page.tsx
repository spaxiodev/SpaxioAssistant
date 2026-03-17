import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import { getUseCaseBySlug, getAllUseCaseSlugs } from '@/lib/seo/use-cases';

type Props = { params: Promise<{ locale: string; useCase: string }> };

export async function generateStaticParams() {
  const slugs = getAllUseCaseSlugs();
  const locales = ['en', 'fr-CA'] as const;
  return locales.flatMap((locale) => slugs.map((useCase) => ({ locale, useCase })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { useCase } = await params;
  const data = getUseCaseBySlug(useCase);
  if (!data) return { title: 'Use case' };
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    openGraph: {
      title: `${data.title} | Spaxio Assistant`,
      description: data.description,
    },
    twitter: {
      title: data.title,
      description: data.description,
    },
  };
}

export default async function AiUseCasePage({ params }: Props) {
  const { locale, useCase } = await params;
  setRequestLocale(locale);
  const data = getUseCaseBySlug(useCase);
  if (!data) notFound();

  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-3xl">
        <p className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            ← Back to home
          </Link>
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {data.headline}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {data.body}
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>

        <section className="mt-16 space-y-10" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="text-2xl font-semibold text-foreground">
            Why use Spaxio Assistant for this
          </h2>
          <ul className="space-y-8">
            {data.benefits.map((b, i) => (
              <li key={i}>
                <h3 className="text-lg font-medium text-foreground">{b.title}</h3>
                <p className="mt-2 text-muted-foreground">{b.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-border pt-10">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/signup">Create account</Link>
          </Button>
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            View pricing
          </Link>
          <Link href="/demo/ai-chat" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Try AI chatbot demo
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
