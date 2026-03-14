import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ContactForm } from '@/components/contact-form';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    {
      title: 'Contact',
      description:
        'Contact Spaxio Assistant for support, sales, or questions about our AI infrastructure platform. We respond quickly.',
    },
    `/${locale}/contact`
  );
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden>←</span>
            {tCommon('backToHome')}
          </Link>
        </div>
        <section className="rounded-2xl border border-border bg-background/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('contactTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {t('contactDescription')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="rounded-full">
              <a href="mailto:polidorispaxio@gmail.com">{t('contactCta')}</a>
            </Button>
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-medium text-foreground">{t('contactEmailLabel')} </span>
              <a
                href="mailto:polidorispaxio@gmail.com"
                className="underline-offset-4 hover:underline"
              >
                polidorispaxio@gmail.com
              </a>
            </p>
          </div>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
