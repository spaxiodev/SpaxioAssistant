'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-foreground">{t('somethingWentWrong')}</h1>
      <p className="text-center text-muted-foreground">{t('dashboardErrorDescription')}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>{tCommon('tryAgain')}</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t('backToDashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
