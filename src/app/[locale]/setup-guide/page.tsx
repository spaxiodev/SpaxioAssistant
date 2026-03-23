import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SetupGuideContent } from '@/components/marketing/setup-guide-content';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('setupGuideTitle'),
    description: t('setupGuideDescription'),
    openGraph: {
      title: t('setupGuideTitle'),
      description: t('setupGuideDescription'),
    },
    twitter: {
      title: t('setupGuideTitle'),
      description: t('setupGuideDescription'),
    },
  };
}

export default async function SetupGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SetupGuideContent />;
}
