import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: t('pageTitleTerms'),
    description: t('pageDescriptionTerms'),
  };
}

export default async function TermsAndConditionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const tCommon = await getTranslations('common');

  const lastUpdated = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" className="mb-6 -ml-2" asChild>
        <Link href={`/${locale}`}>{tCommon('backToHome')}</Link>
      </Button>
      <h1 className="text-3xl font-bold tracking-tight">
        {t('pageTitleTerms')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('lastUpdated', { date: lastUpdated })}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        {t('termsIntro')}
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsUseOfServiceTitle')}
          </h2>
          <p className="mt-2">
            {t('termsUseOfServiceBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsAccountsTitle')}
          </h2>
          <p className="mt-2">
            {t('termsAccountsBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsSubscriptionTitle')}
          </h2>
          <p className="mt-2">
            {t('termsSubscriptionBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsAcceptableUseTitle')}
          </h2>
          <p className="mt-2">
            {t('termsAcceptableUseBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsLiabilityTitle')}
          </h2>
          <p className="mt-2">
            {t('termsLiabilityBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('termsChangesTitle')}
          </h2>
          <p className="mt-2">
            {t('termsChangesBody')}
          </p>
        </div>
      </section>
    </div>
  );
}

