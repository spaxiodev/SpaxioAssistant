import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export default async function TermsAndConditionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');

  const lastUpdated = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
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

