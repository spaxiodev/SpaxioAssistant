import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './breadcrumbs';
import { JsonLd } from './json-ld';
import { buildFAQSchema, type FAQItem } from '@/lib/seo-schema';

export type LandingSection = { title: string; body: string };

type LandingPageProps = {
  locale: string;
  breadcrumbName: string;
  path: string;
  heroTitle: string;
  heroSubtitle: string;
  sections: LandingSection[];
  faq?: FAQItem[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
};

export function LandingPage({
  locale,
  breadcrumbName,
  path,
  heroTitle,
  heroSubtitle,
  sections,
  faq,
  ctaTitle,
  ctaDescription,
  ctaPrimaryHref,
  ctaPrimaryLabel,
  ctaSecondaryHref,
  ctaSecondaryLabel,
}: LandingPageProps) {
  const breadcrumbItems = [
    { name: 'Home', path: '' },
    { name: breadcrumbName, path },
  ];
  const faqSchema = faq?.length ? buildFAQSchema(faq) : null;

  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-12">
      {faqSchema && <JsonLd id="landing-faq-schema" data={faqSchema} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={breadcrumbItems} locale={locale} className="mb-8" />
      </div>
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {heroSubtitle}
          </p>
        </header>

        <section className="mx-auto mt-16 max-w-3xl space-y-16">
          {sections.map((sec, i) => (
            <div key={i}>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {sec.title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-muted-foreground leading-relaxed">
                {sec.body}
              </p>
            </div>
          ))}
        </section>

        {faq && faq.length > 0 && (
          <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Frequently asked questions
            </h2>
            <ul className="mt-8 space-y-6">
              {faq.map((item, i) => (
                <li key={i} className="border-b border-border pb-6 last:border-0 last:pb-0">
                  <h3 className="font-medium text-foreground">{item.question}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{item.answer}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mx-auto mt-20 max-w-2xl rounded-2xl border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{ctaTitle}</h2>
          <p className="mt-3 text-muted-foreground">{ctaDescription}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href={ctaPrimaryHref}>{ctaPrimaryLabel}</Link>
            </Button>
            {ctaSecondaryHref && ctaSecondaryLabel && (
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link href={ctaSecondaryHref}>{ctaSecondaryLabel}</Link>
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
