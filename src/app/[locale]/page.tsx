import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HomeContent } from '@/components/home-content';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

const HOME_KEYWORDS = [
  'AI assistant platform',
  'AI for business',
  'AI website assistant',
  'AI quote assistant',
  'AI support assistant',
  'AI lead capture',
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    keywords: HOME_KEYWORDS,
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDescription'),
    },
    twitter: {
      title: t('homeTitle'),
      description: t('homeDescription'),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}
