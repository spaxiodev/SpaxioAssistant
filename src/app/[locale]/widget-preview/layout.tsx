import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('widgetPreviewTitle'),
    description: t('widgetPreviewDescription'),
    keywords: ['AI chatbot widget preview', 'chat widget preview', 'embed chatbot'],
    openGraph: {
      title: t('widgetPreviewTitle'),
      description: t('widgetPreviewDescription'),
    },
    twitter: {
      title: t('widgetPreviewTitle'),
      description: t('widgetPreviewDescription'),
    },
  };
}

export default function WidgetPreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
