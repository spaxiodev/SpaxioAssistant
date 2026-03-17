import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('demoTitle'),
    description: t('demoDescription'),
    keywords: ['AI chatbot demo', 'AI chat demo', 'chatbot demo', 'AI widget demo'],
    openGraph: {
      title: t('demoTitle'),
      description: t('demoDescription'),
    },
    twitter: {
      title: t('demoTitle'),
      description: t('demoDescription'),
    },
  };
}

export default function DemoAiChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
