'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">{t('somethingWentWrong')}</h1>
      <p className="text-center text-muted-foreground">{t('errorOccurred')}</p>
      <Button onClick={reset}>{tCommon('tryAgain')}</Button>
    </div>
  );
}
