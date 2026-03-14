import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/json-ld';
import { TrustSignals } from '@/components/seo/trust-signals';
import { buildPageMetadata } from '@/lib/seo';
import { buildFAQSchema } from '@/lib/seo-schema';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return buildPageMetadata(
    {
      title: t('metaTitle'),
      description: t('metaDescription'),
      canonicalPath: `/${locale}`,
      openGraph: { title: t('metaTitle'), description: t('metaDescription') },
    },
    `/${locale}`
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const faqItems = [
    { question: t('faqQ1'), answer: t('faqA1') },
    { question: t('faqQ2'), answer: t('faqA2') },
    { question: t('faqQ3'), answer: t('faqA3') },
    { question: t('faqQ4'), answer: t('faqA4') },
    { question: t('faqQ5'), answer: t('faqA5') },
    { question: t('faqQ6'), answer: t('faqA6') },
  ];
  const faqSchema = buildFAQSchema(faqItems);

  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-20">
      <JsonLd id="home-faq-schema" data={faqSchema} />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src="/icon.png"
            alt="Spaxio Assistant"
            className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
          />
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            {t('heroTitle')}
          </h1>
          <div className="mt-6 rounded-full border border-border bg-white/80 px-4 py-1 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur dark:bg-card/80">
            {t('tagline')}
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {t('description')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/signup">{t('getStarted')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/login">{t('logIn')}</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('browseNoAccount')}
          </p>
        </div>

        <div className="mx-auto mt-16 flex max-w-5xl flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('customWidgetBranding')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('leadCapture')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('quoteRequests')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('themeToggle')}
          </span>
        </div>

        <section className="mx-auto mt-24 max-w-3xl space-y-20">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('sectionBuildChatbotsTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t('sectionBuildChatbotsBody')}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('sectionAIAgentsTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t('sectionAIAgentsBody')}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('sectionCRMAutomationTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t('sectionCRMAutomationBody')}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('sectionDeployTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t('sectionDeployBody')}
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('sectionScalesTitle')}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t('sectionScalesBody')}
            </p>
          </div>
        </section>

        <TrustSignals />

        <section className="mx-auto mt-24 max-w-3xl" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('faqTitle')}
          </h2>
          <ul className="mt-8 space-y-6">
            {faqItems.map((item, i) => (
              <li key={i} className="border-b border-border pb-6 last:border-0 last:pb-0">
                <h3 className="font-medium text-foreground">{item.question}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{item.answer}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto mt-24 max-w-2xl rounded-2xl border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t('ctaTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('ctaDescription')}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/signup">{t('ctaButton')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/pricing">{t('ctaSecondary')}</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
