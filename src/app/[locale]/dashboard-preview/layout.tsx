import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getUser } from '@/lib/auth-server';
import { PreviewLayoutClient } from '@/components/dashboard-preview/preview-layout-client';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: `Dashboard Preview · ${t('appName')}`,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return <PreviewLayoutClient>{children}</PreviewLayoutClient>;
}

