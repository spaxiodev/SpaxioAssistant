import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPolicyPage({ params }: Props) {
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
        {t('pageTitlePrivacy')}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('lastUpdated', { date: lastUpdated })}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        {t('intro')}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>{t('privacyIntro')}</p>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacyDataWeCollectTitle')}
          </h2>
          <p className="mt-2">
            {t('privacyDataWeCollectBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacyHowWeUseTitle')}
          </h2>
          <p className="mt-2">
            {t('privacyHowWeUseBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacySharingTitle')}
          </h2>
          <p className="mt-2">
            {t('privacySharingBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacyRetentionTitle')}
          </h2>
          <p className="mt-2">
            {t('privacyRetentionBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacyYourRightsTitle')}
          </h2>
          <p className="mt-2">
            {t('privacyYourRightsBody')}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t('privacyContactTitle')}
          </h2>
          <p className="mt-2">
            {t('privacyContactBody')}
          </p>
        </div>
      </section>
    </div>
  );
}

